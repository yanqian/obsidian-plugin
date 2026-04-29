# Gentle Memories

Gentle Memories is a local-first Obsidian plugin for rediscovering old journal notes.

It scans Markdown notes in the current vault for configured journal tags, turns one eligible note into a short memory excerpt, and shows it in a compact Obsidian modal. The plugin can show a memory on startup or on demand through the command palette.

## Background

Personal notes often become useful only after time has passed, but old journal entries are easy to forget. Gentle Memories is designed as a quiet reminder system: it surfaces one past note without building a social feed, cloud backend, analytics pipeline, or notification system.

The default design favors privacy:

- Journal discovery happens inside the local Obsidian vault.
- AI is disabled by default.
- No AI request is made unless the user enables AI and clicks `Generate reflection`.
- AI requests send only the displayed excerpt, not the full note, path, vault name, tags, or display history.

## Design

The plugin has four main parts:

- Discovery: finds Markdown notes tagged with configured journal tags.
- Memory creation: derives title, date, excerpt, and content hash from an eligible note.
- Display: shows a modal with the memory, `Open note`, `Next`, and `Close` controls.
- Optional AI reflection: sends only the current excerpt to the selected provider after explicit user action.

Display history is stored through Obsidian plugin data so the plugin can prefer notes that have not been shown recently.

## Installation

Build the plugin from the repository root:

```bash
./init.sh
```

For local Obsidian installation, copy or symlink the built plugin files into a vault plugin folder such as:

```text
<vault>/.obsidian/plugins/gentle-memories/
```

Required files:

```text
manifest.json
main.js
```

Then enable `Gentle Memories` in Obsidian community plugin settings.

## Usage

Tag journal notes with one of the default tags:

```markdown
#journal
#diary
#note
```

Or use frontmatter:

```yaml
---
tags:
  - journal
---
```

Run the command:

```text
Gentle Memories: Show memory
```

The modal shows:

- Title
- Date when derivable
- Excerpt
- `Open note`
- `Next`
- `Close`
- `Generate reflection` when AI is enabled

## Settings

Available plugin settings:

- `Journal tags`: comma-separated tags used to identify journal notes.
- `Show on startup`: whether to show a memory after Obsidian starts.
- `Minimum days between startup shows`: startup display cooldown.
- `Enable AI`: controls whether the AI reflection button appears.
- `AI provider`: `OpenAI` or `Claude`.
- `OpenAI API key`: token used only when OpenAI is selected.
- `Claude API key`: token used only when Claude is selected.
- `Cache AI responses`: stores generated reflections by `${path}:${contentHash}`.

Existing saved `apiKey` values from earlier versions are treated as `OpenAI API key`.

## AI Behavior

AI is optional and disabled by default.

When enabled, the selected provider is called only after clicking `Generate reflection`. The request payload includes the visible excerpt and instructions for a short reflection. It excludes full note content, file paths, vault names, tags, and display history.

Supported providers:

- OpenAI: uses the OpenAI chat completions endpoint.
- Claude: uses the Anthropic messages endpoint.

## Development

Run the full local verification path:

```bash
./init.sh
```

Useful commands:

```bash
npm run build
npm run smoke
npm run verify:manual-plan
```

`npm run smoke` expects the smoke server to be running. `./init.sh` starts that server before running the smoke test.

Unattended feature work is managed by:

```bash
python3 orchestrator.py
```

See [docs/orchestrator.md](docs/orchestrator.md) for the coding/evaluator flow.
