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
  "API key",
  "Cache AI responses"
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
  "apiKey",
  "cacheAiResponses"
];

for (const settingKey of requiredSettingKeys) {
  if (!mainSource.includes(settingKey)) {
    throw new Error(`main.ts must persist the ${settingKey} setting`);
  }
}

if (!mainSource.includes("text.inputEl.type = \"number\"")) {
  throw new Error("main.ts must use a numeric input for minimum days between startup shows");
}

if (!mainSource.includes("text.inputEl.type = \"password\"")) {
  throw new Error("main.ts must use a password-style input for the API key");
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
  }

  empty() {
    this.texts.length = 0;
    this.buttons.length = 0;
    this.buttonHandlers.clear();
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

class MockSetting {
  constructor(containerEl) {
    this.containerEl = containerEl;
  }

  addButton(callback) {
    callback(new MockButton(this.containerEl));
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
          entry.excerpt
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

  if (expectAiButton && !buttons.includes("Generate reflection")) {
    throw new Error("Shown memory must include the Generate reflection button when AI is enabled");
  }

  if (!expectAiButton && buttons.includes("Generate reflection")) {
    throw new Error("Shown memory must omit the Generate reflection button when AI is disabled");
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
