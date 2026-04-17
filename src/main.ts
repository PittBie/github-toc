import { Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { TocPluginSettings, DEFAULT_SETTINGS, TocSettingTab } from "./settings";
import { TocGenerator } from "./tocGenerator";
import { WikiUrlGenerator } from "./wikiUrlGenerator";

export default class GithubWikiTocPlugin extends Plugin {
    settings: TocPluginSettings;

    async onload(): Promise<void> {
        await this.loadSettings();

        // ── Full update: TOC + Wiki URLs ───────────────────────────────────────
        const runAll = async () => {
            const toc = new TocGenerator(this.app, this.settings);
            await toc.generateAll();

            if (this.settings.enableWikiUrls) {
                const wiki = new WikiUrlGenerator(this.app, this.settings);
                const count = await wiki.updateAll();
                new Notice(`Wiki URL Generator: updated ${count} note(s).`);
            }
        };

        this.addCommand({
            id: "generate-toc",
            name: "Generate Table of Contents",
            callback: runAll,
        });

        this.addRibbonIcon("list-ordered", "Generate Wiki TOC", runAll);

        // ── Auto-update on rename or new file ──────────────────────────────────
        const onFileChange = async (file: TAbstractFile) => {
            if (!this.settings.enableWikiUrls) return;
            if (!(file instanceof TFile) || file.extension !== "md") return;

            const wiki = new WikiUrlGenerator(this.app, this.settings);
            await wiki.updateFile(file);

            // Also regenerate the TOC so renamed links stay current
            const toc = new TocGenerator(this.app, this.settings);
            await toc.generateAll();
        };

        this.registerEvent(this.app.vault.on("rename", onFileChange));
        this.registerEvent(this.app.vault.on("create", onFileChange));

        // Settings tab
        this.addSettingTab(new TocSettingTab(this.app, this));
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
