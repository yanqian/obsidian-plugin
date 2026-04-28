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

const SHOW_MEMORY_COMMAND_ID = "show-memory";
const SHOW_MEMORY_COMMAND_NAME = "Show memory";

function normalizeJournalTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SETTINGS.journalTags];
  }

  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

  return tags.length > 0 ? tags : [...DEFAULT_SETTINGS.journalTags];
}

function normalizeSettings(value: unknown): PluginSettings {
  const saved = value && typeof value === "object" ? value as Partial<PluginSettings> : {};
  const minDays = Number(saved.minDaysBetweenStartupShows);

  return {
    journalTags: normalizeJournalTags(saved.journalTags),
    showOnStartup: typeof saved.showOnStartup === "boolean" ? saved.showOnStartup : DEFAULT_SETTINGS.showOnStartup,
    minDaysBetweenStartupShows: Number.isFinite(minDays) && minDays >= 0
      ? Math.floor(minDays)
      : DEFAULT_SETTINGS.minDaysBetweenStartupShows,
    aiEnabled: typeof saved.aiEnabled === "boolean" ? saved.aiEnabled : DEFAULT_SETTINGS.aiEnabled,
    apiKey: typeof saved.apiKey === "string" && saved.apiKey.trim() !== "" ? saved.apiKey.trim() : undefined,
    cacheAiResponses: typeof saved.cacheAiResponses === "boolean"
      ? saved.cacheAiResponses
      : DEFAULT_SETTINGS.cacheAiResponses
  };
}

export default class GentleMemoriesPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: SHOW_MEMORY_COMMAND_ID,
      name: SHOW_MEMORY_COMMAND_NAME,
      callback: () => {
        new Notice("Gentle Memories is initialized. Memory display is not implemented yet.");
      }
    });

    this.addSettingTab(new GentleMemoriesSettingTab(this));
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = normalizeSettings(saved?.settings);
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
            this.plugin.settings.journalTags = normalizeJournalTags(value.split(","));
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
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "1";
        text
          .setPlaceholder("1")
          .setValue(String(this.plugin.settings.minDaysBetweenStartupShows))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.minDaysBetweenStartupShows = Number.isFinite(parsed) && parsed >= 0
              ? parsed
              : DEFAULT_SETTINGS.minDaysBetweenStartupShows;
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
