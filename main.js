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
function deriveTitle(file) {
  var _a;
  const basename = typeof file.basename === "string" && file.basename.trim() !== "" ? file.basename : (_a = file.path.split("/").pop()) == null ? void 0 : _a.replace(/\.md$/i, "");
  return basename != null ? basename : file.path;
}
function deriveDate(file, cache) {
  var _a, _b, _c, _d;
  const frontmatterDate = normalizeDateValue((_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.date);
  if (frontmatterDate) {
    return frontmatterDate;
  }
  const filenameDate = (_c = (_b = file.path.split("/").pop()) == null ? void 0 : _b.match(/\d{4}-\d{2}-\d{2}/)) == null ? void 0 : _c[0];
  if (filenameDate) {
    return filenameDate;
  }
  return normalizeDateValue((_d = file.stat) == null ? void 0 : _d.ctime);
}
function normalizeDateValue(value) {
  var _a;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (typeof value !== "string") {
    return void 0;
  }
  return (_a = value.match(/\d{4}-\d{2}-\d{2}/)) == null ? void 0 : _a[0];
}
function createExcerpt(markdown) {
  const withoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, "");
  const withoutComments = withoutFrontmatter.replace(/%%[\s\S]*?%%/g, "");
  const withoutHeadings = withoutComments.replace(/^\s{0,3}#{1,6}\s.*$/gm, "");
  const withoutTagOnlyLines = withoutHeadings.split(/\r?\n/).filter((line) => !/^\s*(#[\p{L}\p{N}_/-]+\s*)+$/u.test(line)).join("\n");
  return withoutTagOnlyLines.replace(/\s+/g, " ").trim().slice(0, 200).trim();
}
function createContentHash(value) {
  let hash = 0;
  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0) | 0;
  }
  return Math.abs(hash).toString(36);
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
        this.showManualMemory();
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
  async showMemory() {
    const memory = await this.selectMemory();
    if (memory) {
      new MemoryModal(this.app, memory, this.settings.aiEnabled, (currentPath) => this.selectMemory(currentPath)).open();
      return true;
    }
    new import_obsidian.Notice("No journal notes found for the configured tags.");
    return false;
  }
  async selectMemory(excludedPath) {
    var _a;
    const journalNotes = this.discoverJournalNotes();
    const memories = [];
    for (const journalNote of journalNotes) {
      const memory = await this.createMemoryEntry(journalNote);
      if (memory) {
        memories.push(memory);
      }
    }
    if (memories.length === 0) {
      return null;
    }
    const selectableMemories = excludedPath && memories.some((memory) => memory.path !== excludedPath) ? memories.filter((memory) => memory.path !== excludedPath) : memories;
    return (_a = selectableMemories[0]) != null ? _a : null;
  }
  showManualMemory() {
    void this.showMemory();
  }
  queueStartupMemoryDisplay() {
    if (!this.settings.showOnStartup) {
      return;
    }
    if (!this.canShowStartupMemory(Date.now())) {
      return;
    }
    this.app.workspace.onLayoutReady(() => {
      void this.showMemory().then((shown) => {
        if (shown) {
          void this.recordStartupMemoryShown(Date.now());
        }
      });
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
  async createMemoryEntry(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const content = await this.app.vault.cachedRead(file);
    const excerpt = createExcerpt(content);
    if (excerpt === "") {
      return null;
    }
    return {
      path: file.path,
      sourceFile: file,
      title: deriveTitle(file),
      date: deriveDate(file, cache),
      excerpt,
      contentHash: createContentHash(excerpt)
    };
  }
};
var MemoryModal = class extends import_obsidian.Modal {
  constructor(app, memory, aiEnabled, selectNextMemory) {
    super(app);
    this.memory = memory;
    this.aiEnabled = aiEnabled;
    this.selectNextMemory = selectNextMemory;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.memory.title });
    if (this.memory.date) {
      contentEl.createEl("p", {
        cls: "gentle-memories-date",
        text: this.memory.date
      });
    }
    contentEl.createEl("p", {
      cls: "gentle-memories-excerpt",
      text: this.memory.excerpt
    });
    const buttonContainer = contentEl.createDiv({ cls: "gentle-memories-buttons" });
    const buttons = new import_obsidian.Setting(buttonContainer).addButton((button) => button.setButtonText("Open note").onClick(() => {
      void this.openSourceNote();
    })).addButton((button) => button.setButtonText("Next").onClick(() => {
      void this.showNextMemory();
    })).addButton((button) => button.setButtonText("Close").onClick(() => this.close()));
    if (this.aiEnabled) {
      buttons.addButton((button) => button.setButtonText("Generate reflection"));
    }
  }
  async openSourceNote() {
    await this.app.workspace.getLeaf(false).openFile(this.memory.sourceFile);
    this.close();
  }
  async showNextMemory() {
    const nextMemory = await this.selectNextMemory(this.memory.path);
    if (nextMemory) {
      this.memory = nextMemory;
      this.onOpen();
    }
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
