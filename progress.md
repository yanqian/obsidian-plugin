# Gentle Memories Progress

## Current system status

Initializer scaffold created. The project has a minimal TypeScript Obsidian plugin shell, a valid local-install Obsidian manifest, build tooling, an idempotent `init.sh`, and a smoke-test helper service.

Latest verification: `./init.sh` passed on 2026-04-29 after updating the settings UI so only the selected AI provider's API key input is shown. Switching between OpenAI and Claude refreshes the settings tab immediately, and hidden provider keys remain saved. The repository includes `README.md`, `docs/manual-verification.md`, and `docs/orchestrator.md`. The manual verification checklist covers all ten scenarios from `SPEC.md` section 14 with setup, run, and expected-result steps for each scenario. `npm run verify:manual-plan` validates that the checklist stays aligned with the section 14 scenario list, and `init.sh` runs that validator after build and smoke checks. The registered `Gentle Memories: Show memory` command still builds displayable memories from eligible journal notes, derives a title, excerpt, content hash, and date when available, and shows an Obsidian modal with the title, optional date, excerpt, and `Open note`, `Next`, `Close`, and, when AI is enabled, `Generate reflection` buttons. Empty or unusable tagged notes are still skipped. Startup display still queues only when `showOnStartup` is enabled, waits for Obsidian layout readiness, records when a startup memory is shown, and skips future startup display until `minDaysBetweenStartupShows` has elapsed.

F001 through F021 are complete. The TypeScript plugin scaffold builds successfully through the existing `npm run build` path, the smoke test validates the required `manifest.json` fields for local installation, the plugin registers the command shown in Obsidian as `Gentle Memories: Show memory`, the settings tab exposes and persists journal tags, startup behavior, minimum startup interval, AI enablement, AI provider selection, the selected provider API key, and AI response caching while preserving hidden provider keys, the plugin can discover Markdown notes tagged with the default `#journal`, `#diary`, or `#note` tags through Obsidian metadata while rejecting notes without configured tags, startup display respects the `showOnStartup` setting, startup display respects `minDaysBetweenStartupShows`, the manual command displays a memory when startup display is disabled, shown memories contain the required F010 fields and controls, the open-note control opens the source note, the next control avoids repeating the current note when another eligible note exists, display history persists across plugin reloads, AI is disabled by default, no network request occurs before the user clicks `Generate reflection`, no network request occurs while AI is disabled, the AI request payload excludes full note content, file paths, vault names, and display history, AI cache entries are keyed by `${path}:${contentHash}`, empty or unusable tagged notes are not shown, the manual verification scenarios from `SPEC.md` section 14 are documented in a runnable checklist validated by `npm run verify:manual-plan`, and the settings UI shows only the API key input for the selected AI provider.

## Last completed feature

F021 - Settings UI shows only the API key input for the selected AI provider while preserving hidden provider keys.

## Next feature

F022 - Debug mode adds a settings-tab show-memory control and privacy-safe diagnostic logging.

## Known issues

- `init.sh` requires Node.js and npm in the environment.
