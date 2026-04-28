---
title: 温柔回忆 Obsidian 插件 Long-Running Agent Spec
date: 2026-04-28
tags:
  - product/spec
  - obsidian-plugin
  - long-running-agent
  - journal
status: ready-for-implementation
---

# 温柔回忆 Obsidian 插件 Long-Running Agent Spec

## 1. Goal

Build an Obsidian plugin named `Gentle Memories`.

The plugin must help a user rediscover old journal notes inside the current Obsidian vault. On Obsidian startup, the plugin must select one eligible journal note, show a short excerpt in a modal, and let the user open the original note, skip to another memory, or close the modal.

The first implementation must be local-first. It must not send note content to any third party unless the user explicitly enables AI in plugin settings and provides an API key.

Success means:

- A user can tag notes with `#journal`, `#diary`, or `#note`.
- The plugin can find those notes in the current vault.
- The plugin can show one non-empty memory excerpt on startup.
- The plugin can avoid immediately repeating the same memory.
- The plugin can persist display history locally.
- AI is disabled by default and never runs until the user enables it.

## 2. Scope

### 2.1 Include

Implement the following in the first version:

- Obsidian plugin scaffold using TypeScript.
- Plugin manifest for local installation in Obsidian.
- Settings tab for all configurable behavior listed in this spec.
- Journal note discovery by tag.
- Startup memory modal.
- Manual command to show a memory on demand.
- Local display history.
- Local AI response cache.
- AI reflection generation, disabled by default and triggered only by user click.
- Error handling for every case listed in section 12.
- Build script and verification steps for every scenario listed in section 14.

### 2.2 Exclude

Do not implement the following in the first version:

- Facebook import.
- Instagram import.
- Notion integration.
- Email delivery.
- System notifications.
- Mobile-specific notification behavior.
- Cloud sync controlled by this plugin.
- Server backend.
- User accounts.
- Payment or subscription.
- Analytics tracking.
- Emotion diagnosis.
- Mental health advice.
- Long-term personality profiling.
- Multi-user support.
- Custom AI provider selection.
- Streaming AI responses.
- Image generation.

## 3. Core Concepts

### 3.1 Journal Note

A journal note is a Markdown file in the active Obsidian vault that contains at least one configured journal tag.

The default configured journal tags are:

- `journal`
- `diary`
- `note`

Tag matching rules:

- Match inline tags such as `#journal`.
- Match frontmatter tags such as `tags: [journal, diary]`.
- Match frontmatter list tags such as:

```yaml
tags:
  - journal
  - diary
```

Do not require users to place journal notes in a specific folder.

### 3.2 Memory Entry

A memory entry is one eligible journal note converted into a displayable object:

```ts
interface MemoryEntry {
  path: string;
  title: string;
  date?: string;
  excerpt: string;
  contentHash: string;
}
```

Field rules:

- `path` must be the vault-relative path to the Markdown file.
- `title` must be the file basename without `.md`.
- `date` must be derived using the date parsing rules in section 7.
- `excerpt` must be non-empty and no longer than 200 characters after trimming.
- `contentHash` must change when the note content used for excerpt generation changes.

### 3.3 Display History

The plugin must persist display history in plugin data:

```ts
interface DisplayHistory {
  shown: Record<string, {
    shownAt: string;
    contentHash: string;
  }>;
  aiCache: Record<string, {
    text: string;
    generatedAt: string;
  }>;
}
```

The key for `shown` must be the note `path`.

The key for `aiCache` must be `${path}:${contentHash}`.

## 4. Settings

Implement these settings:

```ts
interface PluginSettings {
  journalTags: string[];
  showOnStartup: boolean;
  minDaysBetweenStartupShows: number;
  aiEnabled: boolean;
  apiKey?: string;
  cacheAiResponses: boolean;
}
```

Default values:

```ts
const DEFAULT_SETTINGS: PluginSettings = {
  journalTags: ["journal", "diary", "note"],
  showOnStartup: true,
  minDaysBetweenStartupShows: 1,
  aiEnabled: false,
  apiKey: undefined,
  cacheAiResponses: true,
};
```

Settings UI requirements:

- Show a text input for journal tags as a comma-separated list.
- Show a toggle for startup display.
- Show a numeric input for minimum days between startup displays.
- Show a toggle for AI.
- Show a password-style input for API key.
- Show a toggle for AI response caching.
- Persist settings through Obsidian plugin data APIs.

## 5. Core Flows

### 5.1 Startup Memory Flow

Trigger: Obsidian loads the plugin.

Required behavior:

1. Load settings and display history.
2. If `showOnStartup` is `false`, do not show a modal.
3. If a startup memory was shown less than `minDaysBetweenStartupShows` days ago, do not show a modal.
4. Scan the active vault for eligible journal notes.
5. If no eligible journal notes exist, do not show a modal.
6. Select one memory using the selection rules in section 6.
7. Show the memory modal.
8. After the modal is shown, update display history for the selected note.

### 5.2 Manual Show Memory Flow

Trigger: User runs the command `Gentle Memories: Show memory`.

Required behavior:

1. Load settings and display history.
2. Scan the active vault for eligible journal notes.
3. If no eligible journal notes exist, show a notice: `No journal notes found for the configured tags.`
4. Select one memory using the selection rules in section 6.
5. Show the memory modal.
6. After the modal is shown, update display history for the selected note.

Manual show must ignore `showOnStartup` and `minDaysBetweenStartupShows`.

### 5.3 Memory Modal Flow

The memory modal must display:

- Title.
- Date when available.
- Excerpt.
- Button: `Open note`.
- Button: `Next`.
- Button: `Close`.
- Button: `Generate reflection`, only if AI is enabled.

Button behavior:

- `Open note` opens the source note in the current workspace.
- `Next` selects and displays another memory without closing the modal.
- `Next` must not show the same `path` as the current memory if at least two eligible memories exist.
- `Close` closes the modal.
- `Generate reflection` runs the AI reflection flow in section 5.4.

### 5.4 AI Reflection Flow

Trigger: User clicks `Generate reflection`.

Required behavior:

1. If `aiEnabled` is `false`, do not show the button.
2. If `aiEnabled` is `true` and `apiKey` is missing, show a notice: `Add an API key in Gentle Memories settings to generate reflections.`
3. If `cacheAiResponses` is `true` and an AI cache entry exists for `${path}:${contentHash}`, show the cached reflection.
4. If no cache entry exists, send only the current `excerpt` to the AI provider.
5. Show the returned reflection in the modal.
6. If `cacheAiResponses` is `true`, persist the returned reflection in `aiCache`.
7. If the AI request fails, show a notice: `Could not generate reflection. Try again later.`

The AI reflection must be requested only after a user click. Do not generate reflections automatically on startup.

## 6. Memory Selection Rules

Given a list of eligible `MemoryEntry` objects:

1. Exclude entries with empty `excerpt`.
2. Prefer entries that have never been shown.
3. If every entry has been shown, allow all entries.
4. If selecting because of `Next`, exclude the current entry when at least one other eligible entry exists.
5. Randomly select one entry from the remaining candidates.

The implementation must not depend on a stable filesystem order.

## 7. Date Parsing Rules

Derive `date` using this priority order:

1. Frontmatter `date` field if present.
2. First `YYYY-MM-DD` substring in the filename.
3. File `stat.ctime` converted to `YYYY-MM-DD`.

If no date can be derived, omit `date`.

Do not infer dates from natural language content.

## 8. Excerpt Rules

Generate `excerpt` from the Markdown body using these rules:

1. Remove YAML frontmatter.
2. Remove Obsidian comments wrapped in `%%`.
3. Remove Markdown headings.
4. Remove lines that contain only tags.
5. Trim whitespace.
6. Collapse consecutive whitespace into a single space.
7. Use the first 200 characters.
8. Trim the final excerpt.

If the result is empty, the note is not eligible for display.

## 9. AI Constraints

AI behavior must follow these constraints:

- AI is disabled by default.
- AI must require explicit user enablement in settings.
- AI must require an API key configured by the user.
- AI must send only `excerpt`, not the full note.
- AI must not send vault metadata, note paths, tags, or display history.
- AI output must be 1 to 3 sentences.
- AI output must not include diagnosis.
- AI output must not include medical advice.
- AI output must not include instructions that imply urgency or crisis handling.

Prompt requirements:

- Ask for a short reflection or encouragement.
- Tell the model to be specific to the excerpt.
- Tell the model not to claim knowledge beyond the excerpt.
- Tell the model not to provide medical or therapeutic advice.

## 10. Privacy Constraints

The plugin must satisfy these rules:

- Do not make any network request unless the user clicks `Generate reflection`.
- Do not make any network request when `aiEnabled` is `false`.
- Do not upload full note content.
- Do not upload file paths.
- Do not upload vault names.
- Do not upload display history.
- Store settings and history only through Obsidian plugin data storage.
- Do not add analytics.
- Do not add telemetry.
- Do not add crash reporting.

## 11. UI Constraints

The UI must be simple and non-marketing.

Required:

- Use Obsidian-native settings and modal patterns.
- Keep modal text compact.
- Make the excerpt readable as plain text.
- Keep buttons clearly labeled.
- Show AI reflection below the excerpt after generation.

Forbidden:

- Do not create a landing page.
- Do not add decorative hero sections.
- Do not add external fonts.
- Do not add external CSS frameworks.
- Do not use emojis in UI copy.
- Do not show onboarding screens in the first version.

## 12. Error Handling

Handle these cases:

- No configured tags: show settings validation error and use defaults until valid tags are saved.
- No matching notes: manual command shows a notice; startup does nothing.
- Matching notes but no usable excerpt: manual command shows a notice; startup does nothing.
- Missing API key: show the exact notice defined in section 5.4.
- AI request failure: show the exact notice defined in section 5.4.
- Corrupt saved plugin data: fall back to defaults without crashing.

## 13. Acceptance Criteria

The implementation is complete only when all criteria below are true:

- The plugin builds successfully.
- The plugin has a valid Obsidian `manifest.json`.
- The plugin registers a command named `Gentle Memories: Show memory`.
- The settings tab exposes every setting listed in section 4.
- Notes tagged with `#journal`, `#diary`, or `#note` are discovered by default.
- Notes without configured tags are not discovered.
- Startup display respects `showOnStartup`.
- Startup display respects `minDaysBetweenStartupShows`.
- Manual command displays a memory even when startup display is disabled.
- A shown memory contains title, excerpt, required buttons, and date when section 7 derives one.
- `Open note` opens the source note.
- `Next` does not repeat the same note when another eligible note exists.
- Display history persists across plugin reloads.
- AI is disabled by default.
- No network request occurs before the user clicks `Generate reflection`.
- No network request occurs while AI is disabled.
- AI request payload excludes full note content, file paths, vault names, and display history.
- AI cache is keyed by `${path}:${contentHash}`.
- Empty or unusable notes are not shown.

## 14. Verification Plan

Verify these scenarios manually or with automated tests:

1. Create three Markdown notes with `#journal`, `#diary`, and `#note`; confirm all three are eligible.
2. Create one Markdown note without configured tags; confirm it is not eligible.
3. Run `Gentle Memories: Show memory`; confirm a modal appears.
4. Click `Open note`; confirm the correct note opens.
5. Click `Next`; confirm the current note is not repeated when another eligible note exists.
6. Reload the plugin; confirm display history persists.
7. Disable startup display; reload the plugin; confirm no startup modal appears.
8. Enable AI without an API key; click `Generate reflection`; confirm the missing-key notice appears.
9. Keep AI disabled; confirm no AI button appears.
10. Inspect the AI request implementation; confirm only the excerpt is sent.

Follow repository execution rules in `Agent.md`. If a harness exists, update and run it as required by that file.
