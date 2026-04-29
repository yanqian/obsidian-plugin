import { getAllTags, Modal, Notice, Plugin, PluginSettingTab, Setting, type CachedMetadata, type TFile } from "obsidian";

interface PluginSettings {
  journalTags: string[];
  showOnStartup: boolean;
  minDaysBetweenStartupShows: number;
  aiEnabled: boolean;
  aiProvider: AiProvider;
  openAiApiKey?: string;
  claudeApiKey?: string;
  cacheAiResponses: boolean;
  debugMode: boolean;
}

interface PluginData {
  settings?: Partial<PluginSettings>;
  lastStartupMemoryShownAt?: number;
  displayHistory?: Partial<DisplayHistory>;
}

interface DisplayHistory {
  shown: Record<string, DisplayHistoryEntry>;
  aiCache: Record<string, AiCacheEntry>;
}

interface DisplayHistoryEntry {
  shownAt: string;
  contentHash: string;
}

interface AiCacheEntry {
  text: string;
  generatedAt: string;
}

interface MemoryEntry {
  path: string;
  sourceFile: TFile;
  title: string;
  date?: string;
  excerpt: string;
  contentHash: string;
}

interface AiReflectionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ClaudeReflectionResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

type AiProvider = "openai" | "claude";

const DEFAULT_SETTINGS: PluginSettings = {
  journalTags: ["journal", "diary", "note"],
  showOnStartup: true,
  minDaysBetweenStartupShows: 1,
  aiEnabled: false,
  aiProvider: "openai",
  openAiApiKey: undefined,
  claudeApiKey: undefined,
  cacheAiResponses: true,
  debugMode: false
};

const DEFAULT_DISPLAY_HISTORY: DisplayHistory = {
  shown: {},
  aiCache: {}
};

const SHOW_MEMORY_COMMAND_ID = "show-memory";
const SHOW_MEMORY_COMMAND_NAME = "Show memory";
const OPENAI_REFLECTION_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_REFLECTION_MODEL = "gpt-4o-mini";
const CLAUDE_REFLECTION_ENDPOINT = "https://api.anthropic.com/v1/messages";
const CLAUDE_REFLECTION_MODEL = "claude-3-5-haiku-latest";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toComparableTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function normalizeJournalTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SETTINGS.journalTags];
  }

  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

  return tags.length > 0 ? tags : [...DEFAULT_SETTINGS.journalTags];
}

export function noteHasConfiguredJournalTag(cache: CachedMetadata | null, journalTags: string[]): boolean {
  if (!cache) {
    return false;
  }

  const configuredTags = new Set(normalizeJournalTags(journalTags).map(toComparableTag));
  const noteTags = getAllTags(cache)?.map(toComparableTag) ?? [];

  return noteTags.some((tag) => configuredTags.has(tag));
}

function normalizeSettings(value: unknown): PluginSettings {
  const saved = value && typeof value === "object" ? value as Partial<PluginSettings> : {};
  const minDays = Number(saved.minDaysBetweenStartupShows);
  const legacyApiKey = typeof (saved as { apiKey?: unknown }).apiKey === "string"
    ? (saved as { apiKey?: string }).apiKey?.trim()
    : undefined;
  const openAiApiKey = typeof saved.openAiApiKey === "string" && saved.openAiApiKey.trim() !== ""
    ? saved.openAiApiKey.trim()
    : legacyApiKey || undefined;
  const claudeApiKey = typeof saved.claudeApiKey === "string" && saved.claudeApiKey.trim() !== ""
    ? saved.claudeApiKey.trim()
    : undefined;

  return {
    journalTags: normalizeJournalTags(saved.journalTags),
    showOnStartup: typeof saved.showOnStartup === "boolean" ? saved.showOnStartup : DEFAULT_SETTINGS.showOnStartup,
    minDaysBetweenStartupShows: Number.isFinite(minDays) && minDays >= 0
      ? Math.floor(minDays)
      : DEFAULT_SETTINGS.minDaysBetweenStartupShows,
    aiEnabled: typeof saved.aiEnabled === "boolean" ? saved.aiEnabled : DEFAULT_SETTINGS.aiEnabled,
    aiProvider: saved.aiProvider === "claude" ? "claude" : DEFAULT_SETTINGS.aiProvider,
    openAiApiKey,
    claudeApiKey,
    cacheAiResponses: typeof saved.cacheAiResponses === "boolean"
      ? saved.cacheAiResponses
      : DEFAULT_SETTINGS.cacheAiResponses,
    debugMode: typeof saved.debugMode === "boolean" ? saved.debugMode : DEFAULT_SETTINGS.debugMode
  };
}

function normalizeDisplayHistory(value: unknown): DisplayHistory {
  const saved = value && typeof value === "object" ? value as Partial<DisplayHistory> : {};
  const shown: DisplayHistory["shown"] = {};
  const aiCache: DisplayHistory["aiCache"] = {};

  if (saved.shown && typeof saved.shown === "object") {
    for (const [path, entry] of Object.entries(saved.shown)) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.shownAt === "string" &&
        typeof entry.contentHash === "string"
      ) {
        shown[path] = {
          shownAt: entry.shownAt,
          contentHash: entry.contentHash
        };
      }
    }
  }

  if (saved.aiCache && typeof saved.aiCache === "object") {
    for (const [key, entry] of Object.entries(saved.aiCache)) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.text === "string" &&
        typeof entry.generatedAt === "string"
      ) {
        aiCache[key] = {
          text: entry.text,
          generatedAt: entry.generatedAt
        };
      }
    }
  }

  return { shown, aiCache };
}

function deriveTitle(file: TFile): string {
  const basename = typeof file.basename === "string" && file.basename.trim() !== ""
    ? file.basename
    : file.path.split("/").pop()?.replace(/\.md$/i, "");

  return basename ?? file.path;
}

function deriveDate(file: TFile, cache: CachedMetadata | null): string | undefined {
  const frontmatterDate = normalizeDateValue(cache?.frontmatter?.date);

  if (frontmatterDate) {
    return frontmatterDate;
  }

  const filenameDate = file.path.split("/").pop()?.match(/\d{4}-\d{2}-\d{2}/)?.[0];

  if (filenameDate) {
    return filenameDate;
  }

  return normalizeDateValue(file.stat?.ctime);
}

function normalizeDateValue(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
}

function createExcerpt(markdown: string): string {
  const withoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, "");
  const withoutComments = withoutFrontmatter.replace(/%%[\s\S]*?%%/g, "");
  const withoutHeadings = withoutComments.replace(/^\s{0,3}#{1,6}\s.*$/gm, "");
  const withoutTagOnlyLines = withoutHeadings
    .split(/\r?\n/)
    .filter((line) => !/^\s*(#[\p{L}\p{N}_/-]+\s*)+$/u.test(line))
    .join("\n");

  return withoutTagOnlyLines.replace(/\s+/g, " ").trim().slice(0, 200).trim();
}

function createContentHash(value: string): string {
  let hash = 0;

  for (const character of value) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }

  return Math.abs(hash).toString(36);
}

export default class GentleMemoriesPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private displayHistory: DisplayHistory = DEFAULT_DISPLAY_HISTORY;
  private lastStartupMemoryShownAt: number | undefined;

  async onload(): Promise<void> {
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

  discoverJournalNotes(): TFile[] {
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

  async showMemory(options: { showNotice?: boolean } = {}): Promise<boolean> {
    const showNotice = options.showNotice ?? true;
    const memory = await this.selectMemory();

    if (memory) {
      new MemoryModal(
        this.app,
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
      new Notice("No journal notes found for the configured tags.");
    }

    return false;
  }

  private async selectMemory(excludedPath?: string): Promise<MemoryEntry | null> {
    const journalNotes = this.discoverJournalNotes();
    const memories: MemoryEntry[] = [];
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

    const eligibleMemories = excludedPath && memories.some((memory) => memory.path !== excludedPath)
      ? memories.filter((memory) => memory.path !== excludedPath)
      : memories;
    const neverShownMemories = eligibleMemories.filter((memory) => !this.displayHistory.shown[memory.path]);
    const selectableMemories = neverShownMemories.length > 0 ? neverShownMemories : eligibleMemories;

    const selectedMemory = selectableMemories[0] ?? null;
    this.debugLog("memory-selection", {
      selected: Boolean(selectedMemory),
      selectedPath: selectedMemory?.path,
      eligibleMemoryCount: eligibleMemories.length,
      neverShownMemoryCount: neverShownMemories.length
    });

    return selectedMemory;
  }

  showManualMemory(): void {
    void this.showMemory();
  }

  private queueStartupMemoryDisplay(): void {
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

  private canShowStartupMemory(now: number): boolean {
    if (this.settings.minDaysBetweenStartupShows <= 0 || this.lastStartupMemoryShownAt === undefined) {
      return true;
    }

    const elapsedDays = (now - this.lastStartupMemoryShownAt) / MS_PER_DAY;
    return elapsedDays >= this.settings.minDaysBetweenStartupShows;
  }

  private async recordStartupMemoryShown(shownAt: number): Promise<void> {
    this.lastStartupMemoryShownAt = shownAt;
    await this.savePluginData();
  }

  private async recordMemoryShown(memory: MemoryEntry, shownAt: number): Promise<void> {
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

  async loadSettings(): Promise<void> {
    const saved = await this.loadData() as PluginData | undefined;
    this.settings = normalizeSettings(saved?.settings);
    this.displayHistory = normalizeDisplayHistory(saved?.displayHistory);

    const lastStartupMemoryShownAt = Number(saved?.lastStartupMemoryShownAt);
    this.lastStartupMemoryShownAt = Number.isFinite(lastStartupMemoryShownAt) && lastStartupMemoryShownAt >= 0
      ? lastStartupMemoryShownAt
      : undefined;
  }

  async saveSettings(): Promise<void> {
    await this.savePluginData();
  }

  private async savePluginData(): Promise<void> {
    await this.saveData({
      settings: this.settings,
      lastStartupMemoryShownAt: this.lastStartupMemoryShownAt,
      displayHistory: this.displayHistory
    });
  }

  private async createMemoryEntry(file: TFile): Promise<MemoryEntry | null> {
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

  private getAiCacheKey(memory: MemoryEntry): string {
    return `${memory.path}:${memory.contentHash}`;
  }

  private async generateReflection(memory: MemoryEntry): Promise<string | null> {
    const apiKey = this.getSelectedApiKey();

    if (!apiKey) {
      new Notice(`Add a ${this.getSelectedProviderName()} API key in Gentle Memories settings to generate reflections.`);
      return null;
    }

    const cacheKey = this.getAiCacheKey(memory);
    const cachedReflection = this.settings.cacheAiResponses
      ? this.displayHistory.aiCache[cacheKey]
      : undefined;

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
      new Notice("Could not generate reflection. Try again later.");
      return null;
    }
  }

  private getSelectedApiKey(): string | undefined {
    return this.settings.aiProvider === "claude"
      ? this.settings.claudeApiKey
      : this.settings.openAiApiKey;
  }

  private getSelectedProviderName(): string {
    return this.settings.aiProvider === "claude" ? "Claude" : "OpenAI";
  }

  private async requestReflection(excerpt: string, apiKey: string): Promise<Response> {
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

  private async readReflection(response: Response): Promise<string | undefined> {
    if (this.settings.aiProvider === "claude") {
      const data = await response.json() as ClaudeReflectionResponse;
      return data.content
        ?.find((content) => content.type === "text" && typeof content.text === "string")
        ?.text
        ?.trim();
    }

    const data = await response.json() as AiReflectionResponse;
    return data.choices?.[0]?.message?.content?.trim();
  }

  private debugLog(event: string, details: Record<string, boolean | number | string | undefined>): void {
    if (!this.settings.debugMode) {
      return;
    }

    console.debug("[Gentle Memories debug]", event, details);
  }
}

class MemoryModal extends Modal {
  constructor(
    app: GentleMemoriesPlugin["app"],
    private memory: MemoryEntry,
    private readonly aiEnabled: boolean,
    private readonly selectNextMemory: (currentPath: string) => Promise<MemoryEntry | null>,
    private readonly recordMemoryShown: (memory: MemoryEntry) => Promise<void>,
    private readonly generateReflection: (memory: MemoryEntry) => Promise<string | null>
  ) {
    super(app);
  }

  private reflectionText: string | undefined;

  onOpen(): void {
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

    if (this.reflectionText) {
      contentEl.createEl("p", {
        cls: "gentle-memories-reflection",
        text: this.reflectionText
      });
    }

    const buttonContainer = contentEl.createDiv({ cls: "gentle-memories-buttons" });
    const buttons = new Setting(buttonContainer)
      .addButton((button) => button
        .setButtonText("Open note")
        .onClick(() => {
          void this.openSourceNote();
        }))
      .addButton((button) => button
        .setButtonText("Next")
        .onClick(() => {
          void this.showNextMemory();
        }))
      .addButton((button) => button.setButtonText("Close").onClick(() => this.close()));

    if (this.aiEnabled) {
      buttons.addButton((button) => button
        .setButtonText("Generate reflection")
        .onClick(() => {
          void this.showReflection();
        }));
    }
  }

  private async openSourceNote(): Promise<void> {
    await this.app.workspace.getLeaf(false).openFile(this.memory.sourceFile);
    this.close();
  }

  private async showNextMemory(): Promise<void> {
    const nextMemory = await this.selectNextMemory(this.memory.path);

    if (nextMemory) {
      this.memory = nextMemory;
      this.reflectionText = undefined;
      this.onOpen();
      await this.recordMemoryShown(nextMemory);
    }
  }

  private async showReflection(): Promise<void> {
    const reflection = await this.generateReflection(this.memory);

    if (reflection) {
      this.reflectionText = reflection;
      this.onOpen();
    }
  }
}

class GentleMemoriesSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: GentleMemoriesPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Gentle Memories" });

    new Setting(containerEl)
      .setName("Journal tags")
      .setDesc("Comma-separated tags used to identify journal notes.")
      .addText((text) => {
        text
          .setPlaceholder("journal, diary, note")
          .setValue(this.plugin.settings.journalTags.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.journalTags = normalizeJournalTags(value.split(","));
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Show on startup")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.showOnStartup = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Minimum days between startup shows")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "1";
        text
          .setPlaceholder("1")
          .setValue(String(this.plugin.settings.minDaysBetweenStartupShows))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.minDaysBetweenStartupShows = Number.isFinite(parsed) && parsed >= 0
              ? parsed
              : DEFAULT_SETTINGS.minDaysBetweenStartupShows;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Enable AI")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.aiEnabled)
          .onChange(async (value) => {
            this.plugin.settings.aiEnabled = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("AI provider")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("openai", "OpenAI")
          .addOption("claude", "Claude")
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (value) => {
            this.plugin.settings.aiProvider = value === "claude" ? "claude" : "openai";
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (this.plugin.settings.aiProvider === "claude") {
      new Setting(containerEl)
        .setName("Claude API key")
        .addText((text) => {
          text.inputEl.type = "password";
          text
            .setValue(this.plugin.settings.claudeApiKey ?? "")
            .onChange(async (value) => {
              this.plugin.settings.claudeApiKey = value.trim() || undefined;
              await this.plugin.saveSettings();
            });
        });
    } else {
      new Setting(containerEl)
        .setName("OpenAI API key")
        .addText((text) => {
          text.inputEl.type = "password";
          text
            .setValue(this.plugin.settings.openAiApiKey ?? "")
            .onChange(async (value) => {
              this.plugin.settings.openAiApiKey = value.trim() || undefined;
              await this.plugin.saveSettings();
            });
        });
    }

    new Setting(containerEl)
      .setName("Cache AI responses")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.cacheAiResponses)
          .onChange(async (value) => {
            this.plugin.settings.cacheAiResponses = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("Show manual troubleshooting controls and privacy-safe developer console diagnostics.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.debugMode)
          .onChange(async (value) => {
            this.plugin.settings.debugMode = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (this.plugin.settings.debugMode) {
      new Setting(containerEl)
        .setName("Show memory now")
        .setDesc("Show a memory immediately for manual verification.")
        .addButton((button) => button
          .setButtonText("Show memory")
          .onClick(() => {
            this.plugin.showManualMemory();
          }));
    }
  }
}
