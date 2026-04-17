import { App, PluginSettingTab, Setting } from "obsidian";
import type GithubWikiTocPlugin from "./main";

export interface TocPluginSettings {
    /** Newline-separated list of vault-relative TOC file paths. */
    tocFiles: string;
    /**
     * Maximum heading level to include.
     * "#" = H1 only, "##" = H1+H2, "###" = up to H3, "" = no headings.
     */
    headingDepth: string;
    /** Gitignore-style exclusion patterns, one per line. */
    ignorePatterns: string;
    /**
     * When true, files whose basename matches their parent folder name are
     * omitted from the TOC entirely and the folder is shown as plain bold text.
     */
    ignoreFolderNotes: boolean;
    /** When true, a wiki_url frontmatter property is written to each note. */
    enableWikiUrls: boolean;
    /** Base URL of the GitHub Wiki, e.g. "https://github.com/owner/repo/wiki". */
    wikiBaseUrl: string;
}

export const DEFAULT_SETTINGS: TocPluginSettings = {
    tocFiles: "_Sidebar.md",
    headingDepth: "",
    ignorePatterns: "/images\n.obsidian",
    ignoreFolderNotes: false,
    enableWikiUrls: false,
    wikiBaseUrl: "",
};

export class TocSettingTab extends PluginSettingTab {
    plugin: GithubWikiTocPlugin;

    constructor(app: App, plugin: GithubWikiTocPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "GitHub Wiki TOC Generator" });

        // ── How to use ─────────────────────────────────────────────────────────
        const howTo = containerEl.createEl("div");
        howTo.style.cssText =
            "border-left: 3px solid var(--interactive-accent); " +
            "padding: 0.6em 1em; margin-bottom: 1.5em; " +
            "background: var(--background-secondary);";

        howTo.createEl("p", {
            text: "How to generate the TOC:",
        }).style.cssText = "font-weight:bold; margin:0 0 0.4em 0;";

        const steps = howTo.createEl("ol");
        steps.style.cssText = "margin:0; padding-left:1.4em;";
        for (const step of [
            'Open the command palette (Ctrl/Cmd + P) and run "Generate Table of Contents" — ' +
                "or click the list icon in the left ribbon.",
            "The plugin writes the TOC into each file listed below, overwriting the entire file on every run.",
            "Configure the target file paths, heading depth, and ignore patterns in the sections below.",
        ]) {
            steps.createEl("li", { text: step }).style.cssText = "margin-bottom:0.3em;";
        }

        // ── TOC Target Files ───────────────────────────────────────────────────
        containerEl.createEl("h3", { text: "TOC target files" });
        containerEl.createEl("p", {
            text:
                "Vault-relative paths to the files where the TOC should be written. " +
                "One path per line. If the file lives in a subfolder, only that subfolder " +
                "and its descendants are included in the TOC.",
        });

        const tocArea = containerEl.createEl("textarea");
        tocArea.value = this.plugin.settings.tocFiles;
        tocArea.rows = 4;
        tocArea.placeholder = "_Sidebar.md\ndocs/_Sidebar.md";
        tocArea.style.cssText =
            "width:100%; font-family:var(--font-monospace); resize:vertical; margin-bottom:1em;";
        tocArea.addEventListener("blur", async () => {
            this.plugin.settings.tocFiles = tocArea.value;
            await this.plugin.saveSettings();
        });

        // ── Heading Depth ──────────────────────────────────────────────────────
        new Setting(containerEl)
            .setName("Heading depth")
            .setDesc(
                'Include headings from each file in the TOC. Leave blank to skip headings. ' +
                'Type "#" to include H1, "##" for H1 and H2, "###" for up to H3, etc.'
            )
            .addText((text) =>
                text
                    .setPlaceholder('e.g.  ##  — or leave blank')
                    .setValue(this.plugin.settings.headingDepth)
                    .onChange(async (value) => {
                        this.plugin.settings.headingDepth = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        // ── Ignore Folder Notes ────────────────────────────────────────────────
        new Setting(containerEl)
            .setName("Ignore folder notes")
            .setDesc(
                "When enabled, files whose name matches their parent folder (folder notes) are " +
                "excluded from the TOC entirely. The folder still appears as a plain bold entry, " +
                "but without a wikilink."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.ignoreFolderNotes)
                    .onChange(async (value) => {
                        this.plugin.settings.ignoreFolderNotes = value;
                        await this.plugin.saveSettings();
                    })
            );

        // ── Ignore Patterns ────────────────────────────────────────────────────
        containerEl.createEl("h3", { text: "Ignore patterns" });
        containerEl.createEl("p", {
            text:
                "Gitignore-style patterns for files and folders to exclude from the TOC. " +
                "One pattern per line. Lines starting with # are comments.",
        });

        const exampleList = containerEl.createEl("ul");
        for (const example of [
            "/images  — exclude the top-level images folder",
            "images/  — exclude any folder named images at any depth",
            "*.draft.md  — exclude files matching this glob",
            "!important.md  — un-ignore a specific file (negation)",
        ]) {
            exampleList.createEl("li", { text: example });
        }
        exampleList.style.cssText =
            "font-family:var(--font-monospace); font-size:0.85em; margin-bottom:0.5em;";

        const ignoreArea = containerEl.createEl("textarea");
        ignoreArea.value = this.plugin.settings.ignorePatterns;
        ignoreArea.rows = 8;
        ignoreArea.placeholder = "/images\n*.draft.md\nprivate/";
        ignoreArea.style.cssText =
            "width:100%; font-family:var(--font-monospace); resize:vertical;";
        ignoreArea.addEventListener("blur", async () => {
            this.plugin.settings.ignorePatterns = ignoreArea.value;
            await this.plugin.saveSettings();
        });

        // ── GitHub Wiki URLs ───────────────────────────────────────────────────
        containerEl.createEl("h3", { text: "GitHub Wiki URLs" });
        containerEl.createEl("p", {
            text:
                "When enabled, a wiki_url property is written to the frontmatter of every note " +
                "(except TOC files and ignored files). The URL is derived from the base URL below " +
                "plus the note's filename. URLs are updated automatically whenever a file is " +
                "renamed or created, and also when the TOC is generated.",
        });

        new Setting(containerEl)
            .setName("Enable Wiki URL injection")
            .setDesc("Write a wiki_url frontmatter property to each note.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableWikiUrls)
                    .onChange(async (value) => {
                        this.plugin.settings.enableWikiUrls = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Wiki base URL")
            .setDesc('Base URL of your GitHub Wiki, e.g. "https://github.com/owner/repo/wiki".')
            .addText((text) =>
                text
                    .setPlaceholder("https://github.com/owner/repo/wiki")
                    .setValue(this.plugin.settings.wikiBaseUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.wikiBaseUrl = value.trim();
                        await this.plugin.saveSettings();
                    })
            );
    }
}
