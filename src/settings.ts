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
    ignorePatterns: "/images",
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

        new Setting(containerEl).setName("Table of contents").setHeading();

        // ── TOC Generation ─────────────────────────────────────────────────────
        new Setting(containerEl)
            .setName("Target files")
            .setDesc(
                "Vault-relative paths to the files where the TOC should be written, one per line. " +
                "If a target is inside a subfolder (e.g. docs/_Sidebar.md), only that subfolder " +
                "and its descendants are included."
            )
            .addTextArea((text) => {
                text.inputEl.rows = 4;
                text.inputEl.addClass("github-wiki-toc-textarea");
                text
                    .setPlaceholder("_Sidebar.md\ndocs/_Sidebar.md")
                    .setValue(this.plugin.settings.tocFiles)
                    .onChange(async (value) => {
                        this.plugin.settings.tocFiles = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Heading depth")
            .setDesc(
                'Include headings from each file in the TOC. Leave blank to skip headings. ' +
                'Use "#" for H1 only, "##" for H1 and H2, "###" for up to H3, etc.'
            )
            .addText((text) =>
                text
                    .setPlaceholder("##")
                    .setValue(this.plugin.settings.headingDepth)
                    .onChange(async (value) => {
                        this.plugin.settings.headingDepth = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Ignore folder notes")
            .setDesc(
                "When enabled, files whose name matches their parent folder are excluded from the TOC. " +
                "The folder still appears as a plain bold entry without a link."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.ignoreFolderNotes)
                    .onChange(async (value) => {
                        this.plugin.settings.ignoreFolderNotes = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Ignore patterns")
            .setDesc(
                "Gitignore-style patterns to exclude files and folders, one per line. " +
                "Lines starting with # are comments. " +
                "Examples: /images (root folder only), images/ (any depth), " +
                "*.draft.md (glob), !important.md (negate a pattern)."
            )
            .addTextArea((text) => {
                text.inputEl.rows = 6;
                text.inputEl.addClass("github-wiki-toc-textarea");
                text
                    .setPlaceholder("/images\n*.draft.md\nprivate/")
                    .setValue(this.plugin.settings.ignorePatterns)
                    .onChange(async (value) => {
                        this.plugin.settings.ignorePatterns = value;
                        await this.plugin.saveSettings();
                    });
            });

        // ── GitHub Wiki URLs ───────────────────────────────────────────────────
        new Setting(containerEl).setName("GitHub wiki URLs").setHeading();

        new Setting(containerEl)
            .setName("Enable wiki URL injection")
            .setDesc(
                "Write a wiki_url frontmatter property to each note with its GitHub Wiki page URL. " +
                "URLs are updated automatically when a file is renamed or created, and on every TOC run."
            )
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
