# Gentle Memories Progress

## Current system status

Initializer scaffold created. The project has a minimal TypeScript Obsidian plugin shell, a valid local-install Obsidian manifest, build tooling, an idempotent `init.sh`, and a smoke-test helper service.

Latest coding-agent verification: `./init.sh` passed on 2026-04-28 after adding F012 next-memory behavior. The registered `Gentle Memories: Show memory` command now builds displayable memories from eligible journal notes, derives a title, excerpt, content hash, and date when available, and shows an Obsidian modal with the title, optional date, excerpt, and `Open note`, `Next`, and `Close` buttons. The `Open note` button opens the source Markdown note through Obsidian's workspace and then closes the modal. The `Next` button rerenders the modal with another displayable eligible note when one exists, excluding the current note path from selection. Startup display still queues only when `showOnStartup` is enabled, waits for Obsidian layout readiness, records when a startup memory is shown, and skips future startup display until `minDaysBetweenStartupShows` has elapsed. `AGENTS.md` documents extended feature state fields for long-running agent orchestration. `orchestrator.py` has been hardened for unattended runs: it executes the startup protocol, selects only unfinished passing-false features, tracks attempts and errors, avoids committing pre-existing dirty files, and validates before marking a feature done.

F001, F002, F003, F004, F005, F006, F007, F008, F009, F010, F011, and F012 are complete. The TypeScript plugin scaffold builds successfully through the existing `npm run build` path, the smoke test validates the required `manifest.json` fields for local installation, the plugin registers the command shown in Obsidian as `Gentle Memories: Show memory`, the settings tab exposes and persists journal tags, startup behavior, minimum startup interval, AI enablement, API key, and AI response caching, the plugin can discover Markdown notes tagged with the default `#journal`, `#diary`, or `#note` tags through Obsidian metadata while rejecting notes without configured tags, startup display respects the `showOnStartup` setting, startup display respects `minDaysBetweenStartupShows`, the manual command displays a memory when startup display is disabled, shown memories contain the required F010 fields and controls, the open-note control opens the source note, and the next control avoids repeating the current note when another eligible note exists.

## Last completed feature

F012 - Next button does not repeat the same note when another eligible note exists.

## Next feature

F013 - Display history persists across plugin reloads.

## Known issues

- Full display history and AI behavior are not implemented.
- `init.sh` requires Node.js and npm in the environment.
