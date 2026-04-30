# Manual Verification Plan

Source: `SPEC.md` section 14.

Run the automated baseline before opening Obsidian:

```bash
./init.sh
```

Run this checklist validator after editing this file:

```bash
npm run verify:manual-plan
```

Use a disposable Obsidian vault with this plugin installed from the repository root. Keep developer tools open when checking AI behavior so network requests and notices can be observed.

## Scenarios

1. Create three Markdown notes with `#journal`, `#diary`, and `#note`; confirm all three are eligible.
   - Setup: create `Journal.md`, `Diary.md`, and `Note.md`, each with a different default tag and at least one sentence of body text.
   - Run: open Obsidian, enable the plugin, and run `Gentle Memories: Show memory` repeatedly with `Next` until each note appears.
   - Expected: each tagged note can be selected as a memory.

2. Create one Markdown note without configured tags; confirm it is not eligible.
   - Setup: create `Project.md` with body text but no configured journal tag.
   - Run: run `Gentle Memories: Show memory` and cycle with `Next`.
   - Expected: `Project.md` never appears.

3. Run `Gentle Memories: Show memory`; confirm a modal appears.
   - Setup: keep at least one eligible tagged note with usable body text.
   - Run: execute the command from the command palette.
   - Expected: a Gentle Memories modal opens with a title, excerpt, and controls.

4. Click `Open note`; confirm the correct note opens.
   - Setup: show a memory modal for a known source note.
   - Run: click `Open note`.
   - Expected: Obsidian opens the source Markdown note shown in the modal.

5. Click `Next`; confirm the current note is not repeated when another eligible note exists.
   - Setup: keep at least two eligible tagged notes with usable body text.
   - Run: show a memory, note its title, then click `Next`.
   - Expected: the next modal shows a different eligible note.

6. Reload the plugin; confirm display history persists.
   - Setup: show at least one memory, then disable and re-enable the plugin or reload Obsidian.
   - Run: show another memory after reload.
   - Expected: previously shown history is retained and another unshown eligible note is preferred when available.

7. Disable startup display; reload the plugin; confirm no startup modal appears.
   - Setup: turn off `Show on startup` in the plugin settings.
   - Run: reload Obsidian or disable and re-enable the plugin.
   - Expected: no memory modal appears automatically.

8. Enable AI without the selected provider API key; click `Memories`; confirm the missing-key notice appears.
   - Setup: enable AI, choose OpenAI or Claude, leave that provider's API key empty, and keep one eligible note.
   - Run: show a memory, confirm no automatic AI request or missing-key notice occurs, then click `Memories`.
   - Expected: the modal shows the `Memories` button, the click shows a missing provider API key notice, and no reading prompt request succeeds.

9. Keep AI disabled; confirm no AI button appears.
   - Setup: turn off `Enable AI`.
   - Run: show a memory.
   - Expected: the modal has no `Memories` button.

10. Inspect the AI request implementation; confirm only the excerpt is sent to the selected provider.
    - Setup: enable AI with a test OpenAI or Claude key, use a note containing text that should not be uploaded outside the excerpt, and keep developer tools open.
    - Run: show that note and inspect the automatic request payload or run `npm run smoke`.
    - Expected: the request includes the displayed excerpt, excludes full note content, file paths, vault names, and display history, and renders the AI lead-in separately from the original note.
