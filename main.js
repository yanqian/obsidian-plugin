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
  default: () => GentleMemoriesPlugin
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
var GentleMemoriesPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "show-memory",
      name: "Show memory",
      callback: () => {
        new import_obsidian.Notice("Gentle Memories is initialized. Memory display is not implemented yet.");
      }
    });
    this.addSettingTab(new GentleMemoriesSettingTab(this));
  }
  async loadSettings() {
    var _a;
    const saved = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(_a = saved == null ? void 0 : saved.settings) != null ? _a : {}
    };
  }
  async saveSettings() {
    await this.saveData({
      settings: this.settings
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
        this.plugin.settings.journalTags = value.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
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
      text.setPlaceholder("1").setValue(String(this.plugin.settings.minDaysBetweenStartupShows)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        this.plugin.settings.minDaysBetweenStartupShows = Number.isFinite(parsed) ? parsed : 1;
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
