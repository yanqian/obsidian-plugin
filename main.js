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
  aiProvider: "openai",
  openAiApiKey: void 0,
  claudeApiKey: void 0,
  cacheAiResponses: true,
  debugMode: false
};
var DEFAULT_DISPLAY_HISTORY = {
  shown: {},
  aiCache: {}
};
var SHOW_MEMORY_COMMAND_ID = "show-memory";
var SHOW_MEMORY_COMMAND_NAME = "Show memory";
var OPENAI_REFLECTION_ENDPOINT = "https://api.openai.com/v1/chat/completions";
var OPENAI_REFLECTION_MODEL = "gpt-4o-mini";
var CLAUDE_REFLECTION_ENDPOINT = "https://api.anthropic.com/v1/messages";
var CLAUDE_REFLECTION_MODEL = "claude-3-5-haiku-latest";
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
var RICH_MEMORY_PREVIEW_CHARACTERS = 1200;
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
  var _a;
  const saved = value && typeof value === "object" ? value : {};
  const minDays = Number(saved.minDaysBetweenStartupShows);
  const legacyApiKey = typeof saved.apiKey === "string" ? (_a = saved.apiKey) == null ? void 0 : _a.trim() : void 0;
  const openAiApiKey = typeof saved.openAiApiKey === "string" && saved.openAiApiKey.trim() !== "" ? saved.openAiApiKey.trim() : legacyApiKey || void 0;
  const claudeApiKey = typeof saved.claudeApiKey === "string" && saved.claudeApiKey.trim() !== "" ? saved.claudeApiKey.trim() : void 0;
  return {
    journalTags: normalizeJournalTags(saved.journalTags),
    showOnStartup: typeof saved.showOnStartup === "boolean" ? saved.showOnStartup : DEFAULT_SETTINGS.showOnStartup,
    minDaysBetweenStartupShows: Number.isFinite(minDays) && minDays >= 0 ? Math.floor(minDays) : DEFAULT_SETTINGS.minDaysBetweenStartupShows,
    aiEnabled: typeof saved.aiEnabled === "boolean" ? saved.aiEnabled : DEFAULT_SETTINGS.aiEnabled,
    aiProvider: saved.aiProvider === "claude" ? "claude" : DEFAULT_SETTINGS.aiProvider,
    openAiApiKey,
    claudeApiKey,
    cacheAiResponses: typeof saved.cacheAiResponses === "boolean" ? saved.cacheAiResponses : DEFAULT_SETTINGS.cacheAiResponses,
    debugMode: typeof saved.debugMode === "boolean" ? saved.debugMode : DEFAULT_SETTINGS.debugMode
  };
}
function normalizeDisplayHistory(value) {
  const saved = value && typeof value === "object" ? value : {};
  const shown = {};
  const aiCache = {};
  if (saved.shown && typeof saved.shown === "object") {
    for (const [path, entry] of Object.entries(saved.shown)) {
      if (entry && typeof entry === "object" && typeof entry.shownAt === "string" && typeof entry.contentHash === "string") {
        shown[path] = {
          shownAt: entry.shownAt,
          contentHash: entry.contentHash
        };
      }
    }
  }
  if (saved.aiCache && typeof saved.aiCache === "object") {
    for (const [key, entry] of Object.entries(saved.aiCache)) {
      if (entry && typeof entry === "object" && typeof entry.text === "string" && typeof entry.generatedAt === "string") {
        aiCache[key] = {
          text: entry.text,
          generatedAt: entry.generatedAt
        };
      }
    }
  }
  return { shown, aiCache };
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
  const withoutFrontmatter = stripFrontmatter(markdown);
  const withoutComments = withoutFrontmatter.replace(/%%[\s\S]*?%%/g, "");
  const withoutHeadings = withoutComments.replace(/^\s{0,3}#{1,6}\s.*$/gm, "");
  const withoutTagOnlyLines = withoutHeadings.split(/\r?\n/).filter((line) => !/^\s*(#[\p{L}\p{N}_/-]+\s*)+$/u.test(line)).join("\n");
  return withoutTagOnlyLines.replace(/\s+/g, " ").trim().slice(0, 200).trim();
}
function stripFrontmatter(markdown) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, "");
}
function createMarkdownBody(markdown) {
  return stripFrontmatter(markdown).trim();
}
function createMarkdownPreview(markdown) {
  if (markdown.length <= RICH_MEMORY_PREVIEW_CHARACTERS) {
    return markdown;
  }
  const clipped = markdown.slice(0, RICH_MEMORY_PREVIEW_CHARACTERS);
  const paragraphBreak = clipped.lastIndexOf("\n\n");
  const preview = paragraphBreak >= 400 ? clipped.slice(0, paragraphBreak) : clipped;
  return `${preview.trim()}

...`;
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
    this.displayHistory = DEFAULT_DISPLAY_HISTORY;
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
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const journalNotes = markdownFiles.filter((file) => noteHasConfiguredJournalTag(
      this.app.metadataCache.getFileCache(file),
      this.settings.journalTags
    ));
    this.debugLog("journal-note-discovery", {
      markdownNoteCount: markdownFiles.length,
      candidateNoteCount: journalNotes.length,
      rejectedByTagCount: markdownFiles.length - journalNotes.length
    });
    return journalNotes;
  }
  async showMemory(options = {}) {
    var _a;
    const showNotice = (_a = options.showNotice) != null ? _a : true;
    const memory = await this.selectMemory();
    if (memory) {
      new MemoryModal(
        this.app,
        this,
        memory,
        this.settings.aiEnabled,
        (currentPath) => this.selectMemory(currentPath),
        (shownMemory) => this.recordMemoryShown(shownMemory, Date.now()),
        (reflectionMemory) => this.generateReflection(reflectionMemory)
      ).open();
      await this.recordMemoryShown(memory, Date.now());
      return true;
    }
    if (showNotice) {
      new import_obsidian.Notice("No journal notes found for the configured tags.");
    }
    return false;
  }
  async selectMemory(excludedPath) {
    var _a;
    const journalNotes = this.discoverJournalNotes();
    const memories = [];
    let unusableNoteCount = 0;
    for (const journalNote of journalNotes) {
      const memory = await this.createMemoryEntry(journalNote);
      if (memory) {
        memories.push(memory);
      } else {
        unusableNoteCount += 1;
      }
    }
    this.debugLog("memory-filter-outcomes", {
      candidateNoteCount: journalNotes.length,
      usableMemoryCount: memories.length,
      unusableNoteCount,
      excludedCurrentPath: Boolean(excludedPath)
    });
    if (memories.length === 0) {
      this.debugLog("memory-selection", { selected: false });
      return null;
    }
    const eligibleMemories = excludedPath && memories.some((memory) => memory.path !== excludedPath) ? memories.filter((memory) => memory.path !== excludedPath) : memories;
    const neverShownMemories = eligibleMemories.filter((memory) => !this.displayHistory.shown[memory.path]);
    const selectableMemories = neverShownMemories.length > 0 ? neverShownMemories : eligibleMemories;
    const selectedMemory = (_a = selectableMemories[0]) != null ? _a : null;
    this.debugLog("memory-selection", {
      selected: Boolean(selectedMemory),
      selectedPath: selectedMemory == null ? void 0 : selectedMemory.path,
      eligibleMemoryCount: eligibleMemories.length,
      neverShownMemoryCount: neverShownMemories.length
    });
    return selectedMemory;
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
      void this.showMemory({ showNotice: false }).then((shown) => {
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
  async recordMemoryShown(memory, shownAt) {
    this.displayHistory = {
      ...this.displayHistory,
      shown: {
        ...this.displayHistory.shown,
        [memory.path]: {
          shownAt: new Date(shownAt).toISOString(),
          contentHash: memory.contentHash
        }
      }
    };
    await this.savePluginData();
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = normalizeSettings(saved == null ? void 0 : saved.settings);
    this.displayHistory = normalizeDisplayHistory(saved == null ? void 0 : saved.displayHistory);
    const lastStartupMemoryShownAt = Number(saved == null ? void 0 : saved.lastStartupMemoryShownAt);
    this.lastStartupMemoryShownAt = Number.isFinite(lastStartupMemoryShownAt) && lastStartupMemoryShownAt >= 0 ? lastStartupMemoryShownAt : void 0;
  }
  async saveSettings() {
    await this.savePluginData();
  }
  async savePluginData() {
    await this.saveData({
      settings: this.settings,
      lastStartupMemoryShownAt: this.lastStartupMemoryShownAt,
      displayHistory: this.displayHistory
    });
  }
  async createMemoryEntry(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const content = await this.app.vault.cachedRead(file);
    const excerpt = createExcerpt(content);
    const markdownBody = createMarkdownBody(content);
    if (excerpt === "") {
      return null;
    }
    return {
      path: file.path,
      sourceFile: file,
      title: deriveTitle(file),
      date: deriveDate(file, cache),
      excerpt,
      markdownBody,
      contentHash: createContentHash(excerpt)
    };
  }
  getAiCacheKey(memory) {
    return `${memory.path}:${memory.contentHash}`;
  }
  async generateReflection(memory) {
    const apiKey = this.getSelectedApiKey();
    if (!apiKey) {
      new import_obsidian.Notice(`Add a ${this.getSelectedProviderName()} API key in Gentle Memories settings to generate reflections.`);
      return null;
    }
    const cacheKey = this.getAiCacheKey(memory);
    const cachedReflection = this.settings.cacheAiResponses ? this.displayHistory.aiCache[cacheKey] : void 0;
    if (cachedReflection) {
      this.debugLog("ai-cache", {
        outcome: "hit",
        provider: this.settings.aiProvider,
        path: memory.path,
        cacheEnabled: this.settings.cacheAiResponses
      });
      return cachedReflection.text;
    }
    this.debugLog("ai-cache", {
      outcome: "miss",
      provider: this.settings.aiProvider,
      path: memory.path,
      cacheEnabled: this.settings.cacheAiResponses
    });
    try {
      const response = await this.requestReflection(memory.excerpt, apiKey);
      if (!response.ok) {
        throw new Error(`AI request failed with ${response.status}`);
      }
      const reflection = await this.readReflection(response);
      if (!reflection) {
        throw new Error("AI response did not include reflection text");
      }
      if (this.settings.cacheAiResponses) {
        this.displayHistory = {
          ...this.displayHistory,
          aiCache: {
            ...this.displayHistory.aiCache,
            [cacheKey]: {
              text: reflection,
              generatedAt: new Date(Date.now()).toISOString()
            }
          }
        };
        await this.savePluginData();
      }
      return reflection;
    } catch (error) {
      console.error(error);
      new import_obsidian.Notice("Could not generate reflection. Try again later.");
      return null;
    }
  }
  getSelectedApiKey() {
    return this.settings.aiProvider === "claude" ? this.settings.claudeApiKey : this.settings.openAiApiKey;
  }
  getSelectedProviderName() {
    return this.settings.aiProvider === "claude" ? "Claude" : "OpenAI";
  }
  async requestReflection(excerpt, apiKey) {
    const systemPrompt = [
      "Write a short reflection or encouragement in 1 to 3 sentences.",
      "Be specific to the excerpt.",
      "Do not claim knowledge beyond the excerpt.",
      "Do not provide medical or therapeutic advice.",
      "Do not include diagnosis, crisis instructions, or urgent medical guidance."
    ].join(" ");
    if (this.settings.aiProvider === "claude") {
      return fetch(CLAUDE_REFLECTION_ENDPOINT, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: CLAUDE_REFLECTION_MODEL,
          max_tokens: 180,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: excerpt
            }
          ]
        })
      });
    }
    return fetch(OPENAI_REFLECTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_REFLECTION_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: excerpt
          }
        ]
      })
    });
  }
  async readReflection(response) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (this.settings.aiProvider === "claude") {
      const data2 = await response.json();
      return (_c = (_b = (_a = data2.content) == null ? void 0 : _a.find((content) => content.type === "text" && typeof content.text === "string")) == null ? void 0 : _b.text) == null ? void 0 : _c.trim();
    }
    const data = await response.json();
    return (_g = (_f = (_e = (_d = data.choices) == null ? void 0 : _d[0]) == null ? void 0 : _e.message) == null ? void 0 : _f.content) == null ? void 0 : _g.trim();
  }
  debugLog(event, details) {
    if (!this.settings.debugMode) {
      return;
    }
    console.debug("[Gentle Memories debug]", event, details);
  }
};
var MemoryModal = class extends import_obsidian.Modal {
  constructor(app, parentComponent, memory, aiEnabled, selectNextMemory, recordMemoryShown, generateReflection) {
    super(app);
    this.parentComponent = parentComponent;
    this.memory = memory;
    this.aiEnabled = aiEnabled;
    this.selectNextMemory = selectNextMemory;
    this.recordMemoryShown = recordMemoryShown;
    this.generateReflection = generateReflection;
    this.expanded = false;
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
    if (this.reflectionText) {
      contentEl.createEl("p", {
        cls: "gentle-memories-reflection",
        text: this.reflectionText
      });
    }
    const noteContentEl = contentEl.createDiv({ cls: "gentle-memories-note-content" });
    const renderedMarkdown = this.expanded ? this.memory.markdownBody : createMarkdownPreview(this.memory.markdownBody);
    void import_obsidian.MarkdownRenderer.render(this.app, renderedMarkdown, noteContentEl, this.memory.path, this.parentComponent).catch(() => {
      noteContentEl.createEl("p", {
        cls: "gentle-memories-excerpt",
        text: this.memory.excerpt
      });
    });
    const buttonContainer = contentEl.createDiv({ cls: "gentle-memories-buttons" });
    const buttons = new import_obsidian.Setting(buttonContainer);
    if (this.memory.markdownBody.length > RICH_MEMORY_PREVIEW_CHARACTERS) {
      buttons.addButton((button) => button.setButtonText(this.expanded ? "Show less" : "Show more").onClick(() => {
        this.expanded = !this.expanded;
        this.onOpen();
      }));
    }
    buttons.addButton((button) => button.setButtonText("Open note").onClick(() => {
      void this.openSourceNote();
    })).addButton((button) => button.setButtonText("Next").onClick(() => {
      void this.showNextMemory();
    })).addButton((button) => button.setButtonText("Close").onClick(() => this.close()));
    if (this.aiEnabled) {
      buttons.addButton((button) => button.setButtonText("Generate reflection").onClick(() => {
        void this.showReflection();
      }));
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
      this.reflectionText = void 0;
      this.expanded = false;
      this.onOpen();
      await this.recordMemoryShown(nextMemory);
    }
  }
  async showReflection() {
    const reflection = await this.generateReflection(this.memory);
    if (reflection) {
      this.reflectionText = reflection;
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
    new import_obsidian.Setting(containerEl).setName("AI provider").addDropdown((dropdown) => {
      dropdown.addOption("openai", "OpenAI").addOption("claude", "Claude").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
        this.plugin.settings.aiProvider = value === "claude" ? "claude" : "openai";
        await this.plugin.saveSettings();
        this.display();
      });
    });
    if (this.plugin.settings.aiProvider === "claude") {
      new import_obsidian.Setting(containerEl).setName("Claude API key").addText((text) => {
        var _a;
        text.inputEl.type = "password";
        text.setValue((_a = this.plugin.settings.claudeApiKey) != null ? _a : "").onChange(async (value) => {
          this.plugin.settings.claudeApiKey = value.trim() || void 0;
          await this.plugin.saveSettings();
        });
      });
    } else {
      new import_obsidian.Setting(containerEl).setName("OpenAI API key").addText((text) => {
        var _a;
        text.inputEl.type = "password";
        text.setValue((_a = this.plugin.settings.openAiApiKey) != null ? _a : "").onChange(async (value) => {
          this.plugin.settings.openAiApiKey = value.trim() || void 0;
          await this.plugin.saveSettings();
        });
      });
    }
    new import_obsidian.Setting(containerEl).setName("Cache AI responses").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.cacheAiResponses).onChange(async (value) => {
        this.plugin.settings.cacheAiResponses = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Debug mode").setDesc("Show manual troubleshooting controls and privacy-safe developer console diagnostics.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => {
        this.plugin.settings.debugMode = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    if (this.plugin.settings.debugMode) {
      new import_obsidian.Setting(containerEl).setName("Show memory now").setDesc("Show a memory immediately for manual verification.").addButton((button) => button.setButtonText("Show memory").onClick(() => {
        this.plugin.showManualMemory();
      }));
    }
  }
};
