/* Gentle Memories plugin bundle */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GentleMemoriesPlugin,
  noteHasConfiguredJournalTag: () => noteHasConfiguredJournalTag
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  journalTags: ["journal", "diary", "note"],
  showOnStartup: true,
  minDaysBetweenStartupShows: 1,
  aiEnabled: false,
  apiKey: void 0,
  cacheAiResponses: true
};
var SHOW_MEMORY_COMMAND_ID = "show-memory";
var SHOW_MEMORY_COMMAND_NAME = "Show memory";
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
function toComparableTag(tag) {
  return tag.trim().replace(/^#/, "").toLowerCase();
}
function normalizeJournalTags(value) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SETTINGS.journalTags];
  }
  const tags = value.filter((tag) => typeof tag === "string").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
  return tags.length > 0 ? tags : [...DEFAULT_SETTINGS.journalTags];
}
function noteHasConfiguredJournalTag(cache, journalTags) {
  var _a, _b;
  if (!cache) {
    return false;
  }
  const configuredTags = new Set(normalizeJournalTags(journalTags).map(toComparableTag));
  const noteTags = (_b = (_a = (0, import_obsidian.getAllTags)(cache)) == null ? void 0 : _a.map(toComparableTag)) != null ? _b : [];
  return noteTags.some((tag) => configuredTags.has(tag));
}
function normalizeSettings(value) {
  const saved = value && typeof value === "object" ? value : {};
  const minDays = Number(saved.minDaysBetweenStartupShows);
  return {
    journalTags: normalizeJournalTags(saved.journalTags),
    showOnStartup: typeof saved.showOnStartup === "boolean" ? saved.showOnStartup : DEFAULT_SETTINGS.showOnStartup,
    minDaysBetweenStartupShows: Number.isFinite(minDays) && minDays >= 0 ? Math.floor(minDays) : DEFAULT_SETTINGS.minDaysBetweenStartupShows,
    aiEnabled: typeof saved.aiEnabled === "boolean" ? saved.aiEnabled : DEFAULT_SETTINGS.aiEnabled,
    apiKey: typeof saved.apiKey === "string" && saved.apiKey.trim() !== "" ? saved.apiKey.trim() : void 0,
    cacheAiResponses: typeof saved.cacheAiResponses === "boolean" ? saved.cacheAiResponses : DEFAULT_SETTINGS.cacheAiResponses
  };
}
var GentleMemoriesPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: SHOW_MEMORY_COMMAND_ID,
      name: SHOW_MEMORY_COMMAND_NAME,
      callback: () => {
        this.showMemory();
      }
    });
    this.addSettingTab(new GentleMemoriesSettingTab(this));
    this.queueStartupMemoryDisplay();
  }
  discoverJournalNotes() {
    return this.app.vault.getMarkdownFiles().filter((file) => noteHasConfiguredJournalTag(
      this.app.metadataCache.getFileCache(file),
      this.settings.journalTags
    ));
  }
  showMemory() {
    const journalNotes = this.discoverJournalNotes();
    new import_obsidian.Notice(`Gentle Memories found ${journalNotes.length} journal note${journalNotes.length === 1 ? "" : "s"}. Memory display is not implemented yet.`);
  }
  queueStartupMemoryDisplay() {
    if (!this.settings.showOnStartup) {
      return;
    }
    if (!this.canShowStartupMemory(Date.now())) {
      return;
    }
    this.app.workspace.onLayoutReady(() => {
      this.showMemory();
      void this.recordStartupMemoryShown(Date.now());
    });
  }
  canShowStartupMemory(now) {
    if (this.settings.minDaysBetweenStartupShows <= 0 || this.lastStartupMemoryShownAt === void 0) {
      return true;
    }
    const elapsedDays = (now - this.lastStartupMemoryShownAt) / MS_PER_DAY;
    return elapsedDays >= this.settings.minDaysBetweenStartupShows;
  }
  async recordStartupMemoryShown(shownAt) {
    this.lastStartupMemoryShownAt = shownAt;
    await this.savePluginData();
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = normalizeSettings(saved == null ? void 0 : saved.settings);
    const lastStartupMemoryShownAt = Number(saved == null ? void 0 : saved.lastStartupMemoryShownAt);
    this.lastStartupMemoryShownAt = Number.isFinite(lastStartupMemoryShownAt) && lastStartupMemoryShownAt >= 0 ? lastStartupMemoryShownAt : void 0;
  }
  async saveSettings() {
    await this.savePluginData();
  }
  async savePluginData() {
    await this.saveData({
      settings: this.settings,
      lastStartupMemoryShownAt: this.lastStartupMemoryShownAt
    });
  }
};
var GentleMemoriesSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Gentle Memories" });
    new import_obsidian.Setting(containerEl).setName("Journal tags").setDesc("Comma-separated tags used to identify journal notes.").addText((text) => {
      text.setPlaceholder("journal, diary, note").setValue(this.plugin.settings.journalTags.join(", ")).onChange(async (value) => {
        this.plugin.settings.journalTags = normalizeJournalTags(value.split(","));
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Show on startup").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showOnStartup).onChange(async (value) => {
        this.plugin.settings.showOnStartup = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Minimum days between startup shows").addText((text) => {
      text.inputEl.type = "number";
      text.inputEl.min = "0";
      text.inputEl.step = "1";
      text.setPlaceholder("1").setValue(String(this.plugin.settings.minDaysBetweenStartupShows)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        this.plugin.settings.minDaysBetweenStartupShows = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SETTINGS.minDaysBetweenStartupShows;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Enable AI").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.aiEnabled).onChange(async (value) => {
        this.plugin.settings.aiEnabled = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("API key").addText((text) => {
      var _a;
      text.inputEl.type = "password";
      text.setValue((_a = this.plugin.settings.apiKey) != null ? _a : "").onChange(async (value) => {
        this.plugin.settings.apiKey = value.trim() || void 0;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Cache AI responses").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.cacheAiResponses).onChange(async (value) => {
        this.plugin.settings.cacheAiResponses = value;
        await this.plugin.saveSettings();
      });
    });
  }
};
