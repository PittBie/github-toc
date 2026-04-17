import { TFile, TFolder } from "obsidian";
import { shouldIgnore, IgnorePattern } from "./ignoreFilter";

export interface FileNode {
    type: "file";
    file: TFile;
}

export interface FolderNode {
    type: "folder";
    folder: TFolder;
    /** A .md file named exactly after this folder (sibling or inner). */
    folderNote: TFile | null;
    children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

/**
 * Build a sorted tree for the given root folder, applying ignore patterns.
 * The root itself is not represented — only its children are returned.
 *
 * Ordering: subfolders first (alphabetical), then files (alphabetical).
 *
 * Folder note detection (priority order):
 *   1. A sibling .md file in the same folder with the same basename as the subfolder.
 *   2. A .md file inside the subfolder with the same basename (inner folder note).
 * Sibling folder notes are excluded from the regular file list.
 */
export function buildTree(root: TFolder, patterns: IgnorePattern[]): TreeNode[] {
    return processFolder(root, patterns);
}

function processFolder(folder: TFolder, patterns: IgnorePattern[]): TreeNode[] {
    const subFolders: TFolder[] = [];
    const files: TFile[] = [];

    for (const child of folder.children) {
        const isDir = child instanceof TFolder;
        if (shouldIgnore(child.path, isDir, patterns)) continue;

        if (child instanceof TFolder) {
            subFolders.push(child);
        } else if (child instanceof TFile) {
            files.push(child);
        }
    }

    subFolders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.basename.localeCompare(b.basename));

    // Set of subfolder names for quick sibling folder-note lookup
    const subFolderNames = new Set(subFolders.map((f) => f.name));

    const nodes: TreeNode[] = [];

    // Subfolders first
    for (const subFolder of subFolders) {
        // Priority 1: sibling folder note (file in the current folder, same name)
        const siblingNote =
            files.find((f) => f.extension === "md" && f.basename === subFolder.name) ?? null;

        // Priority 2: inner folder note (file inside the subfolder, same name)
        const innerNote = siblingNote ? null : findInnerFolderNote(subFolder, patterns);

        nodes.push({
            type: "folder",
            folder: subFolder,
            folderNote: siblingNote ?? innerNote,
            children: processFolder(subFolder, patterns),
        });
    }

    // Files — skip those acting as sibling folder notes
    for (const file of files) {
        if (file.extension === "md" && subFolderNames.has(file.basename)) {
            continue; // already represented as the folder note of its sibling folder
        }
        nodes.push({ type: "file", file });
    }

    return nodes;
}

function findInnerFolderNote(folder: TFolder, patterns: IgnorePattern[]): TFile | null {
    for (const child of folder.children) {
        if (
            child instanceof TFile &&
            child.extension === "md" &&
            child.basename === folder.name &&
            !shouldIgnore(child.path, false, patterns)
        ) {
            return child;
        }
    }
    return null;
}
