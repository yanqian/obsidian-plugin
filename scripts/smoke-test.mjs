import fs from "fs";

const port = Number.parseInt(process.env.SMOKE_PORT ?? "4173", 10);
const requiredFiles = ["manifest.json", "main.ts", "main.js", "feature_list.json", "progress.md"];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const mainSource = fs.readFileSync("main.ts", "utf8");
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

const response = await fetch(`http://127.0.0.1:${port}/health`);

if (!response.ok) {
  throw new Error(`Smoke service returned ${response.status}`);
}

const body = await response.json();

if (body.ok !== true) {
  throw new Error("Smoke service health response was not ok");
}

console.log("Smoke test passed");
