# Gentle Memories Progress

## Current system status

Initializer scaffold created. The project has a minimal TypeScript Obsidian plugin shell, a valid local-install Obsidian manifest, build tooling, an idempotent `init.sh`, and a smoke-test helper service.

Latest verification: `./init.sh` passed on 2026-04-30 after implementing F028. The generated AI lead-in now uses `styles.css` for theme-aware visual separation from the original note content, with a subtle secondary background, accent border, and muted heading based on Obsidian CSS variables. When AI is enabled and the selected provider API key is configured, the memory modal automatically loads a cached AI lead-in or requests a new one after a memory is shown. Automatic and manual AI requests still send only the generated excerpt, not full note content, file paths, vault names, tags, display history, or cached history text. If AI is disabled, no AI button or network request appears. If AI is enabled but the selected provider API key is missing, the modal does not make an automatic request or show repeated automatic missing-key notices; the `Memories` button remains available and still shows the existing missing-key notice on manual click. The generated lead-in renders in a separate `Memory lead-in` section before an `Original note` heading and the rendered note content. Long-note `Show more` and `Show less`, provider selection, AI caching, debug logging, and startup cadence behavior remain intact.

F001 through F028 are complete. The TypeScript plugin scaffold builds successfully through the existing `npm run build` path, the smoke test validates the required `manifest.json` fields for local installation, the plugin registers the command shown in Obsidian as `Gentle Memories: Show memory`, the settings tab exposes and persists journal tags, startup behavior, minimum startup interval, AI enablement, AI provider selection, the selected provider API key, AI response caching, and debug mode while preserving hidden provider keys, the plugin can discover Markdown notes tagged with the default `#journal`, `#diary`, or `#note` tags through Obsidian metadata while rejecting notes without configured tags, startup display respects the `showOnStartup` setting, startup display respects `minDaysBetweenStartupShows`, the manual command displays a memory when startup display is disabled, shown memories contain the required fields and controls, the open-note control opens the source note, the next control avoids repeating the current note when another eligible note exists, display history persists across plugin reloads, AI is disabled by default, AI automatically generates or loads a separated lead-in only when enabled and keyed, no network request occurs while AI is disabled or while the selected provider API key is missing, AI request payloads exclude full note content, file paths, vault names, and display history, AI cache entries are keyed by `${path}:${contentHash}`, empty or unusable tagged notes are not shown, the manual verification scenarios from `SPEC.md` section 14 are documented and validated, the settings UI shows only the API key input for the selected AI provider, debug mode adds a settings-tab show-memory control with privacy-safe diagnostic logging, memory display renders source note Markdown with compact expansion controls for long notes, AI output is prompted to match the excerpt language while acting as a warm reading lead-in, the AI reading prompt button is labeled `Memories`, the default long-note preview is shorter so more note content remains hidden until expansion, and the AI lead-in is styled with theme-aware visual separation from the original note content.

## Last completed feature

F028 - AI lead-in section uses theme-aware styling to distinguish it from original note content.

## Next feature

No unfinished features listed in `feature_list.json`.

## Known issues

- `init.sh` requires Node.js and npm in the environment.
