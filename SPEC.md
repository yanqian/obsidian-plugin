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
- AI reading prompt generation, disabled by default and triggered only by user click.
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
- Custom AI provider configuration beyond OpenAI and Claude.
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
  aiProvider: "openai" | "claude";
  openAiApiKey?: string;
  claudeApiKey?: string;
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
  aiProvider: "openai",
  openAiApiKey: undefined,
  claudeApiKey: undefined,
  cacheAiResponses: true,
};
```

Settings UI requirements:

- Show a text input for journal tags as a comma-separated list.
- Show a toggle for startup display.
- Show a numeric input for minimum days between startup displays.
- Show a toggle for AI.
- Show an AI provider selector for OpenAI or Claude.
- Show a password-style input for OpenAI API key.
- Show a password-style input for Claude API key.
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
- Button: `Memories`, only if AI is enabled.

Button behavior:

- `Open note` opens the source note in the current workspace.
- `Next` selects and displays another memory without closing the modal.
- `Next` must not show the same `path` as the current memory if at least two eligible memories exist.
- `Close` closes the modal.
- `Memories` runs the AI reading prompt flow in section 5.4.

### 5.4 AI Reading Prompt Flow

Trigger: User clicks `Memories`.

Required behavior:

1. If `aiEnabled` is `false`, do not show the button.
2. If `aiEnabled` is `true` and the selected provider API key is missing, show a missing-key notice.
3. If `cacheAiResponses` is `true` and an AI cache entry exists for `${path}:${contentHash}`, show the cached reflection.
4. If no cache entry exists, send only the current `excerpt` to the AI provider.
5. Show the returned reading prompt in the modal.
6. If `cacheAiResponses` is `true`, persist the returned reading prompt in `aiCache`.
7. If the AI request fails, show a notice: `Could not generate a reading prompt. Try again later.`

The AI reading prompt must be requested only after a user click. Do not generate reading prompts automatically on startup.

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

- Do not make any network request unless the user clicks `Memories`.
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
- Show the AI reading prompt near the note content after generation.

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
- Missing selected provider API key: show the missing-key notice defined in section 5.4.
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
- No network request occurs before the user clicks `Memories`.
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
8. Enable AI without the selected provider API key; click `Memories`; confirm the missing-key notice appears.
9. Keep AI disabled; confirm no AI button appears.
10. Inspect the AI request implementation; confirm only the excerpt is sent to the selected provider.

Follow repository execution rules in `AGENTS.md`. If a harness exists, update and run it as required by that file.

## 15. Follow-up Requirements

### 15.1 AI Provider Settings Visibility

The settings UI must make the selected AI provider and API key fields feel linked:

- Keep the existing `aiProvider` setting with OpenAI and Claude options.
- When `aiProvider` is `openai`, show only the OpenAI API key input.
- When `aiProvider` is `claude`, show only the Claude API key input.
- Switching providers must refresh the settings UI immediately.
- Hidden provider API keys must remain saved and must not be cleared automatically.
- AI reading prompt generation must continue to validate only the selected provider's API key.

### 15.2 Debug Mode

Add a debug setting for manual verification and troubleshooting:

- Add `debugMode: boolean` to plugin settings.
- Default `debugMode` must be `false`.
- When debug mode is enabled, expose a settings-tab control to show a memory immediately.
- The debug show-memory control must bypass startup-only controls such as `showOnStartup` and `minDaysBetweenStartupShows`.
- Debug mode should log useful diagnostics to the developer console, including candidate note counts, filter outcomes, selected memory path, and AI cache hits or misses.
- Debug logging must not include full note content, vault names, API keys, or AI request secrets.

### 15.3 Rich Memory Rendering

The memory display should support richer note content:

- Render the source note body with Obsidian Markdown rendering APIs so common Markdown, wikilinks, embeds, and images display as closely as practical to Obsidian reading view.
- If AI is enabled, show a reflection section before the note content once the user generates or loads a reflection.
- Continue to avoid automatic AI requests on startup or modal open.
- Show a compact note preview by default for long notes.
- Provide a `Show more` control that expands long notes to the full rendered content.
- Provide a `Show less` control after expansion.
- Preserve existing `Open note`, `Next`, `Close`, and AI reading prompt controls.
- Keep the current modal approach for the first rich-rendering implementation; a dedicated Obsidian view may be considered later if the modal becomes insufficient.

### 15.4 Warm AI Reading Prompt

The AI-generated text should work as a warm reading prompt rather than only a generic English reflection:

- The AI prompt must ask the provider to answer in the same primary language as the note excerpt.
- The AI output may be a brief summary, reflection, encouragement, or gentle self-reflection question.
- The AI output should act as a warm lead-in that makes the user interested in rereading the note.
- The AI output must remain grounded in the excerpt and must not claim knowledge beyond it.
- Existing privacy constraints still apply: send only the excerpt, not the full note, path, vault name, tags, or display history.

### 15.5 Memory Prompt Button Copy

The AI reading prompt control should use simpler, more evocative copy:

- Rename the visible `Generate reading prompt` button to `Memories`.
- The button must still only appear when AI is enabled.
- The renamed button must continue to trigger the same AI reading prompt behavior.
- Tests and documentation should use the `Memories` label for this control.

### 15.6 Shorter Mystery Preview

The memory modal should preserve more mystery before the user expands the note:

- Reduce the default rendered note preview length for long notes.
- Long notes should show only a small opening preview by default.
- Long notes must still provide `Show more` to expand to the full rendered note body.
- Expanded long notes must still provide `Show less` to return to the compact preview.
- The preview should remain useful enough to orient the user without revealing too much of the note.

### 15.7 Automatic AI Lead-in

When AI is enabled, the memory modal should generate or load the AI lead-in automatically:

- This requirement supersedes earlier constraints that required clicking the AI button before any AI request.
- If `aiEnabled` is `true` and the selected provider API key is configured, the modal should automatically load a cached AI reading prompt or request a new one after a memory is shown.
- If `aiEnabled` is `false`, no AI request should occur.
- If `aiEnabled` is `true` but the selected provider API key is missing, the modal should not make a network request and should not show repeated startup notices automatically.
- Automatic AI requests must still send only the excerpt, not the full note, path, vault name, tags, or display history.
- The AI-generated lead-in must be visually separated from the original note content.
- The note content should remain clearly identifiable as the user's original note.
- The `Memories` button may remain available as a manual retry or regeneration control when AI is enabled.

### 15.8 Theme-aware AI Lead-in Styling

The AI-generated lead-in should be visually distinct from the user's original note without feeling heavy:

- Style the `gentle-memories-ai-lead-in` section with a subtle theme-aware background.
- Use Obsidian CSS variables instead of fixed brand colors.
- Use a small accent border or similar lightweight treatment to distinguish AI content.
- Keep the original note content in normal Obsidian reading style.
- The styling must work in light and dark themes.
- Local installation documentation must mention any required style file.

### 15.9 One-screen Default Preview

The memory modal should avoid showing too much of the note before expansion:

- Reduce the default rendered note preview to a short opening preview.
- The collapsed note preview should be constrained to roughly one screen at most.
- The collapsed preview should use a height cap so unusually dense content cannot dominate the modal.
- `Show more` must still expand to the full rendered note body.
- `Show less` must return to the constrained preview.

### 15.10 AI Lead-in Loading State

Automatic AI lead-in generation should not make the modal feel blocked:

- The modal must render immediately before the automatic AI request finishes.
- When automatic AI generation starts, show a lightweight loading state in the AI lead-in section.
- Replace the loading state with the generated or cached lead-in when available.
- If the user advances to another memory, stale AI results from the previous memory must not overwrite the new modal content.
- If AI is disabled or the selected provider key is missing, no loading state should appear.

### 15.11 Release Readiness

Prepare the repository for an initial Obsidian community plugin submission:

- Set the public plugin version to `1.0.0` in `manifest.json`, `package.json`, and `package-lock.json`.
- Add `versions.json` with the minimum compatible Obsidian version for `1.0.0`.
- Add a root `LICENSE` file.
- Ensure the manifest has publishable author metadata and repository-aligned description.
- Update README installation, privacy, and release instructions for public users.
- Ignore local environment files that may contain secrets.
- Keep the repository buildable and runnable through `./init.sh`.

### 15.12 Public Author Metadata

Use the public author display name consistently across release-facing files:

- Set plugin author metadata to `Armstrong Yan`.
- Update README community plugin submission examples to use `Armstrong Yan`.
- Update license copyright holder text to `Armstrong Yan`.
- Keep repository ownership and URLs unchanged unless explicitly requested.

### 15.13 Marketplace Description Compliance

Keep public marketplace descriptions compatible with the Obsidian community plugin validation rules:

- The `community-plugins.json` description must not include the word `Obsidian`.
- The repository `manifest.json` description must exactly match the marketplace description.
- The README release submission example should use the same description.
- The description must remain short, user-facing, and end with terminal punctuation.

### 15.14 Cross-platform Build Verification

Add repository CI that can support marketplace review notes when Windows or Linux GUI testing is not available:

- Add a GitHub Actions workflow that runs on pushes to `main` and pull requests.
- Verify the plugin build on `ubuntu-latest`, `windows-latest`, and `macos-latest`.
- Use Node.js 20 with npm dependency caching.
- Run `npm ci` followed by `npm run build`.
- Keep this as build compatibility verification, not a claim of manual GUI testing on every OS.

### 15.15 Mobile Button Layout

The memory modal action buttons must remain readable on narrow mobile screens:

- The `Show more` and `Show less` buttons must not be horizontally clipped on iOS.
- Modal action buttons should wrap instead of shrinking into unreadable labels.
- Buttons should keep a stable minimum width on normal narrow layouts.
- Very narrow screens should show action buttons as full-width rows.
- Preserve the existing button labels and behavior.
