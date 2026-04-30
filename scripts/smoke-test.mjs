import fs from "fs";
import Module, { createRequire } from "module";

const port = Number.parseInt(process.env.SMOKE_PORT ?? "4173", 10);
const requiredFiles = ["manifest.json", "main.ts", "main.js", "feature_list.json", "progress.md"];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const mainSource = fs.readFileSync("main.ts", "utf8");
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

if (!mainSource.includes('const SHOW_MEMORY_COMMAND_ID = "show-memory";')) {
  throw new Error("main.ts must define the show-memory command id");
}

if (!mainSource.includes('const SHOW_MEMORY_COMMAND_NAME = "Show memory";')) {
  throw new Error("main.ts must define the Show memory command name");
}

if (!mainSource.includes("this.addCommand({")) {
  throw new Error("main.ts must register an Obsidian command");
}

if (!mainSource.includes("id: SHOW_MEMORY_COMMAND_ID") || !mainSource.includes("name: SHOW_MEMORY_COMMAND_NAME")) {
  throw new Error("main.ts must register the Gentle Memories: Show memory command");
}

const requiredSettingNames = [
  "Journal tags",
  "Show on startup",
  "Minimum days between startup shows",
  "Enable AI",
  "AI provider",
  "OpenAI API key",
  "Claude API key",
  "Cache AI responses",
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
const openedFiles = [];
let layoutCallbacks = [];

class MockNotice {
  constructor(message) {
    notices.push(message);
  }
}

class MockElement {
  constructor() {
    this.texts = [];
    this.buttons = [];
    this.buttonHandlers = new Map();
    this.settings = [];
  }

  empty() {
    this.texts.length = 0;
    this.buttons.length = 0;
    this.buttonHandlers.clear();
    this.settings.length = 0;
  }

  createEl(_tagName, options = {}) {
    if (typeof options.text === "string") {
      this.texts.push(options.text);
    }

    return new MockElement();
  }

  createDiv() {
    return this;
  }
}

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
    this.settingTabs = [];
    this.data = undefined;
  }

  addCommand(command) {
    this.commands.push(command);
  }

  addSettingTab(settingTab) {
    this.settingTabs.push(settingTab);
  }

  async loadData() {
    return this.data;
  }

  async saveData(data) {
    this.data = data;
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

  return {
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
      onLayoutReady(callback) {
        layoutCallbacks.push(callback);
      },
      getLeaf() {
        return {
          async openFile(file) {
            openedFiles.push(file);
          }
        };
      }
    }
  };
}

Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      getAllTags(cache) {
        return cache?.__allTags;
      },
      MarkdownRenderer: {
        render(_app, markdown, element) {
          if (typeof markdown === "string") {
            element.texts.push(markdown);
          }

          return Promise.resolve();
        }
      },
      Modal: MockModal,
      Notice: MockNotice,
      Plugin: MockPlugin,
      PluginSettingTab: MockPluginSettingTab,
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
  for (let index = 0; index < 10; index += 1) {
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

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
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

if (!settingNames().includes("OpenAI API key")) {
  throw new Error("OpenAI provider settings must show the OpenAI API key input");
}

if (settingNames().includes("Claude API key")) {
  throw new Error("OpenAI provider settings must hide the Claude API key input");
}

await providerDropdown()?.callback("claude");
await flushPromises();

if (!settingNames().includes("Claude API key")) {
  throw new Error("Claude provider settings must show the Claude API key input after switching providers");
}

if (settingNames().includes("OpenAI API key")) {
  throw new Error("Claude provider settings must hide the OpenAI API key input after switching providers");
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

  debugShowMemoryHandler();
  await flushPromises();

  assertMemoryModal("Debug show-memory control must show a memory immediately", {
    expectAiButton: true,
    expectedTitle: "2024-08-01 Journal",
    expectedDate: "2024-08-01",
    expectedExcerpt: "A debug-safe memory excerpt with enough detail to display."
  });

  const debugLogTextBeforeAi = JSON.stringify(debugLogs);

  for (const requiredText of [
    "journal-note-discovery",
    "candidateNoteCount",
    "memory-filter-outcomes",
    "memory-selection",
    "Logs/2024-08-01 Journal.md"
  ]) {
    if (!debugLogTextBeforeAi.includes(requiredText)) {
      throw new Error(`Debug logging must include ${requiredText}`);
    }
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

  await clickModalButton("Memories");

  const debugLogTextAfterAi = JSON.stringify(debugLogs);

  if (!debugLogTextAfterAi.includes("ai-cache") || !debugLogTextAfterAi.includes("miss")) {
    throw new Error("Debug logging must include AI cache misses");
  }

  debugLogs.length = 0;
  renderedModals.length = 0;
  debugShowMemoryHandler();
  await flushPromises();
  await clickModalButton("Memories");

  const debugLogTextAfterCacheHit = JSON.stringify(debugLogs);

  if (!debugLogTextAfterCacheHit.includes("ai-cache") || !debugLogTextAfterCacheHit.includes("hit")) {
    throw new Error("Debug logging must include AI cache hits");
  }

  for (const forbiddenDebugText of [
    "Personal Vault",
    "debug-api-key",
    "FULL_DEBUG_NOTE_SECRET_must_not_be_logged",
    "Authorization",
    "x-api-key"
  ]) {
    if (debugLogTextBeforeAi.includes(forbiddenDebugText) ||
      debugLogTextAfterAi.includes(forbiddenDebugText) ||
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
const aiEnabledManualPlugin = new GentleMemoriesPlugin(createMockApp());
aiEnabledManualPlugin.data = { settings: { showOnStartup: false, aiEnabled: true } };
await aiEnabledManualPlugin.onload();
aiEnabledManualPlugin.commands.find((command) => command.id === "show-memory")?.callback();
await flushPromises();
assertMemoryModal("Manual show memory command must include AI button when AI is enabled", { expectAiButton: true });

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

if (!longNoteModal.buttons.includes("Show more")) {
  throw new Error("Collapsed rich memory display must restore Show more");
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
globalThis.fetch = async () => ({
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
  await clickModalButton("Memories");

  const renderedText = renderedModals[0].texts.join("\n");
  const reflectionIndex = renderedText.indexOf("Reflection shown before note body.");
  const bodyIndex = renderedText.indexOf("Rendered body text that should appear after the reflection.");

  if (reflectionIndex === -1 || bodyIndex === -1 || reflectionIndex > bodyIndex) {
    throw new Error("AI reading prompt must render before the rich note content after generation");
  }
} finally {
  globalThis.fetch = originalFetch;
}

layoutCallbacks = [];
notices.length = 0;
renderedModals.length = 0;
openedFiles.length = 0;
const preClickNetworkRequests = [];
globalThis.fetch = async (...args) => {
  preClickNetworkRequests.push(args);
  throw new Error("Network request occurred before Memories was clicked");
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
  assertMemoryModal("AI-enabled startup display must include the AI button before any reflection request", {
    expectAiButton: true
  });

  if (preClickNetworkRequests.length !== 0) {
    throw new Error("No network request may occur before the user clicks Memories");
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
  assertMemoryModal("AI privacy test must show a memory before generating a reflection", {
    expectAiButton: true,
    expectedTitle: "2024-05-10 Secret Journal",
    expectedDate: "2024-05-10",
    expectedExcerpt: expectedAiExcerpt
  });

  await clickModalButton("Memories");

  if (aiPrivacyRequests.length !== 1) {
    throw new Error("Memories must make exactly one request after the user clicks");
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
  await clickModalButton("Memories");

  if (claudeRequests.length !== 1) {
    throw new Error("Claude provider must make one reflection request after the user clicks");
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
  assertMemoryModal("AI cache test must show a memory before generating a reflection", {
    expectAiButton: true,
    expectedTitle: "2024-06-01 Journal",
    expectedDate: "2024-06-01",
    expectedExcerpt: "A cacheable memory excerpt with enough detail to display."
  });

  await clickModalButton("Memories");

  if (aiCacheRequests.length !== 1) {
    throw new Error("AI cache miss must make one network request");
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
  await clickModalButton("Memories");

  if (aiCacheRequests.length !== 0) {
    throw new Error("AI cache hit for ${path}:${contentHash} must not make a network request");
  }

  if (!renderedModals[0]?.texts.includes("Cached reflection text.")) {
    throw new Error("AI cache hit must show the cached reflection");
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

const response = await fetch(`http://127.0.0.1:${port}/health`);

if (!response.ok) {
  throw new Error(`Smoke service returned ${response.status}`);
}

const body = await response.json();

if (body.ok !== true) {
  throw new Error("Smoke service health response was not ok");
}

console.log("Smoke test passed");
