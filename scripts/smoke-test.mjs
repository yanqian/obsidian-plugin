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
let layoutCallbacks = [];

class MockNotice {
  constructor(message) {
    notices.push(message);
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

class MockSetting {}

function createMockApp() {
  const markdownFiles = [{ path: "Journal.md" }];

  return {
    vault: {
      getMarkdownFiles() {
        return markdownFiles;
      }
    },
    metadataCache: {
      getFileCache() {
        return { __allTags: ["#journal"] };
      }
    },
    workspace: {
      onLayoutReady(callback) {
        layoutCallbacks.push(callback);
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

const configuredTags = ["journal", "diary", "note"];

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
const disabledStartupPlugin = new GentleMemoriesPlugin(createMockApp());
disabledStartupPlugin.data = { settings: { showOnStartup: false } };
await disabledStartupPlugin.onload();

if (layoutCallbacks.length !== 0) {
  throw new Error("Startup display must not be queued when showOnStartup is false");
}

if (notices.length !== 0) {
  throw new Error("Startup display must not show a notice when showOnStartup is false");
}

layoutCallbacks = [];
notices.length = 0;
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

if (notices.length !== 1 || !notices[0].includes("Gentle Memories found 1 journal note")) {
  throw new Error("Startup display must show a memory notice when showOnStartup is true");
}

const response = await fetch(`http://127.0.0.1:${port}/health`);

if (!response.ok) {
  throw new Error(`Smoke service returned ${response.status}`);
}

const body = await response.json();

if (body.ok !== true) {
  throw new Error("Smoke service health response was not ok");
}

console.log("Smoke test passed");
