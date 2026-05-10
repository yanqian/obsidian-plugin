import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";

const originalModuleLoad = Module._load;

Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      getAllTags(cache) {
        return cache?.__allTags;
      },
      MarkdownRenderer: { render: () => Promise.resolve() },
      ItemView: class {},
      Modal: class {},
      Notice: class {},
      Plugin: class {},
      PluginSettingTab: class {},
      requestUrl: () => Promise.resolve({ status: 200, json: {}, text: "" }),
      Setting: class {}
    };
  }

  return originalModuleLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
const pluginModule = require("../main.js");
Module._load = originalModuleLoad;

const {
  canShowStartupMemoryAt,
  createContentHash,
  createExcerpt,
  createMarkdownBody,
  createMarkdownPreview,
  deriveDate,
  deriveTitle,
  normalizeDateValue,
  normalizeDisplayHistory,
  normalizeJournalTags,
  normalizeSettings,
  noteHasConfiguredJournalTag,
  stripFrontmatter,
  toComparableTag
} = pluginModule;

assert.equal(toComparableTag(" #Journal "), "journal");

assert.deepEqual(normalizeJournalTags([" #Journal ", "diary", "", 42]), ["Journal", "diary"]);
assert.deepEqual(normalizeJournalTags([]), ["journal", "diary", "note"]);
assert.deepEqual(normalizeJournalTags("journal"), ["journal", "diary", "note"]);

assert.equal(noteHasConfiguredJournalTag(null, ["journal"]), false);
assert.equal(noteHasConfiguredJournalTag({ __allTags: ["#project"] }, ["journal"]), false);
assert.equal(noteHasConfiguredJournalTag({ __allTags: ["#Journal/Sub"] }, ["journal/sub"]), true);
assert.equal(noteHasConfiguredJournalTag({ __allTags: ["#diary"] }, ["journal", "#diary"]), true);

assert.equal(normalizeDateValue(new Date("2024-01-02T03:04:05.000Z")), "2024-01-02");
assert.equal(normalizeDateValue(Date.UTC(2024, 2, 4)), "2024-03-04");
assert.equal(normalizeDateValue("created on 2025-06-07"), "2025-06-07");
assert.equal(normalizeDateValue("June 7, 2025"), undefined);

assert.equal(deriveTitle({ path: "Folder/Fallback.md", basename: "" }), "Fallback");
assert.equal(deriveTitle({ path: "Folder/Note.md", basename: "Custom title" }), "Custom title");
assert.equal(
  deriveDate({ path: "Notes/2023-09-10 Entry.md", stat: { ctime: Date.UTC(2022, 0, 1) } }, null),
  "2023-09-10"
);
assert.equal(
  deriveDate({ path: "Notes/Entry.md", stat: { ctime: Date.UTC(2022, 0, 1) } }, { frontmatter: { date: "2024-05-06" } }),
  "2024-05-06"
);

const rawMarkdown = [
  "---",
  "date: 2024-01-01",
  "---",
  "# Hidden heading",
  "%% private comment %%",
  "#journal #diary",
  "  A   memory line  ",
  "continues here."
].join("\n");

assert.equal(stripFrontmatter(rawMarkdown).startsWith("# Hidden heading"), true);
assert.equal(createMarkdownBody(rawMarkdown).startsWith("# Hidden heading"), true);
assert.equal(createExcerpt(rawMarkdown), "A memory line continues here.");
assert.equal(createExcerpt("# Empty\n#journal\n%% comment %%"), "");
assert.equal(createExcerpt(`A ${"long ".repeat(80)}`).length, 200);

const shortMarkdown = "Short note";
assert.equal(createMarkdownPreview(shortMarkdown), shortMarkdown);
const longMarkdown = `${"Opening sentence. ".repeat(20)}\n\nHidden paragraph.`;
const preview = createMarkdownPreview(longMarkdown);
assert.equal(preview.endsWith("\n\n..."), true);
assert.equal(preview.includes("Hidden paragraph."), false);

assert.equal(createContentHash("same"), createContentHash("same"));
assert.notEqual(createContentHash("same"), createContentHash("different"));
assert.match(createContentHash("same"), /^[0-9a-z]+$/);

const normalizedSettings = normalizeSettings({
  journalTags: ["#Daily"],
  minDaysBetweenStartupShows: 2.9,
  aiEnabled: true,
  aiProvider: "claude",
  apiKey: " legacy-openai ",
  openAiApiKey: " saved-openai ",
  claudeApiKey: " saved-claude ",
  cacheAiResponses: false,
  debugMode: true
});

assert.deepEqual(normalizedSettings.journalTags, ["Daily"]);
assert.equal(normalizedSettings.minDaysBetweenStartupShows, 2);
assert.equal(normalizedSettings.aiEnabled, true);
assert.equal(normalizedSettings.aiProvider, "claude");
assert.equal(normalizedSettings.openAiApiKey, "saved-openai");
assert.equal(normalizedSettings.claudeApiKey, "saved-claude");
assert.equal(normalizedSettings.cacheAiResponses, false);
assert.equal(normalizedSettings.debugMode, true);
assert.equal(normalizeSettings({ minDaysBetweenStartupShows: -1 }).minDaysBetweenStartupShows, 1);
assert.equal(normalizeSettings({ apiKey: " legacy " }).openAiApiKey, "legacy");

assert.deepEqual(normalizeDisplayHistory({
  shown: {
    "valid.md": { shownAt: "2026-01-01T00:00:00.000Z", contentHash: "abc" },
    "invalid.md": { shownAt: 123, contentHash: "abc" }
  },
  aiCache: {
    "valid.md:abc": { text: "Cached", generatedAt: "2026-01-01T00:00:00.000Z" },
    "invalid.md:def": { text: "Cached" }
  }
}), {
  shown: {
    "valid.md": { shownAt: "2026-01-01T00:00:00.000Z", contentHash: "abc" }
  },
  aiCache: {
    "valid.md:abc": { text: "Cached", generatedAt: "2026-01-01T00:00:00.000Z" }
  }
});

const now = Date.UTC(2026, 0, 10);
assert.equal(canShowStartupMemoryAt(now, 1, undefined), true);
assert.equal(canShowStartupMemoryAt(now, 0, now), true);
assert.equal(canShowStartupMemoryAt(now, 2, now - 3 * 24 * 60 * 60 * 1000), true);
assert.equal(canShowStartupMemoryAt(now, 2, now - 1 * 24 * 60 * 60 * 1000), false);

console.log("Unit tests passed.");
