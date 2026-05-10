import fs from "fs";
import Module, { createRequire } from "module";

const requiredFiles = ["manifest.json", "main.ts", "main.js", "styles.css", "feature_list.json", "progress.md"];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const mainSource = fs.readFileSync("main.ts", "utf8");
const stylesSource = fs.readFileSync("styles.css", "utf8");
const require = createRequire(import.meta.url);
const requiredManifestStrings = ["id", "name", "version", "minAppVersion", "description", "author"];

for (const field of requiredManifestStrings) {
  if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
    throw new Error(`manifest.json must include a non-empty ${field} string`);
  }
}

if (!/^[a-z0-9-]+$/.test(manifest.id)) {
  throw new Error("manifest.json id must be lowercase kebab-case");
}

if (manifest.isDesktopOnly !== undefined && typeof manifest.isDesktopOnly !== "boolean") {
  throw new Error("manifest.json isDesktopOnly must be a boolean when present");
}

for (const styleSnippet of [
  ".gentle-memories-ai-lead-in",
  "var(--background-secondary)",
  "var(--interactive-accent)",
  ".gentle-memories-original-note-heading",
  ".gentle-memories-note-preview",
  ".gentle-memories-view-scroll",
  ".gentle-memories-view-scroll-expanded",
  ".gentle-memories-view-scroll-collapsed",
  "overflow-y: auto",
  "-webkit-overflow-scrolling: touch",
  "overscroll-behavior: contain",
  "max-height: min(45vh, 32rem)",
  ".gentle-memories-view-note-preview",
  "max-height: max(22rem, calc(100vh - 14rem))",
  ".gentle-memories-view-actions",
  "position: sticky",
  ".gentle-memories-ai-loading"
]) {
  if (!stylesSource.includes(styleSnippet)) {
    throw new Error(`styles.css must visually separate the AI lead-in with theme-aware styling: missing ${styleSnippet}`);
  }
}

if (!mainSource.includes('const SHOW_MEMORY_COMMAND_ID = "show-memory";')) {
  throw new Error("main.ts must define the show-memory command id");
}

if (!mainSource.includes('const SHOW_MEMORY_COMMAND_NAME = "Show memory";')) {
  throw new Error("main.ts must define the Show memory command name");
}

if (!mainSource.includes("this.addCommand({")) {
  throw new Error("main.ts must register an Obsidian command");
}

if (!mainSource.includes('const SHOW_MEMORY_RIBBON_ICON = "sparkles";')) {
  throw new Error("main.ts must define the sparkles ribbon icon");
}

if (!mainSource.includes('const SHOW_MEMORY_RIBBON_TOOLTIP = "Show memory";')) {
  throw new Error("main.ts must define a sentence-case ribbon tooltip");
}

if (!mainSource.includes("this.addRibbonIcon(SHOW_MEMORY_RIBBON_ICON, SHOW_MEMORY_RIBBON_TOOLTIP")) {
  throw new Error("main.ts must register the Show memory ribbon icon");
}

if (!mainSource.includes("requestUrl")) {
  throw new Error("main.ts must use Obsidian requestUrl for provider requests");
}

if (mainSource.includes("fetch(")) {
  throw new Error("main.ts must not use global fetch for provider requests");
}

if (!mainSource.includes(".setHeading()")) {
  throw new Error("settings tab heading must use Setting.setHeading()");
}

if (mainSource.includes('.setName("Gentle Memories")')) {
  throw new Error("settings tab heading must not use the plugin name");
}

if (mainSource.includes('containerEl.createEl("h2", { text: "Gentle Memories" })')) {
  throw new Error("settings tab must not create a heading element directly");
}

if (mainSource.includes("private async readReflection")) {
  throw new Error("AI response parsing must not be marked async when it does not await");
}

if (mainSource.includes("private async requestReflection")) {
  throw new Error("AI request builder must not be marked async when it does not await");
}

if (!mainSource.includes("id: SHOW_MEMORY_COMMAND_ID") || !mainSource.includes("name: SHOW_MEMORY_COMMAND_NAME")) {
  throw new Error("main.ts must register the Gentle Memories: Show memory command");
}

const requiredSettingNames = [
  "Journal tags",
  "Show on startup",
  "Minimum days between startup shows",
  "Enable AI lead-in",
  "AI provider",
  "Openai key",
  "Claude API key",
  "Cache AI lead-ins",
  "Debug mode"
];

for (const settingName of requiredSettingNames) {
  if (!mainSource.includes(`.setName("${settingName}")`)) {
    throw new Error(`main.ts must expose the ${settingName} setting`);
  }
}

const requiredSettingKeys = [
  "journalTags",
  "showOnStartup",
  "minDaysBetweenStartupShows",
  "aiEnabled",
  "aiProvider",
  "openAiApiKey",
  "claudeApiKey",
  "cacheAiResponses",
  "debugMode"
];

for (const settingKey of requiredSettingKeys) {
  if (!mainSource.includes(settingKey)) {
    throw new Error(`main.ts must persist the ${settingKey} setting`);
  }
}

if (!mainSource.includes("text.inputEl.type = \"number\"")) {
  throw new Error("main.ts must use a numeric input for minimum days between startup shows");
}

if (!mainSource.includes('.setPlaceholder("Journal, diary, note")')) {
  throw new Error("main.ts must use a sentence-case placeholder for journal tags");
}

if ((mainSource.match(/text\.inputEl\.type = "password"/g) ?? []).length < 2) {
  throw new Error("main.ts must use password-style inputs for provider API keys");
}

const requiredDiscoverySnippets = [
  "journalTags: [\"journal\", \"diary\", \"note\"]",
  "noteHasConfiguredJournalTag",
  "getMarkdownFiles()",
  "metadataCache.getFileCache(file)",
  "getAllTags(cache)"
];

for (const snippet of requiredDiscoverySnippets) {
  if (!mainSource.includes(snippet)) {
    throw new Error(`main.ts must discover Markdown notes with default journal tags: missing ${snippet}`);
  }
}

const originalModuleLoad = Module._load;
const notices = [];
const renderedModals = [];
const renderedViews = [];
const openedFiles = [];
const createdWorkspaceTabs = [];
const createdRightLeaves = [];
const detachedLeaves = [];
const scrollIntoViewCalls = [];
let layoutCallbacks = [];
let delayMarkdownRendering = false;
const pendingMarkdownRenders = [];

class MockNotice {
  constructor(message) {
    notices.push(message);
  }
}

class MockElement {
  constructor() {
    this.texts = [];
    this.buttons = [];
    this.disabledButtons = [];
    this.buttonHandlers = new Map();
    this.settings = [];
    this.classes = [];
    this.scrollTop = 0;
    this.scrollIntoViewCalls = [];
  }

  empty() {
    this.texts.length = 0;
    this.buttons.length = 0;
    this.disabledButtons.length = 0;
    this.buttonHandlers.clear();
    this.settings.length = 0;
    this.classes.length = 0;
    this.scrollIntoViewCalls.length = 0;
  }

  createEl(_tagName, options = {}) {
    if (typeof options.text === "string") {
      this.texts.push(options.text);
    }

    if (typeof options.cls === "string") {
      this.classes.push(options.cls);
    }

    return new MockElement();
  }

  createDiv(options = {}) {
    if (typeof options.cls === "string") {
      this.classes.push(options.cls);
    }

    return this;
  }

  addClass(className) {
    this.classes.push(className);
  }

  appendChild(child) {
    if (Array.isArray(child?.texts)) {
      this.texts.push(...child.texts);
    }

    if (Array.isArray(child?.buttons)) {
      this.buttons.push(...child.buttons);
    }

    if (Array.isArray(child?.disabledButtons)) {
      this.disabledButtons.push(...child.disabledButtons);
    }

    if (child?.buttonHandlers instanceof Map) {
      for (const [label, handler] of child.buttonHandlers) {
        this.buttonHandlers.set(label, handler);
      }
    }

    if (Array.isArray(child?.classes)) {
      this.classes.push(...child.classes);
    }

    return child;
  }

  scrollIntoView(options) {
    this.scrollIntoViewCalls.push(options);
    scrollIntoViewCalls.push(options);
  }
}

globalThis.document = {
  createElement() {
    return new MockElement();
  }
};

class MockModal {
  constructor(app) {
    this.app = app;
    this.contentEl = new MockElement();
    this.closed = false;
  }

  open() {
    this.onOpen();
    renderedModals.push(this.contentEl);
  }

  close() {
    this.closed = true;
  }
}

class MockPlugin {
  constructor(app) {
    this.app = app;
    this.commands = [];
    this.ribbonIcons = [];
    this.settingTabs = [];
    this.data = undefined;
  }

  addCommand(command) {
    this.commands.push(command);
  }

  addRibbonIcon(icon, title, callback) {
    this.ribbonIcons.push({ icon, title, callback });
  }

  addSettingTab(settingTab) {
    this.settingTabs.push(settingTab);
  }

  registerView(type, viewCreator) {
    this.app.workspace.viewCreators.set(type, viewCreator);
  }

  async loadData() {
    return this.data;
  }

  async saveData(data) {
    this.data = data;
  }
}

class MockItemView {
  constructor(leaf) {
    this.leaf = leaf;
    this.app = leaf.app;
    this.containerEl = new MockElement();
  }
}

class MockPluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = new MockElement();
  }
}

class MockButton {
  constructor(element) {
    this.element = element;
    this.text = "";
  }

  setButtonText(text) {
    this.text = text;
    this.element.buttons.push(text);
    return this;
  }

  onClick(callback) {
    this.element.buttonHandlers.set(this.text, callback);
    return this;
  }

  setDisabled(disabled) {
    if (disabled) {
      this.element.disabledButtons.push(this.text);
    }

    return this;
  }
}

class MockDropdown {
  constructor() {
    this.value = "";
    this.options = new Map();
  }

  addOption(value, label) {
    this.options.set(value, label);
    return this;
  }

  setValue(value) {
    this.value = value;
    return this;
  }

  onChange(callback) {
    this.callback = callback;
    return this;
  }
}

class MockText {
  constructor() {
    this.inputEl = {};
    this.value = "";
  }

  setPlaceholder(value) {
    this.placeholder = value;
    return this;
  }

  setValue(value) {
    this.value = value;
    return this;
  }

  onChange(callback) {
    this.callback = callback;
    return this;
  }
}

class MockToggle {
  constructor() {
    this.value = false;
  }

  setValue(value) {
    this.value = value;
    return this;
  }

  onChange(callback) {
    this.callback = callback;
    return this;
  }
}

class MockSetting {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.record = { name: "" };
    this.containerEl.settings.push(this.record);
  }

  setName(name) {
    this.record.name = name;
    return this;
  }

  setDesc(description) {
    this.record.description = description;
    return this;
  }

  setHeading() {
    this.record.heading = true;
    return this;
  }

  addText(callback) {
    const text = new MockText();
    this.record.text = text;
    callback(text);
    return this;
  }

  addToggle(callback) {
    const toggle = new MockToggle();
    this.record.toggle = toggle;
    callback(toggle);
    return this;
  }

  addButton(callback) {
    callback(new MockButton(this.containerEl));
    return this;
  }

  addDropdown(callback) {
    const dropdown = new MockDropdown();
    this.record.dropdown = dropdown;
    callback(dropdown);
    return this;
  }
}

function createMockApp(entries = [{
  path: "Memories/2024-03-15 Journal.md",
  basename: "2024-03-15 Journal",
  date: "2024-03-14",
  excerpt: "A compact memory excerpt with enough detail to display."
}]) {
  const markdownFiles = entries.map((entry) => ({
    path: entry.path,
    basename: entry.basename,
    stat: { ctime: new Date(`${entry.date}T00:00:00.000Z`).getTime() }
  }));
  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const leaves = [];

  const app = {
    vault: {
      getName() {
        return "Personal Vault";
      },
      getMarkdownFiles() {
        return markdownFiles;
      },
      async cachedRead(file) {
        const entry = entriesByPath.get(file.path);

        if (!entry) {
          throw new Error(`Unexpected file read: ${file.path}`);
        }

        return [
          "---",
          `date: ${entry.date}`,
          "tags: [journal]",
          "---",
          "# A heading to skip",
          "#journal",
          entry.excerpt,
          entry.extraContent ?? ""
        ].join("\n");
      }
    },
    metadataCache: {
      getFileCache(file) {
        const entry = entriesByPath.get(file.path);
        return { __allTags: ["#journal"], frontmatter: { date: entry?.date } };
      }
    },
    workspace: {
      rootSplit: { location: "root" },
      rightSplit: { location: "right" },
      viewCreators: new Map(),
      onLayoutReady(callback) {
        layoutCallbacks.push(callback);
      },
      getLeavesOfType(type) {
        return leaves.filter((leaf) => leaf.view?.getViewType?.() === type);
      },
      detachLeavesOfType(type) {
        for (let index = leaves.length - 1; index >= 0; index -= 1) {
          if (leaves[index].view?.getViewType?.() === type) {
            leaves.splice(index, 1);
          }
        }
      },
      createViewLeaf(location) {
        const leaf = {
          app,
          location,
          view: undefined,
          getRoot() {
            return location === "tab" ? app.workspace.rootSplit : app.workspace.rightSplit;
          },
          async setViewState(state) {
            const viewCreator = app.workspace.viewCreators.get(state.type);

            if (!viewCreator) {
              throw new Error(`No registered view for ${state.type}`);
            }

            this.view = viewCreator(this);
            await this.view.onOpen?.();
            renderedViews.push(this.view.containerEl);
          },
          async detach() {
            const leafIndex = leaves.indexOf(this);

            if (leafIndex >= 0) {
              leaves.splice(leafIndex, 1);
            }

            detachedLeaves.push(this);
          }
        };
        leaves.push(leaf);
        return leaf;
      },
      getRightLeaf() {
        const leaf = this.createViewLeaf("right");
        createdRightLeaves.push(leaf);
        return leaf;
      },
      revealLeaf(leaf) {
        this.revealedLeaf = leaf;
      },
      getLeaf(newLeaf) {
        if (newLeaf === "tab") {
          const leaf = this.createViewLeaf("tab");
          createdWorkspaceTabs.push(leaf);
          return leaf;
        }

        return {
          async openFile(file) {
            openedFiles.push(file);
          }
        };
      }
    }
  };

  return app;
}

Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      getAllTags(cache) {
        return cache?.__allTags;
      },
      MarkdownRenderer: {
        render(_app, markdown, element) {
          if (delayMarkdownRendering) {
            return new Promise((resolve) => {
              pendingMarkdownRenders.push({
                markdown,
                complete() {
                  if (typeof markdown === "string") {
                    element.texts.push(markdown);
                  }

                  resolve();
                }
              });
            });
          }

          if (typeof markdown === "string") {
            element.texts.push(markdown);
          }

          return Promise.resolve();
        }
      },
      Modal: MockModal,
      ItemView: MockItemView,
      Notice: MockNotice,
      Plugin: MockPlugin,
      PluginSettingTab: MockPluginSettingTab,
      async requestUrl(request) {
        const url = typeof request === "string" ? request : request.url;
        const init = typeof request === "string"
          ? undefined
          : {
            method: request.method,
            headers: request.headers,
            body: request.body
          };
        const response = await globalThis.fetch(url, init);
        const json = typeof response.json === "function" ? await response.json() : undefined;
        const text = typeof response.text === "function" ? await response.text() : JSON.stringify(json ?? "");

        return {
          status: response.status ?? 200,
          headers: response.headers ?? {},
          arrayBuffer: new ArrayBuffer(0),
          json,
          text
        };
      },
      Setting: MockSetting
    };
  }

  return originalModuleLoad.call(this, request, parent, isMain);
};

const pluginModule = require("../main.js");
const { noteHasConfiguredJournalTag } = pluginModule;
const GentleMemoriesPlugin = pluginModule.default;
Module._load = originalModuleLoad;

const msPerDay = 24 * 60 * 60 * 1000;
const originalDateNow = Date.now;
const fixedNow = new Date("2026-04-28T00:00:00.000Z").getTime();
Date.now = () => fixedNow;
const originalConsoleDebug = console.debug;
const originalFetch = globalThis.fetch;

const configuredTags = ["journal", "diary", "note"];

async function flushPromises() {
  for (let index = 0; index < 30; index += 1) {
    await Promise.resolve();
  }
}

function assertMemoryModal(message, {
  expectAiButton = false,
  expectedTitle = "2024-03-15 Journal",
  expectedDate = "2024-03-14",
  expectedExcerpt = "A compact memory excerpt with enough detail to display."
} = {}) {
  if (renderedModals.length !== 1) {
    throw new Error(message);
  }

  const modal = renderedModals[0];
  const text = modal.texts.join("\n");
  const buttons = modal.buttons;

  if (!text.includes(expectedTitle)) {
    throw new Error("Shown memory must contain the note title");
  }

  if (!text.includes(expectedDate)) {
    throw new Error("Shown memory must contain the derivable date");
  }

  if (!text.includes(expectedExcerpt)) {
    throw new Error("Shown memory must contain the generated excerpt");
  }

  for (const label of ["Open note", "Next", "Close"]) {
    if (!buttons.includes(label)) {
      throw new Error(`Shown memory must include the ${label} button`);
    }
  }

  if (expectAiButton && !buttons.includes("Memories")) {
    throw new Error("Shown memory must include the Memories button when AI is enabled");
  }

  if (!expectAiButton && buttons.includes("Memories")) {
    throw new Error("Shown memory must omit the Memories button when AI is disabled");
  }
}

async function clickModalButton(label) {
  const handler = renderedModals.at(-1)?.buttonHandlers.get(label);

  if (typeof handler !== "function") {
    throw new Error(`Shown memory ${label} button must have a click handler`);
  }

  handler();
  await flushPromises();
}

async function clickViewButton(label) {
  const handler = renderedViews.at(-1)?.buttonHandlers.get(label);

  if (typeof handler !== "function") {
    throw new Error(`Today's memory view ${label} button must have a click handler`);
  }

  handler();
  await flushPromises();
}

if (noteHasConfiguredJournalTag(null, configuredTags)) {
  throw new Error("Journal discovery must reject notes without metadata");
}

if (noteHasConfiguredJournalTag({}, configuredTags)) {
  throw new Error("Journal discovery must reject notes without tags");
}

if (noteHasConfiguredJournalTag({ __allTags: ["#project"] }, configuredTags)) {
  throw new Error("Journal discovery must reject notes without configured tags");
}

if (!noteHasConfiguredJournalTag({ __allTags: ["#journal"] }, configuredTags)) {
  throw new Error("Journal discovery must accept notes with configured tags");
}

if (typeof GentleMemoriesPlugin !== "function") {
  throw new Error("main.ts must export the Gentle Memories plugin class");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
const disabledStartupPlugin = new GentleMemoriesPlugin(createMockApp());
disabledStartupPlugin.data = { settings: { showOnStartup: false } };
await disabledStartupPlugin.onload();

if (layoutCallbacks.length !== 0) {
  throw new Error("Startup display must not be queued when showOnStartup is false");
}

if (notices.length !== 0) {
  throw new Error("Startup display must not show a notice when showOnStartup is false");
}

const disabledStartupShowMemoryCommand = disabledStartupPlugin.commands.find((command) => command.id === "show-memory");

if (!disabledStartupShowMemoryCommand) {
  throw new Error("Manual show memory command must be registered");
}

const showMemoryRibbonIcon = disabledStartupPlugin.ribbonIcons.find((ribbonIcon) => ribbonIcon.icon === "sparkles");

if (!showMemoryRibbonIcon) {
  throw new Error("Show memory ribbon icon must be registered with the sparkles icon");
}

if (showMemoryRibbonIcon.title !== "Show memory") {
  throw new Error("Show memory ribbon icon tooltip must use sentence case");
}

if (typeof showMemoryRibbonIcon.callback !== "function") {
  throw new Error("Show memory ribbon icon must have a click handler");
}

disabledStartupShowMemoryCommand.callback();
await flushPromises();

if (notices.length !== 0) {
  throw new Error("Manual show memory command must display a memory instead of the placeholder notice");
}

try {
  assertMemoryModal("Manual show memory command must display a memory when showOnStartup is false");
} catch (error) {
  throw new Error("Manual show memory command must display a memory when showOnStartup is false");
}

await clickModalButton("Open note");

if (openedFiles.length !== 1 || openedFiles[0]?.path !== "Memories/2024-03-15 Journal.md") {
  throw new Error("Open note button must open the source note");
}

if (layoutCallbacks.length !== 0) {
  throw new Error("Manual show memory command must not depend on startup layout scheduling");
}

renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
notices.length = 0;
createdWorkspaceTabs.length = 0;
createdRightLeaves.length = 0;
showMemoryRibbonIcon.callback();
await flushPromises();

if (notices.length !== 0) {
  throw new Error("Show memory ribbon icon must open a memory tab instead of a notice when notes are available");
}

if (renderedModals.length !== 0) {
  throw new Error(`Show memory ribbon icon must route to the persistent memory view instead of the modal; rendered ${renderedModals.length} modal(s)`);
}

if (renderedViews.length === 0) {
  throw new Error("Show memory ribbon icon must open the Today's memory view");
}

const sidebarView = renderedViews.at(-1);
const sidebarText = sidebarView.texts.join("\n");

for (const expected of ["2024-03-15 Journal", "2024-03-14", "Original note", "A compact memory excerpt with enough detail to display."]) {
  if (!sidebarText.includes(expected)) {
    throw new Error(`Today's memory view must render ${expected}`);
  }
}

for (const label of ["Open note", "Refresh"]) {
  if (!sidebarView.buttons.includes(label)) {
    throw new Error(`Today's memory view must include the ${label} action`);
  }
}

if (!sidebarView.classes.some((className) => className.includes("gentle-memories-sidebar-view"))) {
  throw new Error("Today's memory view must use dedicated memory styling");
}

if (createdWorkspaceTabs.length !== 1) {
  throw new Error("Show memory ribbon icon must open the memory view in a normal workspace tab");
}

if (createdRightLeaves.length !== 0) {
  throw new Error("Show memory ribbon icon must not open the memory view in a right sidebar leaf");
}

const firstMemoryViewLeaf = createdWorkspaceTabs[0];
showMemoryRibbonIcon.callback();
await flushPromises();

if (createdWorkspaceTabs.length !== 1 || createdWorkspaceTabs[0] !== firstMemoryViewLeaf) {
  throw new Error("Show memory ribbon icon must reuse the existing memory view tab");
}

if (createdRightLeaves.length !== 0) {
  throw new Error("Reopening the memory view must not create a right sidebar leaf");
}

if (layoutCallbacks.length !== 0) {
  throw new Error("Show memory ribbon icon must not depend on startup layout scheduling");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
createdWorkspaceTabs.length = 0;
detachedLeaves.length = 0;
const unusableManualPlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-01-01 Empty Journal.md",
    basename: "2024-01-01 Empty Journal",
    date: "2024-01-01",
    excerpt: ""
  },
  {
    path: "Memories/2024-01-02 Comment Journal.md",
    basename: "2024-01-02 Comment Journal",
    date: "2024-01-02",
    excerpt: "%% only an Obsidian comment %%"
  }
]));
unusableManualPlugin.data = { settings: { showOnStartup: false } };
await unusableManualPlugin.onload();
unusableManualPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();

if (renderedModals.length !== 0) {
  throw new Error("Manual show memory command must not show tagged notes without usable excerpts");
}

if (!notices.includes("No journal notes found for the configured tags.")) {
  throw new Error("Manual show memory command must show a notice when matching notes have no usable excerpt");
}

notices.length = 0;
renderedViews.length = 0;
createdWorkspaceTabs.length = 0;
detachedLeaves.length = 0;
unusableManualPlugin.ribbonIcons.find((ribbonIcon) => ribbonIcon.icon === "sparkles")?.callback();
await flushPromises();

if (!notices.includes("No journal notes found for the configured tags.")) {
  throw new Error("Show memory ribbon icon must show a notice when no usable memory exists");
}

if (createdWorkspaceTabs.length !== 0 || renderedViews.length !== 0) {
  throw new Error("Show memory ribbon icon must not leave an empty memory tab when no usable memory exists");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const unusableStartupPlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-01-01 Empty Journal.md",
    basename: "2024-01-01 Empty Journal",
    date: "2024-01-01",
    excerpt: ""
  }
]));
unusableStartupPlugin.data = { settings: { showOnStartup: true } };
await unusableStartupPlugin.onload();
layoutCallbacks.forEach((callback) => callback());
await flushPromises();

if (renderedModals.length !== 0) {
  throw new Error("Startup display must not show tagged notes without usable excerpts");
}

if (notices.length !== 0) {
  throw new Error("Startup display must stay quiet when matching notes have no usable excerpt");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const mixedUsabilityPlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-01-01 Empty Journal.md",
    basename: "2024-01-01 Empty Journal",
    date: "2024-01-01",
    excerpt: ""
  },
  {
    path: "Memories/2024-01-03 Usable Journal.md",
    basename: "2024-01-03 Usable Journal",
    date: "2024-01-03",
    excerpt: "A usable memory excerpt should be selected instead of an empty tagged note."
  }
]));
mixedUsabilityPlugin.data = { settings: { showOnStartup: false } };
await mixedUsabilityPlugin.onload();
mixedUsabilityPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Manual show memory command must skip unusable tagged notes when another memory is usable", {
  expectedTitle: "2024-01-03 Usable Journal",
  expectedDate: "2024-01-03",
  expectedExcerpt: "A usable memory excerpt should be selected instead of an empty tagged note."
});

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const twoMemoryPlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-03-15 Journal.md",
    basename: "2024-03-15 Journal",
    date: "2024-03-14",
    excerpt: "A compact memory excerpt with enough detail to display."
  },
  {
    path: "Memories/2024-04-20 Diary.md",
    basename: "2024-04-20 Diary",
    date: "2024-04-20",
    excerpt: "A second eligible memory that should appear after clicking next."
  }
]));
twoMemoryPlugin.data = { settings: { showOnStartup: false } };
await twoMemoryPlugin.onload();
twoMemoryPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Manual show memory command must display the first available memory");
await clickModalButton("Next");
assertMemoryModal("Next button must show a different eligible note when one exists", {
  expectedTitle: "2024-04-20 Diary",
  expectedDate: "2024-04-20",
  expectedExcerpt: "A second eligible memory that should appear after clicking next."
});

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const historySourcePlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-03-15 Journal.md",
    basename: "2024-03-15 Journal",
    date: "2024-03-14",
    excerpt: "A compact memory excerpt with enough detail to display."
  },
  {
    path: "Memories/2024-04-20 Diary.md",
    basename: "2024-04-20 Diary",
    date: "2024-04-20",
    excerpt: "A second eligible memory that should appear after reload."
  }
]));
historySourcePlugin.data = { settings: { showOnStartup: false } };
await historySourcePlugin.onload();
historySourcePlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Manual show memory command must display the first available memory before history exists");

const firstHistoryEntry = historySourcePlugin.data?.displayHistory?.shown?.["Memories/2024-03-15 Journal.md"];

if (!firstHistoryEntry || !firstHistoryEntry.shownAt.startsWith("2026-04-28") || typeof firstHistoryEntry.contentHash !== "string") {
  throw new Error("Display history must persist the shown note path, timestamp, and content hash");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const historyReloadedPlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-03-15 Journal.md",
    basename: "2024-03-15 Journal",
    date: "2024-03-14",
    excerpt: "A compact memory excerpt with enough detail to display."
  },
  {
    path: "Memories/2024-04-20 Diary.md",
    basename: "2024-04-20 Diary",
    date: "2024-04-20",
    excerpt: "A second eligible memory that should appear after reload."
  }
]));
historyReloadedPlugin.data = historySourcePlugin.data;
await historyReloadedPlugin.onload();
historyReloadedPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Display history must persist across plugin reloads and prefer an unshown note", {
  expectedTitle: "2024-04-20 Diary",
  expectedDate: "2024-04-20",
  expectedExcerpt: "A second eligible memory that should appear after reload."
});

if (!historyReloadedPlugin.data?.displayHistory?.shown?.["Memories/2024-03-15 Journal.md"]) {
  throw new Error("Display history must preserve entries loaded from plugin data");
}

if (!historyReloadedPlugin.data?.displayHistory?.shown?.["Memories/2024-04-20 Diary.md"]) {
  throw new Error("Display history must add entries after reload");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
createdWorkspaceTabs.length = 0;
detachedLeaves.length = 0;
const restoredViewPlugin = new GentleMemoriesPlugin(createMockApp());
restoredViewPlugin.data = { settings: { showOnStartup: false } };
const restoredViewApp = restoredViewPlugin.app;
await restoredViewPlugin.onload();
const restoredLeaf = restoredViewApp.workspace.createViewLeaf("tab");
await restoredLeaf.setViewState({
  type: "gentle-memories-today-memory",
  active: true
});
await flushPromises();

if (!detachedLeaves.includes(restoredLeaf)) {
  throw new Error("Restored empty Today's memory view must detach itself quietly on startup");
}

if (renderedViews.at(-1)?.texts.includes("No journal notes found for the configured tags.")) {
  throw new Error("Restored empty Today's memory view must not show an empty-state tab on startup");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
createdWorkspaceTabs.length = 0;
detachedLeaves.length = 0;
const rotatingViewPlugin = new GentleMemoriesPlugin(createMockApp([
  {
    path: "Memories/2024-05-01 First.md",
    basename: "2024-05-01 First",
    date: "2024-05-01",
    excerpt: "First memory in the refresh rotation."
  },
  {
    path: "Memories/2024-05-02 Second.md",
    basename: "2024-05-02 Second",
    date: "2024-05-02",
    excerpt: "Second memory in the refresh rotation."
  },
  {
    path: "Memories/2024-05-03 Third.md",
    basename: "2024-05-03 Third",
    date: "2024-05-03",
    excerpt: "Third memory in the refresh rotation."
  }
]));
rotatingViewPlugin.data = { settings: { showOnStartup: false } };
await rotatingViewPlugin.onload();
rotatingViewPlugin.ribbonIcons.find((ribbonIcon) => ribbonIcon.icon === "sparkles")?.callback();
await flushPromises();

let rotatingViewText = renderedViews.at(-1)?.texts.join("\n") ?? "";

if (!rotatingViewText.includes("2024-05-01 First")) {
  throw new Error("Memory view refresh rotation must start with the first never-shown memory");
}

await clickViewButton("Refresh");
rotatingViewText = renderedViews.at(-1)?.texts.join("\n") ?? "";

if (!rotatingViewText.includes("2024-05-02 Second")) {
  throw new Error("Memory view refresh must prefer the next never-shown memory");
}

await clickViewButton("Refresh");
rotatingViewText = renderedViews.at(-1)?.texts.join("\n") ?? "";

if (!rotatingViewText.includes("2024-05-03 Third")) {
  throw new Error("Memory view refresh must continue through all never-shown memories");
}

await clickViewButton("Refresh");
rotatingViewText = renderedViews.at(-1)?.texts.join("\n") ?? "";

if (!rotatingViewText.includes("2024-05-01 First")) {
  throw new Error("Memory view refresh must rotate back to the least-recently-shown memory after all are shown");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const aiDefaultManualPlugin = new GentleMemoriesPlugin(createMockApp());
aiDefaultManualPlugin.data = { settings: { showOnStartup: false } };
await aiDefaultManualPlugin.onload();

if (aiDefaultManualPlugin.settings.aiEnabled !== false) {
  throw new Error("AI must be disabled by default when aiEnabled is not saved");
}

aiDefaultManualPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Manual show memory command must omit AI button by default");

const legacyApiKeyPlugin = new GentleMemoriesPlugin(createMockApp());
legacyApiKeyPlugin.data = { settings: { showOnStartup: false, apiKey: "legacy-openai-key" } };
await legacyApiKeyPlugin.onload();

if (legacyApiKeyPlugin.settings.openAiApiKey !== "legacy-openai-key") {
  throw new Error("Legacy apiKey setting must migrate to the OpenAI API key setting");
}

const providerSettingsPlugin = new GentleMemoriesPlugin(createMockApp());
providerSettingsPlugin.data = {
  settings: {
    showOnStartup: false,
    aiProvider: "openai",
    openAiApiKey: "saved-openai-key",
    claudeApiKey: "saved-claude-key"
  }
};
await providerSettingsPlugin.onload();
const providerSettingsTab = providerSettingsPlugin.settingTabs[0];
providerSettingsTab.display();

const settingNames = () => providerSettingsTab.containerEl.settings.map((setting) => setting.name);
const providerDropdown = () => providerSettingsTab.containerEl.settings
  .find((setting) => setting.name === "AI provider")?.dropdown;

if (!settingNames().includes("Openai key")) {
  throw new Error("Openai provider settings must show the Openai key input");
}

if (settingNames().includes("Claude API key")) {
  throw new Error("Openai provider settings must hide the Claude API key input");
}

await providerDropdown()?.callback("claude");
await flushPromises();

if (!settingNames().includes("Claude API key")) {
  throw new Error("Claude provider settings must show the Claude API key input after switching providers");
}

if (settingNames().includes("Openai key")) {
  throw new Error("Claude provider settings must hide the Openai key input after switching providers");
}

if (providerSettingsPlugin.settings.openAiApiKey !== "saved-openai-key") {
  throw new Error("Switching providers must preserve the hidden OpenAI API key");
}

if (providerSettingsPlugin.settings.claudeApiKey !== "saved-claude-key") {
  throw new Error("Switching providers must preserve the saved Claude API key");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const debugDefaultPlugin = new GentleMemoriesPlugin(createMockApp());
debugDefaultPlugin.data = { settings: { showOnStartup: false } };
await debugDefaultPlugin.onload();

if (debugDefaultPlugin.settings.debugMode !== false) {
  throw new Error("Debug mode must be disabled by default");
}

const debugDefaultSettingsTab = debugDefaultPlugin.settingTabs[0];
debugDefaultSettingsTab.display();

if (!debugDefaultSettingsTab.containerEl.settings.some((setting) => setting.name === "Debug mode")) {
  throw new Error("Settings tab must expose the Debug mode setting");
}

if (debugDefaultSettingsTab.containerEl.settings.some((setting) => setting.name === "Show memory now")) {
  throw new Error("Debug show-memory control must be hidden while debug mode is disabled");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const debugLogs = [];
console.debug = (...args) => {
  debugLogs.push(args);
};

try {
  const debugPlugin = new GentleMemoriesPlugin(createMockApp([{
    path: "Logs/2024-08-01 Journal.md",
    basename: "2024-08-01 Journal",
    date: "2024-08-01",
    excerpt: "A debug-safe memory excerpt with enough detail to display.",
    extraContent: "FULL_DEBUG_NOTE_SECRET_must_not_be_logged"
  }]));
  debugPlugin.data = {
    settings: {
      showOnStartup: false,
      minDaysBetweenStartupShows: 365,
      debugMode: true,
      aiEnabled: true,
      openAiApiKey: "debug-api-key",
      cacheAiResponses: true
    },
    lastStartupMemoryShownAt: fixedNow
  };
  await debugPlugin.onload();

  if (layoutCallbacks.length !== 0) {
    throw new Error("Debug test setup must not queue startup display when showOnStartup is false");
  }

  const debugSettingsTab = debugPlugin.settingTabs[0];
  debugSettingsTab.display();

  if (!debugSettingsTab.containerEl.settings.some((setting) => setting.name === "Show memory now")) {
    throw new Error("Debug mode must expose a settings-tab show-memory control");
  }

  const debugShowMemoryHandler = debugSettingsTab.containerEl.buttonHandlers.get("Show memory");

  if (typeof debugShowMemoryHandler !== "function") {
    throw new Error("Debug show-memory control must have a click handler");
  }

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: "Debug reflection text."
          }
        }]
      };
    }
  });

  debugShowMemoryHandler();
  await flushPromises();

  assertMemoryModal("Debug show-memory control must show a memory immediately", {
    expectAiButton: true,
    expectedTitle: "2024-08-01 Journal",
    expectedDate: "2024-08-01",
    expectedExcerpt: "A debug-safe memory excerpt with enough detail to display."
  });

  const debugLogTextAfterAi = JSON.stringify(debugLogs);

  for (const requiredText of [
    "journal-note-discovery",
    "candidateNoteCount",
    "memory-filter-outcomes",
    "memory-selection",
    "Logs/2024-08-01 Journal.md"
  ]) {
    if (!debugLogTextAfterAi.includes(requiredText)) {
      throw new Error(`Debug logging must include ${requiredText}`);
    }
  }

  if (!debugLogTextAfterAi.includes("ai-cache") || !debugLogTextAfterAi.includes("miss")) {
    throw new Error("Debug logging must include automatic AI cache misses");
  }

  debugLogs.length = 0;
  renderedModals.length = 0;
  debugShowMemoryHandler();
  await flushPromises();

  const debugLogTextAfterCacheHit = JSON.stringify(debugLogs);

  if (!debugLogTextAfterCacheHit.includes("ai-cache") || !debugLogTextAfterCacheHit.includes("hit")) {
    throw new Error("Debug logging must include automatic AI cache hits");
  }

  for (const forbiddenDebugText of [
    "Personal Vault",
    "debug-api-key",
    "FULL_DEBUG_NOTE_SECRET_must_not_be_logged",
    "Authorization",
    "x-api-key"
  ]) {
    if (debugLogTextAfterAi.includes(forbiddenDebugText) ||
      debugLogTextAfterCacheHit.includes(forbiddenDebugText)) {
      throw new Error(`Debug logging must not include private diagnostic content: ${forbiddenDebugText}`);
    }
  }
} finally {
  console.debug = originalConsoleDebug;
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const missingKeyAutomaticRequests = [];
globalThis.fetch = async (...args) => {
  missingKeyAutomaticRequests.push(args);
  throw new Error("Automatic AI request occurred without a selected provider API key");
};
const aiEnabledManualPlugin = new GentleMemoriesPlugin(createMockApp());
aiEnabledManualPlugin.data = { settings: { showOnStartup: false, aiEnabled: true } };
await aiEnabledManualPlugin.onload();
aiEnabledManualPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Manual show memory command must include AI button when AI is enabled", { expectAiButton: true });

if (missingKeyAutomaticRequests.length !== 0) {
  throw new Error("AI-enabled memory display without a selected provider API key must not make an automatic request");
}

if (notices.length !== 0) {
  throw new Error("AI-enabled memory display without a selected provider API key must not show an automatic missing-key notice");
}

await clickModalButton("Memories");

if (!notices.includes("Add an Openai key in settings to generate a reading prompt.")) {
  throw new Error("Manual Memories click without a selected provider API key must show the missing-key notice");
}

if (missingKeyAutomaticRequests.length !== 0) {
  throw new Error("Manual Memories click without a selected provider API key must not make a request");
}

globalThis.fetch = originalFetch;

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const longNoteStart = "A long rendered memory begins with enough detail to remain visible in the compact preview.";
const longNotePreviewBoundary = "MYSTERY_PREVIEW_BOUNDARY_visible_only_after_show_more";
const longNoteEnd = "FINAL_LONG_NOTE_DETAIL_visible_only_after_show_more";
const longNotePlugin = new GentleMemoriesPlugin(createMockApp([{
  path: "Long/2024-07-01 Journal.md",
  basename: "2024-07-01 Journal",
  date: "2024-07-01",
  excerpt: `${longNoteStart} ${"additional sentence. ".repeat(35)} ${longNotePreviewBoundary}`,
  extraContent: `${"Middle paragraph with [[wikilink]] and ![[image.png]]. ".repeat(45)}\n\n${longNoteEnd}`
}]));
longNotePlugin.data = { settings: { showOnStartup: false, aiEnabled: true } };
await longNotePlugin.onload();
longNotePlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();

let longNoteModal = renderedModals[0];
let longNoteText = longNoteModal.texts.join("\n");

if (!longNoteText.includes(longNoteStart)) {
  throw new Error("Rich memory display must render the source note Markdown preview");
}

if (longNoteText.includes(longNoteEnd)) {
  throw new Error("Long rich memory display must start with a compact preview");
}

if (longNoteText.includes(longNotePreviewBoundary)) {
  throw new Error("Long rich memory display must keep later opening details hidden in the compact preview");
}

if (!longNoteModal.classes.some((className) => className.includes("gentle-memories-note-preview"))) {
  throw new Error("Collapsed long rich memory display must constrain the preview height");
}

if (!longNoteModal.buttons.includes("Show more")) {
  throw new Error("Long rich memory display must include Show more before expansion");
}

await clickModalButton("Show more");
longNoteModal = renderedModals[0];
longNoteText = longNoteModal.texts.join("\n");

if (!longNoteText.includes(longNoteEnd)) {
  throw new Error("Show more must expand long rich memory content to the full note body");
}

if (!longNoteText.includes(longNotePreviewBoundary)) {
  throw new Error("Show more must reveal details beyond the shorter compact preview");
}

if (longNoteModal.classes.some((className) => className.includes("gentle-memories-note-preview"))) {
  throw new Error("Expanded long rich memory display must remove the constrained preview class");
}

if (!longNoteModal.buttons.includes("Show less")) {
  throw new Error("Expanded rich memory display must include Show less");
}

await clickModalButton("Show less");
longNoteModal = renderedModals[0];
longNoteText = longNoteModal.texts.join("\n");

if (longNoteText.includes(longNoteEnd)) {
  throw new Error("Show less must return long rich memory content to the compact preview");
}

if (longNoteText.includes(longNotePreviewBoundary)) {
  throw new Error("Show less must hide details beyond the shorter compact preview again");
}

if (!longNoteModal.classes.some((className) => className.includes("gentle-memories-note-preview"))) {
  throw new Error("Show less must restore the constrained preview class");
}

if (!longNoteModal.buttons.includes("Show more")) {
  throw new Error("Collapsed rich memory display must restore Show more");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
createdWorkspaceTabs.length = 0;
createdRightLeaves.length = 0;
pendingMarkdownRenders.length = 0;
scrollIntoViewCalls.length = 0;
delayMarkdownRendering = true;
const longNoteViewPlugin = new GentleMemoriesPlugin(createMockApp([{
  path: "Memories/2024-04-01 Journal.md",
  date: "2024-04-01",
  excerpt: `${longNoteStart} ${"additional sentence. ".repeat(35)}`,
  extraContent: `${"Middle paragraph with [[wikilink]] and ![[image.png]]. ".repeat(80)}\n\n${longNotePreviewBoundary}\n\n${longNoteEnd}`
}]));
longNoteViewPlugin.data = { settings: { showOnStartup: false, aiEnabled: false } };
await longNoteViewPlugin.onload();
longNoteViewPlugin.ribbonIcons.find((ribbonIcon) => ribbonIcon.icon === "sparkles")?.callback();
await flushPromises();

if (createdWorkspaceTabs.length !== 1 || createdRightLeaves.length !== 0) {
  throw new Error("Long memory view must open as a normal workspace tab for expansion testing");
}

if (pendingMarkdownRenders.length !== 1) {
  throw new Error("Long memory view should start one compact Markdown render before expansion");
}

const staleCollapsedViewRender = pendingMarkdownRenders[0];
let longNoteView = renderedViews.at(-1);

if (!longNoteView?.buttons.includes("Show more")) {
  throw new Error("Long memory view must include Show more before expansion");
}

if (!longNoteView.classes.some((className) => className.includes("gentle-memories-view-scroll")) ||
  !longNoteView.classes.some((className) => className.includes("gentle-memories-view-scroll-collapsed"))) {
  throw new Error(`Collapsed long memory view must render inside the scroll container with the collapsed state class: ${JSON.stringify(longNoteView.classes)}`);
}

if (!longNoteView.classes.some((className) => className.includes("gentle-memories-view-note-preview"))) {
  throw new Error("Collapsed long memory view must use the adaptive memory view preview class");
}

scrollIntoViewCalls.length = 0;
longNoteView.scrollTop = 840;
await clickViewButton("Show more");

if (pendingMarkdownRenders.length !== 2) {
  throw new Error("Long memory view Show more must start a progressive Markdown render");
}

if (scrollIntoViewCalls.length !== 0) {
  throw new Error("Long memory view Show more must preserve the current reading anchor instead of jumping to the original note heading");
}

const firstRevealViewRender = pendingMarkdownRenders[1];

if (firstRevealViewRender.markdown.length <= staleCollapsedViewRender.markdown.length) {
  throw new Error("Memory view Show more must reveal an additional reading segment beyond the compact preview");
}

if (firstRevealViewRender.markdown.includes(longNoteEnd)) {
  throw new Error("Memory view Show more must not reveal the entire long note on the first click");
}

firstRevealViewRender.complete();
await flushPromises();
staleCollapsedViewRender.complete();
await flushPromises();
longNoteView = renderedViews.at(-1);
let longNoteViewText = longNoteView.texts.join("\n");

if (longNoteView.scrollTop !== 840) {
  throw new Error("Long memory view Show more must keep the reader at the previous scroll anchor after appending content");
}

if (longNoteViewText.includes(longNoteEnd)) {
  throw new Error("Memory view first progressive reveal must keep the final long-note detail hidden");
}

if (longNoteViewText.length <= staleCollapsedViewRender.markdown.length) {
  throw new Error("Memory view first progressive reveal must render more content than the compact preview");
}

if (longNoteView.classes.some((className) => className.includes("gentle-memories-note-preview"))) {
  throw new Error("Progressively revealed memory view must remove the constrained preview class");
}

if (!longNoteView.classes.some((className) => className.includes("gentle-memories-view-scroll-expanded"))) {
  throw new Error("Progressively revealed memory view must use the expanded scroll state class");
}

if (!longNoteView.classes.some((className) => className.includes("gentle-memories-view-actions"))) {
  throw new Error("Memory view actions must use the sticky action area class");
}

if (!longNoteView.buttons.includes("Show more")) {
  throw new Error("Partially revealed memory view must keep Show more available while more content is hidden");
}

if (!longNoteView.buttons.includes("Show less")) {
  throw new Error("Partially revealed memory view must include Show less");
}

let revealAttempts = 0;

while (longNoteView.buttons.includes("Show more") && revealAttempts < 10) {
  pendingMarkdownRenders.length = 0;
  scrollIntoViewCalls.length = 0;
  longNoteView.scrollTop = 900 + revealAttempts;
  await clickViewButton("Show more");

  if (pendingMarkdownRenders.length !== 1) {
    throw new Error("Each memory view Show more click must render exactly one additional reveal step");
  }

  if (scrollIntoViewCalls.length !== 0) {
    throw new Error("Repeated memory view Show more clicks must not jump back to the original note heading");
  }

  pendingMarkdownRenders[0].complete();
  await flushPromises();
  longNoteView = renderedViews.at(-1);
  longNoteViewText = longNoteView.texts.join("\n");

  if (longNoteView.scrollTop !== 900 + revealAttempts) {
    throw new Error("Repeated memory view Show more clicks must preserve the previous reading position");
  }

  revealAttempts += 1;
}

if (!longNoteViewText.includes(longNoteEnd)) {
  throw new Error("Memory view repeated Show more clicks must eventually reveal the full note body");
}

if (!longNoteViewText.includes(longNotePreviewBoundary)) {
  throw new Error("Memory view repeated Show more clicks must reveal details beyond the compact preview");
}

if (longNoteView.buttons.includes("Show more")) {
  throw new Error("Fully revealed memory view must remove Show more when no hidden content remains");
}

if (!longNoteView.buttons.includes("Show less")) {
  throw new Error("Fully revealed memory view must keep Show less available");
}

pendingMarkdownRenders.length = 0;
longNoteView.scrollTop = 1200;
await clickViewButton("Show less");

if (pendingMarkdownRenders.length !== 1) {
  throw new Error("Long memory view Show less must start a compact Markdown render");
}

if (longNoteView.scrollTop !== 0) {
  throw new Error("Long memory view Show less must return the scroll container to the top");
}

pendingMarkdownRenders[0].complete();
await flushPromises();
longNoteView = renderedViews.at(-1);
longNoteViewText = longNoteView.texts.join("\n");

if (longNoteViewText.includes(longNoteEnd)) {
  throw new Error("Memory view Show less must return to the compact preview");
}

if (longNoteViewText.includes(longNotePreviewBoundary)) {
  throw new Error("Memory view Show less must hide details beyond the compact preview again");
}

if (!longNoteView.classes.some((className) => className.includes("gentle-memories-note-preview"))) {
  throw new Error("Collapsed memory view must restore the constrained preview class");
}

if (!longNoteView.classes.some((className) => className.includes("gentle-memories-view-scroll-collapsed"))) {
  throw new Error("Collapsed memory view must use the collapsed scroll state class");
}

if (!longNoteView.buttons.includes("Show more")) {
  throw new Error("Collapsed memory view must restore Show more");
}

const noteContentSourceIndex = mainSource.indexOf("const noteContentEl = scrollContainerEl.createDiv");
const actionRowSourceIndex = mainSource.indexOf("this.renderActionRow(scrollContainerEl");

if (noteContentSourceIndex === -1 || actionRowSourceIndex === -1 || actionRowSourceIndex < noteContentSourceIndex) {
  throw new Error("Memory view action row must render below the original note preview");
}

delayMarkdownRendering = false;
pendingMarkdownRenders.length = 0;

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
createdWorkspaceTabs.length = 0;
createdRightLeaves.length = 0;
globalThis.fetch = async () => {
  throw new Error("Unkeyed memory view AI action must not make a provider request");
};

try {
  const unkeyedAiViewPlugin = new GentleMemoriesPlugin(createMockApp([{
    path: "Memories/2024-04-02 Journal.md",
    basename: "2024-04-02 Journal",
    date: "2024-04-02",
    excerpt: "Memory view AI controls should clearly describe lead-in generation."
  }]));
  unkeyedAiViewPlugin.data = { settings: { showOnStartup: false, aiEnabled: true } };
  await unkeyedAiViewPlugin.onload();
  unkeyedAiViewPlugin.ribbonIcons.find((ribbonIcon) => ribbonIcon.icon === "sparkles")?.callback();
  await flushPromises();

  const unkeyedAiView = renderedViews.at(-1);

  if (!unkeyedAiView?.buttons.includes("Generate lead-in")) {
    throw new Error("Memory view AI action must say Generate lead-in before AI content exists");
  }

  if (unkeyedAiView.buttons.includes("Memories")) {
    throw new Error("Memory view AI action must not use the ambiguous Memories label");
  }

  await clickViewButton("Generate lead-in");

  if (!notices.some((notice) => notice.includes("Add an Openai key"))) {
    throw new Error("Unkeyed memory view Generate lead-in action must show the missing-key notice");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
renderedViews.length = 0;
openedFiles.length = 0;
createdWorkspaceTabs.length = 0;
createdRightLeaves.length = 0;
let keyedAiViewRequestCount = 0;
let resolveKeyedAiViewFetch;
globalThis.fetch = async () => new Promise((resolve) => {
  keyedAiViewRequestCount += 1;
  resolveKeyedAiViewFetch = () => resolve({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: "Generated memory view lead-in."
          }
        }]
      };
    }
  });
});

try {
  const keyedAiViewPlugin = new GentleMemoriesPlugin(createMockApp([{
    path: "Memories/2024-04-03 Journal.md",
    basename: "2024-04-03 Journal",
    date: "2024-04-03",
    excerpt: "Memory view loading controls should prevent duplicate generation requests."
  }]));
  keyedAiViewPlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: true,
      openAiApiKey: "test-api-key"
    }
  };
  await keyedAiViewPlugin.onload();
  keyedAiViewPlugin.ribbonIcons.find((ribbonIcon) => ribbonIcon.icon === "sparkles")?.callback();
  await flushPromises();

  let keyedAiView = renderedViews.at(-1);

  if (!keyedAiView?.buttons.includes("Generating...")) {
    throw new Error("Memory view AI action must say Generating... while the lead-in request is pending");
  }

  if (!keyedAiView.disabledButtons.includes("Generating...")) {
    throw new Error("Memory view AI action must be disabled while generation is pending");
  }

  await clickViewButton("Generating...");

  if (keyedAiViewRequestCount !== 1) {
    throw new Error("Memory view AI action must avoid duplicate requests while generation is pending");
  }

  resolveKeyedAiViewFetch();
  await flushPromises();
  keyedAiView = renderedViews.at(-1);

  if (!keyedAiView.texts.join("\n").includes("Generated memory view lead-in.")) {
    throw new Error("Memory view must render the generated AI lead-in");
  }

  if (!keyedAiView.buttons.includes("Regenerate")) {
    throw new Error("Memory view AI action must say Regenerate after AI content exists");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
let resolveReflectionOrderFetch;
globalThis.fetch = async () => new Promise((resolve) => {
  resolveReflectionOrderFetch = () => resolve({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: "Reflection shown before note body."
          }
        }]
      };
    }
  });
});

try {
  const reflectionOrderPlugin = new GentleMemoriesPlugin(createMockApp([{
    path: "Reflection/2024-07-02 Journal.md",
    basename: "2024-07-02 Journal",
    date: "2024-07-02",
    excerpt: "Rendered body text that should appear after the reflection."
  }]));
  reflectionOrderPlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: true,
      openAiApiKey: "test-api-key"
    }
  };
  await reflectionOrderPlugin.onload();
  reflectionOrderPlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();

  let renderedText = renderedModals[0].texts.join("\n");

  if (!renderedText.includes("Loading memory lead-in...")) {
    throw new Error("Automatic AI lead-in must show a loading state while waiting for the provider");
  }

  if (!renderedModals[0].classes.includes("gentle-memories-ai-loading")) {
    throw new Error("Automatic AI lead-in loading state must use a distinct loading class");
  }

  resolveReflectionOrderFetch();
  await flushPromises();

  renderedText = renderedModals[0].texts.join("\n");
  const reflectionIndex = renderedText.indexOf("Reflection shown before note body.");
  const bodyIndex = renderedText.indexOf("Rendered body text that should appear after the reflection.");

  if (reflectionIndex === -1 || bodyIndex === -1 || reflectionIndex > bodyIndex) {
    throw new Error("Automatic AI lead-in must render before the rich note content");
  }

  if (!renderedText.includes("Memory lead-in") || !renderedText.includes("Original note")) {
    throw new Error("Automatic AI lead-in must be visibly separated from the original note content");
  }

  if (!renderedModals[0].classes.includes("gentle-memories-ai-lead-in") ||
    !renderedModals[0].classes.includes("gentle-memories-note-content")) {
    throw new Error("Automatic AI lead-in and original note content must use separate containers");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const staleResolvers = [];
globalThis.fetch = async () => new Promise((resolve) => {
  const requestIndex = staleResolvers.length;
  staleResolvers.push(() => resolve({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: requestIndex === 0 ? "Stale first lead-in." : "Fresh second lead-in."
          }
        }]
      };
    }
  }));
});

try {
  const staleLeadInPlugin = new GentleMemoriesPlugin(createMockApp([
    {
      path: "Stale/2024-07-03 Journal.md",
      basename: "2024-07-03 Journal",
      date: "2024-07-03",
      excerpt: "First note text that should not receive a stale lead-in after Next."
    },
    {
      path: "Stale/2024-07-04 Journal.md",
      basename: "2024-07-04 Journal",
      date: "2024-07-04",
      excerpt: "Second note text that should receive the fresh lead-in."
    }
  ]));
  staleLeadInPlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: true,
      openAiApiKey: "test-api-key"
    }
  };
  await staleLeadInPlugin.onload();
  staleLeadInPlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();

  await clickModalButton("Next");
  await flushPromises();

  staleResolvers[0]?.();
  await flushPromises();

  let staleText = renderedModals[0].texts.join("\n");
  if (staleText.includes("Stale first lead-in.")) {
    throw new Error("Stale automatic AI result from a previous memory must not overwrite the current modal");
  }

  staleResolvers[1]?.();
  await flushPromises();

  staleText = renderedModals[0].texts.join("\n");
  if (!staleText.includes("Fresh second lead-in.")) {
    throw new Error("Current memory automatic AI result must still render after ignoring stale results");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const automaticStartupRequests = [];
globalThis.fetch = async (...args) => {
  automaticStartupRequests.push(args);

  return {
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: "Automatic startup lead-in."
          }
        }]
      };
    }
  };
};

try {
  const aiEnabledStartupPlugin = new GentleMemoriesPlugin(createMockApp());
  aiEnabledStartupPlugin.data = {
    settings: {
      showOnStartup: true,
      aiEnabled: true,
      openAiApiKey: "test-api-key"
    }
  };
  await aiEnabledStartupPlugin.onload();
  layoutCallbacks.forEach((callback) => callback());
  await flushPromises();
  assertMemoryModal("AI-enabled startup display must include the AI button and automatic lead-in", {
    expectAiButton: true
  });

  if (automaticStartupRequests.length !== 1) {
    throw new Error("AI-enabled startup display with an API key must automatically request one AI lead-in");
  }

  if (!renderedModals[0]?.texts.includes("Automatic startup lead-in.")) {
    throw new Error("AI-enabled startup display must show the automatically generated lead-in");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const disabledAiNetworkRequests = [];
globalThis.fetch = async (...args) => {
  disabledAiNetworkRequests.push(args);
  throw new Error("Network request occurred while AI was disabled");
};

try {
  const disabledAiStartupPlugin = new GentleMemoriesPlugin(createMockApp());
  disabledAiStartupPlugin.data = {
    settings: {
      showOnStartup: true,
      aiEnabled: false,
      openAiApiKey: "test-api-key"
    }
  };
  await disabledAiStartupPlugin.onload();
  layoutCallbacks.forEach((callback) => callback());
  await flushPromises();
  assertMemoryModal("AI-disabled startup display must omit the AI button even when an API key is saved");

  layoutCallbacks = [];
  notices.length = 0;
  renderedModals.length = 0;
  openedFiles.length = 0;
  const disabledAiManualPlugin = new GentleMemoriesPlugin(createMockApp());
  disabledAiManualPlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: false,
      openAiApiKey: "test-api-key"
    }
  };
  await disabledAiManualPlugin.onload();
  disabledAiManualPlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();
  assertMemoryModal("AI-disabled manual display must omit the AI button even when an API key is saved");

  if (disabledAiNetworkRequests.length !== 0) {
    throw new Error("No network request may occur while AI is disabled");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const aiPrivacyRequests = [];
const aiPrivacyVisibleText = "Allowed excerpt sentence with enough context. ".repeat(8);
const expectedAiExcerpt = aiPrivacyVisibleText.replace(/\s+/g, " ").trim().slice(0, 200).trim();
const aiPrivacyPath = "Private Vault/2024-05-10 Secret Journal.md";
const fullNoteSecret = "PRIVATE_FULL_NOTE_DETAIL_must_not_be_uploaded";
globalThis.fetch = async (...args) => {
  aiPrivacyRequests.push(args);

  return {
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: "A short reflection grounded in the excerpt."
          }
        }]
      };
    }
  };
};

try {
  const aiPrivacyPlugin = new GentleMemoriesPlugin(createMockApp([{
    path: aiPrivacyPath,
    basename: "2024-05-10 Secret Journal",
    date: "2024-05-10",
    excerpt: aiPrivacyVisibleText,
    extraContent: fullNoteSecret
  }]));
  aiPrivacyPlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: true,
      openAiApiKey: "test-api-key"
    },
    displayHistory: {
      shown: {
        [aiPrivacyPath]: {
          shownAt: "2026-04-20T00:00:00.000Z",
          contentHash: "history-secret-hash"
        }
      },
      aiCache: {
        "Private Vault/2024-05-10 Secret Journal.md:history-secret-hash": {
          text: "cached history must not be uploaded",
          generatedAt: "2026-04-20T00:00:00.000Z"
        }
      }
    }
  };
  await aiPrivacyPlugin.onload();
  aiPrivacyPlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();
  assertMemoryModal("AI privacy test must show a memory and automatically generate a lead-in", {
    expectAiButton: true,
    expectedTitle: "2024-05-10 Secret Journal",
    expectedDate: "2024-05-10",
    expectedExcerpt: expectedAiExcerpt
  });

  if (aiPrivacyRequests.length !== 1) {
    throw new Error("AI-enabled memory display with an API key must make exactly one automatic request");
  }

  const [_url, requestInit] = aiPrivacyRequests[0];
  if (_url !== "https://api.openai.com/v1/chat/completions") {
    throw new Error("OpenAI provider must send reflection requests to the OpenAI chat completions endpoint");
  }

  const body = String(requestInit?.body ?? "");

  if (!body.includes(expectedAiExcerpt)) {
    throw new Error("AI request payload must include the current excerpt");
  }

  for (const requiredPromptText of [
    "same primary language as the excerpt",
    "warm lead-in",
    "brief summary, reflection, encouragement, or gentle self-reflection question",
    "interested in rereading the note"
  ]) {
    if (!body.includes(requiredPromptText)) {
      throw new Error(`OpenAI prompt must guide warm same-language reading output: ${requiredPromptText}`);
    }
  }

  for (const forbiddenText of [
    aiPrivacyPath,
    "Private Vault",
    "Personal Vault",
    "2024-05-10 Secret Journal",
    fullNoteSecret,
    "displayHistory",
    "shownAt",
    "history-secret-hash",
    "cached history must not be uploaded"
  ]) {
    if (body.includes(forbiddenText)) {
      throw new Error(`AI request payload must not include private context: ${forbiddenText}`);
    }
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const claudeRequests = [];
globalThis.fetch = async (...args) => {
  claudeRequests.push(args);

  return {
    ok: true,
    status: 200,
    async json() {
      return {
        content: [{
          type: "text",
          text: "Claude reflection text."
        }]
      };
    }
  };
};

try {
  const claudePlugin = new GentleMemoriesPlugin(createMockApp());
  claudePlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: true,
      aiProvider: "claude",
      openAiApiKey: "openai-key-that-should-not-be-used",
      claudeApiKey: "claude-test-key"
    }
  };
  await claudePlugin.onload();
  claudePlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();

  if (claudeRequests.length !== 1) {
    throw new Error("Claude provider must make one automatic reflection request when AI is enabled and keyed");
  }

  const [claudeUrl, claudeInit] = claudeRequests[0];
  const claudeHeaders = claudeInit?.headers ?? {};
  const claudeBody = String(claudeInit?.body ?? "");

  if (claudeUrl !== "https://api.anthropic.com/v1/messages") {
    throw new Error("Claude provider must send reflection requests to the Anthropic messages endpoint");
  }

  if (claudeHeaders["x-api-key"] !== "claude-test-key") {
    throw new Error("Claude provider must use the configured Claude API key");
  }

  if (String(claudeHeaders.Authorization ?? "").includes("openai-key-that-should-not-be-used")) {
    throw new Error("Claude provider must not use the OpenAI API key");
  }

  if (!claudeBody.includes("A compact memory excerpt with enough detail to display.")) {
    throw new Error("Claude request payload must include the current excerpt");
  }

  for (const requiredPromptText of [
    "same primary language as the excerpt",
    "warm lead-in",
    "brief summary, reflection, encouragement, or gentle self-reflection question",
    "interested in rereading the note"
  ]) {
    if (!claudeBody.includes(requiredPromptText)) {
      throw new Error(`Claude prompt must guide warm same-language reading output: ${requiredPromptText}`);
    }
  }

  if (!renderedModals[0]?.texts.includes("Claude reflection text.")) {
    throw new Error("Claude provider must display the returned reflection text");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const aiCacheRequests = [];
const aiCachePath = "Cache/2024-06-01 Journal.md";
globalThis.fetch = async (...args) => {
  aiCacheRequests.push(args);

  return {
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: {
            content: "Cached reflection text."
          }
        }]
      };
    }
  };
};

try {
  const aiCachePlugin = new GentleMemoriesPlugin(createMockApp([{
    path: aiCachePath,
    basename: "2024-06-01 Journal",
    date: "2024-06-01",
    excerpt: "A cacheable memory excerpt with enough detail to display."
  }]));
  aiCachePlugin.data = {
    settings: {
      showOnStartup: false,
      aiEnabled: true,
      openAiApiKey: "test-api-key",
      cacheAiResponses: true
    }
  };
  await aiCachePlugin.onload();
  aiCachePlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();
  assertMemoryModal("AI cache test must show a memory and automatically generate a reflection", {
    expectAiButton: true,
    expectedTitle: "2024-06-01 Journal",
    expectedDate: "2024-06-01",
    expectedExcerpt: "A cacheable memory excerpt with enough detail to display."
  });

  if (aiCacheRequests.length !== 1) {
    throw new Error("Automatic AI cache miss must make one network request");
  }

  const aiCacheContentHash = aiCachePlugin.data?.displayHistory?.shown?.[aiCachePath]?.contentHash;
  const expectedAiCacheKey = `${aiCachePath}:${aiCacheContentHash}`;

  if (typeof aiCacheContentHash !== "string" || aiCacheContentHash.length === 0) {
    throw new Error("AI cache test must have a shown memory content hash");
  }

  if (aiCachePlugin.data?.displayHistory?.aiCache?.[expectedAiCacheKey]?.text !== "Cached reflection text.") {
    throw new Error("AI cache must persist reflections under ${path}:${contentHash}");
  }

  layoutCallbacks = [];
  notices.length = 0;
  renderedModals.length = 0;
  openedFiles.length = 0;
  aiCacheRequests.length = 0;
  const aiCacheHitPlugin = new GentleMemoriesPlugin(createMockApp([{
    path: aiCachePath,
    basename: "2024-06-01 Journal",
    date: "2024-06-01",
    excerpt: "A cacheable memory excerpt with enough detail to display."
  }]));
  aiCacheHitPlugin.data = aiCachePlugin.data;
  await aiCacheHitPlugin.onload();
  aiCacheHitPlugin.commands.find((command) => command.id === "show-memory")?.callback();
  await flushPromises();

  if (aiCacheRequests.length !== 0) {
    throw new Error("Automatic AI cache hit for ${path}:${contentHash} must not make a network request");
  }

  if (!renderedModals[0]?.texts.includes("Cached reflection text.")) {
    throw new Error("Automatic AI cache hit must show the cached reflection");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const enabledStartupPlugin = new GentleMemoriesPlugin(createMockApp());
enabledStartupPlugin.data = { settings: { showOnStartup: true } };
await enabledStartupPlugin.onload();

if (layoutCallbacks.length !== 1) {
  throw new Error("Startup display must be queued when showOnStartup is true");
}

if (notices.length !== 0) {
  throw new Error("Startup display must wait until layout is ready");
}

layoutCallbacks.forEach((callback) => callback());
await flushPromises();

if (notices.length !== 0) {
  throw new Error("Startup display must show a memory modal instead of the placeholder notice");
}

try {
  assertMemoryModal("Startup display must show a memory modal when showOnStartup is true");
} catch (error) {
  throw new Error("Startup display must show a memory notice when showOnStartup is true");
}

if (enabledStartupPlugin.data?.lastStartupMemoryShownAt !== fixedNow) {
  throw new Error("Startup display must record when a startup memory is shown");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const recentStartupPlugin = new GentleMemoriesPlugin(createMockApp());
recentStartupPlugin.data = {
  settings: {
    showOnStartup: true,
    minDaysBetweenStartupShows: 3
  },
  lastStartupMemoryShownAt: fixedNow - (2 * msPerDay)
};
await recentStartupPlugin.onload();

if (layoutCallbacks.length !== 0) {
  throw new Error("Startup display must not be queued before minDaysBetweenStartupShows has elapsed");
}

if (notices.length !== 0) {
  throw new Error("Startup display must not show a notice before minDaysBetweenStartupShows has elapsed");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const elapsedStartupPlugin = new GentleMemoriesPlugin(createMockApp());
elapsedStartupPlugin.data = {
  settings: {
    showOnStartup: true,
    minDaysBetweenStartupShows: 3
  },
  lastStartupMemoryShownAt: fixedNow - (4 * msPerDay)
};
await elapsedStartupPlugin.onload();

if (layoutCallbacks.length !== 1) {
  throw new Error("Startup display must be queued after minDaysBetweenStartupShows has elapsed");
}

layoutCallbacks.forEach((callback) => callback());
await flushPromises();

if (notices.length !== 0) {
  throw new Error("Startup display must show a memory modal instead of the placeholder notice after minDaysBetweenStartupShows has elapsed");
}

try {
  assertMemoryModal("Startup display must show a memory modal after minDaysBetweenStartupShows has elapsed");
} catch (error) {
  throw new Error("Startup display must show a memory notice after minDaysBetweenStartupShows has elapsed");
}

Date.now = originalDateNow;

console.log("Smoke test passed");
