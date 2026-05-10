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
  canShowStartupMemoryAt: () => canShowStartupMemoryAt,
  createContentHash: () => createContentHash,
  createExcerpt: () => createExcerpt,
  createMarkdownBody: () => createMarkdownBody,
  createMarkdownPreview: () => createMarkdownPreview,
  default: () => GentleMemoriesPlugin,
  deriveDate: () => deriveDate,
  deriveTitle: () => deriveTitle,
  normalizeDateValue: () => normalizeDateValue,
  normalizeDisplayHistory: () => normalizeDisplayHistory,
  normalizeJournalTags: () => normalizeJournalTags,
  normalizeSettings: () => normalizeSettings,
  noteHasConfiguredJournalTag: () => noteHasConfiguredJournalTag,
  stripFrontmatter: () => stripFrontmatter,
  toComparableTag: () => toComparableTag
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
var SHOW_MEMORY_RIBBON_ICON = "sparkles";
var SHOW_MEMORY_RIBBON_TOOLTIP = "Show memory";
var TODAY_MEMORY_VIEW_TYPE = "gentle-memories-today-memory";
var TODAY_MEMORY_VIEW_TITLE = "Today's memory";
var OPENAI_REFLECTION_ENDPOINT = "https://api.openai.com/v1/chat/completions";
var OPENAI_REFLECTION_MODEL = "gpt-4o-mini";
var CLAUDE_REFLECTION_ENDPOINT = "https://api.anthropic.com/v1/messages";
var CLAUDE_REFLECTION_MODEL = "claude-3-5-haiku-latest";
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
var RICH_MEMORY_PREVIEW_CHARACTERS = 240;
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
  const preview = paragraphBreak >= 80 ? clipped.slice(0, paragraphBreak) : clipped;
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
function canShowStartupMemoryAt(now, minDaysBetweenStartupShows, lastStartupMemoryShownAt) {
  if (minDaysBetweenStartupShows <= 0 || lastStartupMemoryShownAt === void 0) {
    return true;
  }
  const elapsedDays = (now - lastStartupMemoryShownAt) / MS_PER_DAY;
  return elapsedDays >= minDaysBetweenStartupShows;
}
var GentleMemoriesPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.displayHistory = DEFAULT_DISPLAY_HISTORY;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(
      TODAY_MEMORY_VIEW_TYPE,
      (leaf) => new TodayMemoryView(leaf, this)
    );
    this.addCommand({
      id: SHOW_MEMORY_COMMAND_ID,
      name: SHOW_MEMORY_COMMAND_NAME,
      callback: () => {
        this.showManualMemory();
      }
    });
    this.addRibbonIcon(SHOW_MEMORY_RIBBON_ICON, SHOW_MEMORY_RIBBON_TOOLTIP, () => {
      void this.openTodayMemoryView();
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
        Boolean(this.getSelectedApiKey()),
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
  async openTodayMemoryView(options = {}) {
    const leaf = await this.getTodayMemoryLeaf();
    const view = leaf.view;
    if (view instanceof TodayMemoryView) {
      return view.loadMemory(options);
    }
    return false;
  }
  async selectMemoryForView(excludedPath) {
    return this.selectMemory(excludedPath);
  }
  async recordMemoryShownFromView(memory) {
    await this.recordMemoryShown(memory, Date.now());
  }
  async generateReflectionForView(memory) {
    return this.generateReflection(memory);
  }
  canAutoLoadAiReflection() {
    return this.settings.aiEnabled && Boolean(this.getSelectedApiKey());
  }
  async getTodayMemoryLeaf() {
    const existingLeaves = this.app.workspace.getLeavesOfType(TODAY_MEMORY_VIEW_TYPE);
    const existingLeaf = existingLeaves.find((leaf2) => this.isMainWorkspaceLeaf(leaf2));
    if (existingLeaf) {
      await this.app.workspace.revealLeaf(existingLeaf);
      return existingLeaf;
    }
    if (existingLeaves.length > 0) {
      this.app.workspace.detachLeavesOfType(TODAY_MEMORY_VIEW_TYPE);
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: TODAY_MEMORY_VIEW_TYPE,
      active: true
    });
    await this.app.workspace.revealLeaf(leaf);
    return leaf;
  }
  isMainWorkspaceLeaf(leaf) {
    return leaf.getRoot() === this.app.workspace.rootSplit;
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
    return canShowStartupMemoryAt(
      now,
      this.settings.minDaysBetweenStartupShows,
      this.lastStartupMemoryShownAt
    );
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
      new import_obsidian.Notice(`Add ${this.getSelectedProviderArticle()} ${this.getSelectedProviderKeyLabel()} in settings to generate a reading prompt.`);
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
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`AI request failed with ${response.status}`);
      }
      const reflection = this.readReflection(response);
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
      new import_obsidian.Notice("Could not generate a reading prompt. Try again later.");
      return null;
    }
  }
  getSelectedApiKey() {
    return this.settings.aiProvider === "claude" ? this.settings.claudeApiKey : this.settings.openAiApiKey;
  }
  getSelectedProviderName() {
    return this.settings.aiProvider === "claude" ? "Claude" : "Openai";
  }
  getSelectedProviderKeyLabel() {
    return this.settings.aiProvider === "claude" ? "Claude API key" : "Openai key";
  }
  getSelectedProviderArticle() {
    return this.settings.aiProvider === "claude" ? "a" : "an";
  }
  requestReflection(excerpt, apiKey) {
    const systemPrompt = [
      "Write 1 to 3 short sentences in the same primary language as the excerpt.",
      "Create a warm lead-in that makes the user interested in rereading the note.",
      "The lead-in may be a brief summary, reflection, encouragement, or gentle self-reflection question.",
      "Be specific and grounded in the excerpt.",
      "Do not claim knowledge beyond the excerpt.",
      "Do not provide medical or therapeutic advice.",
      "Do not include diagnosis, crisis instructions, or urgent medical guidance."
    ].join(" ");
    if (this.settings.aiProvider === "claude") {
      return (0, import_obsidian.requestUrl)({
        url: CLAUDE_REFLECTION_ENDPOINT,
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        throw: false,
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
    return (0, import_obsidian.requestUrl)({
      url: OPENAI_REFLECTION_ENDPOINT,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      throw: false,
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
  readReflection(response) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (this.settings.aiProvider === "claude") {
      const data2 = response.json;
      return (_c = (_b = (_a = data2.content) == null ? void 0 : _a.find((content) => content.type === "text" && typeof content.text === "string")) == null ? void 0 : _b.text) == null ? void 0 : _c.trim();
    }
    const data = response.json;
    return (_g = (_f = (_e = (_d = data.choices) == null ? void 0 : _d[0]) == null ? void 0 : _e.message) == null ? void 0 : _f.content) == null ? void 0 : _g.trim();
  }
  debugLog(event, details) {
    if (!this.settings.debugMode) {
      return;
    }
    console.debug("[Gentle Memories debug]", event, details);
  }
};
var TodayMemoryView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.reflectionLoading = false;
    this.expanded = false;
    this.noteRenderGeneration = 0;
  }
  getViewType() {
    return TODAY_MEMORY_VIEW_TYPE;
  }
  getDisplayText() {
    return TODAY_MEMORY_VIEW_TITLE;
  }
  getIcon() {
    return SHOW_MEMORY_RIBBON_ICON;
  }
  async onOpen() {
    this.render();
  }
  async loadMemory(options = {}) {
    var _a;
    const showNotice = (_a = options.showNotice) != null ? _a : true;
    const memory = await this.plugin.selectMemoryForView();
    if (!memory) {
      this.memory = void 0;
      this.renderEmpty();
      if (showNotice) {
        new import_obsidian.Notice("No journal notes found for the configured tags.");
      }
      return false;
    }
    this.memory = memory;
    this.reflectionText = void 0;
    this.reflectionLoading = false;
    this.automaticReflectionPath = void 0;
    this.expanded = false;
    this.render({ scrollTarget: "top" });
    await this.plugin.recordMemoryShownFromView(memory);
    return true;
  }
  render(options = {}) {
    var _a;
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("gentle-memories-sidebar-view");
    const scrollContainerEl = containerEl.createDiv({
      cls: `gentle-memories-view-scroll ${this.expanded ? "gentle-memories-view-scroll-expanded" : "gentle-memories-view-scroll-collapsed"}`
    });
    this.scrollContainerEl = scrollContainerEl;
    if (!this.memory) {
      this.renderEmpty();
      return;
    }
    scrollContainerEl.createEl("h2", { text: this.memory.title });
    scrollContainerEl.createEl("p", {
      cls: "gentle-memories-date",
      text: (_a = this.memory.date) != null ? _a : this.memory.path
    });
    if (this.reflectionText || this.reflectionLoading) {
      const reflectionEl = scrollContainerEl.createDiv({ cls: "gentle-memories-ai-lead-in" });
      reflectionEl.createEl("h3", { text: "Memory lead-in" });
      reflectionEl.createEl("p", {
        cls: this.reflectionLoading ? "gentle-memories-ai-loading" : void 0,
        text: this.reflectionLoading ? "Loading memory lead-in..." : this.reflectionText
      });
    }
    const originalNoteHeadingEl = scrollContainerEl.createEl("h3", {
      cls: "gentle-memories-original-note-heading",
      text: "Original note"
    });
    const isCollapsedLongNote = !this.expanded && this.memory.markdownBody.length > RICH_MEMORY_PREVIEW_CHARACTERS;
    const noteContentEl = scrollContainerEl.createDiv({
      cls: isCollapsedLongNote ? "gentle-memories-note-content gentle-memories-note-preview" : "gentle-memories-note-content"
    });
    const renderedMarkdown = this.expanded ? this.memory.markdownBody : createMarkdownPreview(this.memory.markdownBody);
    this.renderNoteMarkdown(noteContentEl, renderedMarkdown, this.memory);
    const buttonContainer = scrollContainerEl.createDiv({ cls: "gentle-memories-buttons" });
    const buttons = new import_obsidian.Setting(buttonContainer);
    if (this.memory.markdownBody.length > RICH_MEMORY_PREVIEW_CHARACTERS) {
      buttons.addButton((button) => button.setButtonText(this.expanded ? "Show less" : "Show more").onClick(() => {
        this.expanded = !this.expanded;
        this.render({ scrollTarget: this.expanded ? "note" : "top" });
      }));
    }
    buttons.addButton((button) => button.setButtonText("Open note").onClick(() => {
      void this.openSourceNote();
    })).addButton((button) => button.setButtonText("Refresh").onClick(() => {
      void this.showNextMemory();
    }));
    if (this.plugin.settings.aiEnabled) {
      buttons.addButton((button) => button.setButtonText("Memories").onClick(() => {
        void this.showReflection();
      }));
    }
    this.startAutomaticReflectionLoad();
    this.restoreScrollPosition(options.scrollTarget, originalNoteHeadingEl);
  }
  renderNoteMarkdown(noteContentEl, renderedMarkdown, memory) {
    const generation = this.noteRenderGeneration + 1;
    this.noteRenderGeneration = generation;
    const renderTargetEl = document.createElement("div");
    void import_obsidian.MarkdownRenderer.render(this.app, renderedMarkdown, renderTargetEl, memory.path, this).then(() => {
      var _a;
      if (this.noteRenderGeneration !== generation || ((_a = this.memory) == null ? void 0 : _a.path) !== memory.path) {
        return;
      }
      noteContentEl.appendChild(renderTargetEl);
    }).catch(() => {
      var _a;
      if (this.noteRenderGeneration !== generation || ((_a = this.memory) == null ? void 0 : _a.path) !== memory.path) {
        return;
      }
      noteContentEl.createEl("p", {
        cls: "gentle-memories-excerpt",
        text: memory.excerpt
      });
    });
  }
  renderEmpty() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("gentle-memories-sidebar-view");
    const scrollContainerEl = containerEl.createDiv({
      cls: "gentle-memories-view-scroll gentle-memories-view-scroll-collapsed"
    });
    this.scrollContainerEl = scrollContainerEl;
    scrollContainerEl.createEl("h2", { text: TODAY_MEMORY_VIEW_TITLE });
    scrollContainerEl.createEl("p", {
      cls: "gentle-memories-empty-state",
      text: "No journal notes found for the configured tags."
    });
  }
  restoreScrollPosition(scrollTarget, originalNoteHeadingEl) {
    if (!scrollTarget || !this.scrollContainerEl) {
      return;
    }
    if (scrollTarget === "top") {
      this.scrollContainerEl.scrollTop = 0;
      return;
    }
    originalNoteHeadingEl.scrollIntoView({ block: "start" });
  }
  async openSourceNote() {
    if (!this.memory) {
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(this.memory.sourceFile);
  }
  async showNextMemory() {
    if (!this.memory) {
      await this.loadMemory();
      return;
    }
    const nextMemory = await this.plugin.selectMemoryForView(this.memory.path);
    if (nextMemory) {
      this.memory = nextMemory;
      this.reflectionText = void 0;
      this.reflectionLoading = false;
      this.automaticReflectionPath = void 0;
      this.expanded = false;
      this.render();
      await this.plugin.recordMemoryShownFromView(nextMemory);
    }
  }
  async showReflection() {
    var _a;
    if (!this.memory) {
      return;
    }
    const memoryPath = this.memory.path;
    const reflection = await this.plugin.generateReflectionForView(this.memory);
    if (((_a = this.memory) == null ? void 0 : _a.path) !== memoryPath) {
      return;
    }
    this.reflectionLoading = false;
    if (reflection) {
      this.reflectionText = reflection;
    }
    this.render();
  }
  startAutomaticReflectionLoad() {
    if (!this.memory || !this.plugin.settings.aiEnabled || !this.plugin.canAutoLoadAiReflection() || this.reflectionText) {
      return;
    }
    if (this.automaticReflectionPath === this.memory.path) {
      return;
    }
    this.automaticReflectionPath = this.memory.path;
    this.reflectionLoading = true;
    this.render();
    void this.showReflection();
  }
};
var MemoryModal = class extends import_obsidian.Modal {
  constructor(app, parentComponent, memory, aiEnabled, aiCanAutoLoad, selectNextMemory, recordMemoryShown, generateReflection) {
    super(app);
    this.parentComponent = parentComponent;
    this.memory = memory;
    this.aiEnabled = aiEnabled;
    this.aiCanAutoLoad = aiCanAutoLoad;
    this.selectNextMemory = selectNextMemory;
    this.recordMemoryShown = recordMemoryShown;
    this.generateReflection = generateReflection;
    this.reflectionLoading = false;
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
    if (this.reflectionText || this.reflectionLoading) {
      const reflectionEl = contentEl.createDiv({ cls: "gentle-memories-ai-lead-in" });
      reflectionEl.createEl("h3", { text: "Memory lead-in" });
      reflectionEl.createEl("p", {
        cls: this.reflectionLoading ? "gentle-memories-ai-loading" : void 0,
        text: this.reflectionLoading ? "Loading memory lead-in..." : this.reflectionText
      });
    }
    contentEl.createEl("h3", {
      cls: "gentle-memories-original-note-heading",
      text: "Original note"
    });
    const isCollapsedLongNote = !this.expanded && this.memory.markdownBody.length > RICH_MEMORY_PREVIEW_CHARACTERS;
    const noteContentEl = contentEl.createDiv({
      cls: isCollapsedLongNote ? "gentle-memories-note-content gentle-memories-note-preview" : "gentle-memories-note-content"
    });
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
      buttons.addButton((button) => button.setButtonText("Memories").onClick(() => {
        void this.showReflection();
      }));
    }
    this.startAutomaticReflectionLoad();
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
      this.reflectionLoading = false;
      this.automaticReflectionPath = void 0;
      this.expanded = false;
      this.onOpen();
      await this.recordMemoryShown(nextMemory);
    }
  }
  async showReflection() {
    const memoryPath = this.memory.path;
    const reflection = await this.generateReflection(this.memory);
    if (this.memory.path !== memoryPath) {
      return;
    }
    this.reflectionLoading = false;
    if (reflection) {
      this.reflectionText = reflection;
    }
    this.onOpen();
  }
  startAutomaticReflectionLoad() {
    if (!this.aiEnabled || !this.aiCanAutoLoad || this.reflectionText) {
      return;
    }
    if (this.automaticReflectionPath === this.memory.path) {
      return;
    }
    this.automaticReflectionPath = this.memory.path;
    this.reflectionLoading = true;
    this.onOpen();
    void this.showReflection();
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
    new import_obsidian.Setting(containerEl).setName("Memory reminders").setHeading();
    new import_obsidian.Setting(containerEl).setName("Journal tags").setDesc("Comma-separated tags used to identify journal notes.").addText((text) => {
      text.setPlaceholder("Journal, diary, note").setValue(this.plugin.settings.journalTags.join(", ")).onChange(async (value) => {
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
    new import_obsidian.Setting(containerEl).setName("Enable AI lead-in").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.aiEnabled).onChange(async (value) => {
        this.plugin.settings.aiEnabled = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("AI provider").addDropdown((dropdown) => {
      dropdown.addOption("openai", "Openai").addOption("claude", "Claude").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
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
      new import_obsidian.Setting(containerEl).setName("Openai key").addText((text) => {
        var _a;
        text.inputEl.type = "password";
        text.setValue((_a = this.plugin.settings.openAiApiKey) != null ? _a : "").onChange(async (value) => {
          this.plugin.settings.openAiApiKey = value.trim() || void 0;
          await this.plugin.saveSettings();
        });
      });
    }
    new import_obsidian.Setting(containerEl).setName("Cache AI lead-ins").addToggle((toggle) => {
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
