# Gentle Memories Progress

## Current system status

Initializer scaffold created. The project has a minimal TypeScript Obsidian plugin shell, a valid local-install Obsidian manifest, build tooling, an idempotent `init.sh`, and a smoke-test helper service.

Latest coding-agent verification: `./init.sh` passed on 2026-04-28 after adding F009 manual command coverage. The registered `Gentle Memories: Show memory` command now uses an explicit manual display path and the smoke test verifies it displays a memory notice even when `showOnStartup` is disabled, without relying on startup layout scheduling. Startup display still queues only when `showOnStartup` is enabled, waits for Obsidian layout readiness, records when the startup memory notice is shown, and skips future startup display until `minDaysBetweenStartupShows` has elapsed. `AGENTS.md` documents extended feature state fields for long-running agent orchestration. `orchestrator.py` has been hardened for unattended runs: it executes the startup protocol, selects only unfinished passing-false features, tracks attempts and errors, avoids committing pre-existing dirty files, and validates before marking a feature done.

F001, F002, F003, F004, F005, F006, F007, F008, and F009 are complete. The TypeScript plugin scaffold builds successfully through the existing `npm run build` path, the smoke test validates the required `manifest.json` fields for local installation, the plugin registers the command shown in Obsidian as `Gentle Memories: Show memory`, the settings tab exposes and persists journal tags, startup behavior, minimum startup interval, AI enablement, API key, and AI response caching, the plugin can discover Markdown notes tagged with the default `#journal`, `#diary`, or `#note` tags through Obsidian metadata while rejecting notes without configured tags, startup display respects the `showOnStartup` setting, startup display respects `minDaysBetweenStartupShows`, and the manual command displays a memory notice even when startup display is disabled.

## Last completed feature

F009 - Manual command displays a memory even when startup display is disabled.

## Next feature

F010 - Shown memory contains title, excerpt, required buttons, and date when derivable.

## Known issues

- The plugin command currently shows a placeholder notice.
- Memory selection, modal behavior, full display history, and AI behavior are not implemented.
- `init.sh` requires Node.js and npm in the environment.
