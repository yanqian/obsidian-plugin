# Gentle Memories Progress

## Current system status

Initializer scaffold created. The project has a minimal TypeScript Obsidian plugin shell, a valid local-install Obsidian manifest, build tooling, an idempotent `init.sh`, and a smoke-test helper service.

Latest coding-agent verification: `./init.sh` passed on 2026-04-28 after adding F006 smoke coverage that confirms notes without configured tags are not discovered, including TypeScript build, service startup, and smoke test. `AGENTS.md` now documents extended feature state fields for long-running agent orchestration. `orchestrator.py` has been hardened for unattended runs: it executes the startup protocol, selects only unfinished passing-false features, tracks attempts and errors, avoids committing pre-existing dirty files, and validates before marking a feature done.

F001, F002, F003, F004, F005, and F006 are complete. The TypeScript plugin scaffold builds successfully through the existing `npm run build` path, the smoke test validates the required `manifest.json` fields for local installation, the plugin registers the command shown in Obsidian as `Gentle Memories: Show memory`, the settings tab exposes and persists journal tags, startup behavior, minimum startup interval, AI enablement, API key, and AI response caching, and the plugin can discover Markdown notes tagged with the default `#journal`, `#diary`, or `#note` tags through Obsidian metadata while rejecting notes without configured tags.

## Last completed feature

F006 - Notes without configured tags are not discovered.

## Next feature

F007 - Startup display respects showOnStartup.

## Known issues

- The working tree currently has a pre-existing tracked deletion of `Agent.md`; the orchestrator avoids staging pre-existing dirty paths, but a clean tree is still recommended before unattended runs.
- The plugin command currently shows a placeholder notice.
- Startup behavior, memory selection, modal behavior, display history, and AI behavior are not implemented.
- `init.sh` requires Node.js and npm in the environment.
