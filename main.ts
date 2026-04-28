import { Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

interface PluginSettings {
  journalTags: string[];
  showOnStartup: boolean;
  minDaysBetweenStartupShows: number;
  aiEnabled: boolean;
  apiKey?: string;
  cacheAiResponses: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
  journalTags: ["journal", "diary", "note"],
  showOnStartup: true,
  minDaysBetweenStartupShows: 1,
  aiEnabled: false,
  apiKey: undefined,
  cacheAiResponses: true
};

export default class GentleMemoriesPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "show-memory",
      name: "Show memory",
      callback: () => {
        new Notice("Gentle Memories is initialized. Memory display is not implemented yet.");
      }
    });

    this.addSettingTab(new GentleMemoriesSettingTab(this));
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved?.settings ?? {})
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData({
      settings: this.settings
    });
  }
}

class GentleMemoriesSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: GentleMemoriesPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Gentle Memories" });

    new Setting(containerEl)
      .setName("Journal tags")
      .setDesc("Comma-separated tags used to identify journal notes.")
      .addText((text) => {
        text
          .setPlaceholder("journal, diary, note")
          .setValue(this.plugin.settings.journalTags.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.journalTags = value
              .split(",")
              .map((tag) => tag.trim().replace(/^#/, ""))
              .filter(Boolean);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Show on startup")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.showOnStartup = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Minimum days between startup shows")
      .addText((text) => {
        text
          .setPlaceholder("1")
          .setValue(String(this.plugin.settings.minDaysBetweenStartupShows))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.minDaysBetweenStartupShows = Number.isFinite(parsed) ? parsed : 1;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Enable AI")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.aiEnabled)
          .onChange(async (value) => {
            this.plugin.settings.aiEnabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("API key")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setValue(this.plugin.settings.apiKey ?? "")
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim() || undefined;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Cache AI responses")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.cacheAiResponses)
          .onChange(async (value) => {
            this.plugin.settings.cacheAiResponses = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
