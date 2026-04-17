import { App, Notice, TFile, TFolder } from "obsidian";
import { TocPluginSettings } from "./settings";
import { parseIgnorePatterns, IgnorePattern } from "./ignoreFilter";
import { buildTree, TreeNode, FolderNode } from "./fileTree";

export class TocGenerator {
    constructor(private app: App, private settings: TocPluginSettings) {}

    async generateAll(): Promise<void> {
        const tocFilePaths = this.settings.tocFiles
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        if (tocFilePaths.length === 0) {
            new Notice("TOC Generator: No target files configured. Check plugin settings.");
            return;
        }

        const basePatterns = parseIgnorePatterns(this.settings.ignorePatterns);
        const maxHeadingLevel = parseHeadingDepth(this.settings.headingDepth);
        const ignoreFolderNotes = this.settings.ignoreFolderNotes;

        let successCount = 0;
        for (const tocFilePath of tocFilePaths) {
            const ok = await this.generateForFile(tocFilePath, basePatterns, maxHeadingLevel, ignoreFolderNotes);
            if (ok) successCount++;
        }

        new Notice(`TOC Generator: updated ${successCount} of ${tocFilePaths.length} file(s).`);
    }

    private async generateForFile(
        tocFilePath: string,
        basePatterns: IgnorePattern[],
        maxHeadingLevel: number,
        ignoreFolderNotes: boolean
    ): Promise<boolean> {
        // Determine traversal root: the folder containing the TOC file
        const slashIdx = tocFilePath.lastIndexOf("/");
        const rootFolderPath = slashIdx > -1 ? tocFilePath.slice(0, slashIdx) : "";

        let rootFolder: TFolder;
        if (rootFolderPath === "") {
            rootFolder = this.app.vault.getRoot();
        } else {
            const node = this.app.vault.getAbstractFileByPath(rootFolderPath);
            if (!(node instanceof TFolder)) {
                new Notice(`TOC Generator: Folder not found — "${rootFolderPath}"`);
                return false;
            }
            rootFolder = node;
        }

        // Always exclude the TOC file itself from the traversal
        const selfPattern: IgnorePattern = {
            raw: tocFilePath,
            isNegated: false,
            isAbsolute: true,
            isDirectoryOnly: false,
            segments: tocFilePath.split("/").filter((s) => s.length > 0),
            hasWildcard: false,
        };
        const patterns = [...basePatterns, selfPattern];

        const tree = buildTree(rootFolder, patterns);

        const lines: string[] = [];
        for (const node of tree) {
            this.renderNode(node, lines, maxHeadingLevel, ignoreFolderNotes, 0);
        }

        const content = lines.join("\n") + "\n";

        // Overwrite the TOC file entirely on every run
        const existing = this.app.vault.getAbstractFileByPath(tocFilePath);
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, content);
        } else {
            await this.app.vault.create(tocFilePath, content);
        }

        return true;
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    private renderNode(
        node: TreeNode,
        lines: string[],
        maxHeadingLevel: number,
        ignoreFolderNotes: boolean,
        depth: number
    ): void {
        if (node.type === "folder") {
            this.renderFolder(node, lines, maxHeadingLevel, ignoreFolderNotes, depth);
        } else {
            const indent = "  ".repeat(depth);
            lines.push(`${indent}- [[${node.file.basename}]]`);
            if (maxHeadingLevel > 0) {
                this.appendHeadings(node.file, lines, maxHeadingLevel, depth + 1);
            }
        }
    }

    private renderFolder(
        node: FolderNode,
        lines: string[],
        maxHeadingLevel: number,
        ignoreFolderNotes: boolean,
        depth: number
    ): void {
        const indent = "  ".repeat(depth);

        // Folder note present and not ignored → bold wikilink bullet
        // Folder note present but ignored, or no note → bold plain-name bullet
        if (node.folderNote && !ignoreFolderNotes) {
            lines.push(`${indent}- **[[${node.folder.name}]]**`);
        } else {
            lines.push(`${indent}- **${node.folder.name}**`);
        }

        for (const child of node.children) {
            this.renderNode(child, lines, maxHeadingLevel, ignoreFolderNotes, depth + 1);
        }
    }

    /**
     * Append headings from a file as indented bullet points.
     * Uses Obsidian's metadata cache — no extra file read required.
     */
    private appendHeadings(
        file: TFile,
        lines: string[],
        maxLevel: number,
        baseDepth: number
    ): void {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.headings) return;

        for (const h of cache.headings) {
            if (h.level > maxLevel) continue;
            // H1 sits at baseDepth, H2 at baseDepth+1, etc.
            const indent = "  ".repeat(baseDepth + h.level - 1);
            lines.push(`${indent}- ${h.heading}`);
        }
    }
}

/** Parse "##" → 2, "#" → 1, "" → 0. */
function parseHeadingDepth(depth: string): number {
    const match = depth.trim().match(/^(#+)/);
    return match ? match[1].length : 0;
}
