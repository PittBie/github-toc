import { App, Notice, TFile } from "obsidian";
import { TocPluginSettings } from "./settings";
import { parseIgnorePatterns, shouldIgnore } from "./ignoreFilter";

export class WikiUrlGenerator {
    constructor(private app: App, private settings: TocPluginSettings) {}

    /** Compute the GitHub Wiki URL for a given file basename. */
    static computeUrl(baseUrl: string, basename: string): string {
        const pageName = basename.replace(/ /g, "-");
        return `${baseUrl.replace(/\/$/, "")}/${pageName}`;
    }

    /**
     * Write/update the wiki_url frontmatter key in a single file.
     * Returns true only if the file was actually written (value changed).
     * Returns false if the feature is disabled, URL is not configured, or value was already correct.
     */
    async updateFile(file: TFile): Promise<boolean> {
        if (!this.settings.enableWikiUrls || !this.settings.wikiBaseUrl) return false;
        const url = WikiUrlGenerator.computeUrl(this.settings.wikiBaseUrl, file.basename);

        // Check metadata cache first — skip the write if the value is already correct
        const cached = this.app.metadataCache.getFileCache(file);
        if (cached?.frontmatter?.["wiki_url"] === url) return false;

        await this.app.fileManager.processFrontMatter(file, (fm) => {
            fm["wiki_url"] = url;
        });
        return true;
    }

    /**
     * Write/update wiki_url in every eligible markdown file in the vault.
     * Skips TOC files and files matching the ignore patterns.
     * Returns the number of files updated.
     */
    async updateAll(): Promise<number> {
        if (!this.settings.wikiBaseUrl) {
            new Notice("Wiki URL Generator: No base URL configured. Check plugin settings.");
            return 0;
        }

        const patterns = parseIgnorePatterns(this.settings.ignorePatterns);
        const tocPaths = new Set(
            this.settings.tocFiles
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
        );

        let count = 0;
        for (const file of this.app.vault.getMarkdownFiles()) {
            if (tocPaths.has(file.path)) continue;
            if (shouldIgnore(file.path, false, patterns)) continue;
            if (await this.updateFile(file)) count++;
        }
        return count;
    }
}
