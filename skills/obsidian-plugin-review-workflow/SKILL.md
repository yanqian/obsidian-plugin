---
name: obsidian-plugin-review-workflow
description: Use this skill when working on this Obsidian plugin with the repository's SPEC/feature_list/orchestrator workflow, especially for ReviewBot fixes, release readiness, release asset updates, local vault sync, CI verification, and triggering the obsidian-releases community plugin PR checks.
---

# Obsidian Plugin Review Workflow

Use this workflow for changes to the Gentle Memories Obsidian plugin, especially when the user asks to implement a requirement, fix Obsidian ReviewBot feedback, update release assets, or push changes to the community plugin review PR.

## Ground Rules

- Treat repository files as the source of truth. Do not rely on chat history.
- Read `AGENTS.md`, `progress.md`, `feature_list.json`, and recent commits before making changes.
- Preserve unrelated working-tree changes. In this repo, `.vscode/` may be user-local and should not be staged unless explicitly requested.
- For product or code changes, append a new feature entry instead of editing old feature state.
- The orchestrator owns implementation commits during unattended feature runs.
- Keep release assets and the user's local vault plugin copy in sync after code changes that affect runtime files.

## Standard Startup

Run these from the repo root:

```bash
git status --short --branch
git log --oneline -20
sed -n '1,220p' AGENTS.md
sed -n '1,220p' progress.md
sed -n '1,260p' feature_list.json
```

If the task references the Obsidian community plugin PR, inspect it:

```bash
gh pr view 12432 --repo obsidianmd/obsidian-releases --comments
gh pr view 12432 --repo obsidianmd/obsidian-releases --json headRefName,headRefOid,statusCheckRollup,url
```

## Planning A New Change

Before implementation, append a new numbered requirement section to `SPEC.md` and append a new feature to `feature_list.json`.

Rules:

- Do not reorder features.
- Do not modify prior feature IDs.
- Do not reset existing `passes`, `status`, `attempts`, or `last_error`.
- New features start as:

```json
{
  "id": "F042",
  "description": "Concise acceptance-oriented description.",
  "passes": false,
  "status": "todo",
  "attempts": 0,
  "last_error": ""
}
```

Validate and commit the planning change:

```bash
jq empty feature_list.json
rg 'F042|15.22' SPEC.md feature_list.json
git add SPEC.md feature_list.json
git commit -m "Plan F042 short feature name"
```

## Implementing With Orchestrator

Run one unattended feature round:

```bash
python3 orchestrator.py --max-rounds 1
```

Expected successful output includes:

```text
EVAL_PASS: Fxxx
Done: Fxxx
```

If the evaluator fails, inspect the failure, append a follow-up feature if needed, and repeat the normal planning flow. Do not manually mark a feature done without evaluator pass.

After completion, verify:

```bash
git status --short --branch
git log --oneline -5
```

## Local Verification

The full local verification command is:

```bash
./init.sh
```

It runs build, starts the smoke server, runs smoke tests, and verifies the manual plan. `npm run smoke` alone expects the smoke server to already be running, so prefer `./init.sh` for full verification.

Useful focused checks:

```bash
npm run build
npm run verify:manual-plan
git diff --check
```

## ReviewBot Fix Pattern

When ReviewBot comments:

1. Read the latest PR comments and identify only the newest unresolved feedback.
2. Inspect the referenced source lines in `main.ts`.
3. Plan a new feature for the feedback, even if it is small.
4. Use the orchestrator to implement and evaluate.
5. Re-check for adjacent scanner risks before pushing. For sentence-case issues, ReviewBot can flag placeholders, dropdown labels, settings labels, notices, and headings.

Common Obsidian review requirements already encountered:

- Use `requestUrl` instead of global `fetch`.
- Use `new Setting(containerEl).setName(...).setHeading()` for settings headings.
- Avoid the plugin name in settings headings.
- Use scanner-compatible sentence case for user-visible UI text.
- Avoid unnecessary `async` methods with no `await`.
- Do not include `Obsidian` in the marketplace description.

## Push, Release Assets, And Vault Sync

After a successful orchestrator commit, push the plugin repo:

```bash
git push
```

Sync runtime files to the user's local vault:

```bash
cp manifest.json main.js styles.css "/Users/armstrong/Library/Mobile Documents/iCloud~md~obsidian/Documents/vault-obs-yan/.obsidian/plugins/gentle-memories/"
```

Update the GitHub release assets:

```bash
gh release upload 1.0.0 manifest.json main.js styles.css --repo yanqian/obsidian-plugin --clobber
```

Watch the plugin repo CI:

```bash
gh run list --repo yanqian/obsidian-plugin --limit 5
gh run watch <run_id> --repo yanqian/obsidian-plugin
```

The expected CI matrix is Ubuntu, macOS, and Windows build success.

## Triggering The Obsidian Review PR

The community plugin PR is:

```text
https://github.com/obsidianmd/obsidian-releases/pull/12432
```

It comes from:

```text
yanqian/obsidian-releases:add-gentle-memories
```

If the PR entry itself is already correct and you only need ReviewBot to rescan the plugin repo/release, trigger a new check with an empty commit on the PR branch:

```bash
gh repo clone yanqian/obsidian-releases /tmp/obsidian-releases-pr -- --branch add-gentle-memories
git -C /tmp/obsidian-releases-pr commit --allow-empty -m "Trigger Gentle Memories review checks"
git -C /tmp/obsidian-releases-pr push origin add-gentle-memories
```

Then watch validation:

```bash
gh pr view 12432 --repo obsidianmd/obsidian-releases --json headRefOid,statusCheckRollup,url
gh run watch <run_id> --repo obsidianmd/obsidian-releases
```

`plugin-validation` should finish with `SUCCESS`. ReviewBot code scans may take longer after push; the bot has stated it may rescan within 6 hours.

## Final Response Checklist

Report only the useful facts:

- New feature IDs completed.
- Commit hashes pushed.
- Local vault sync status.
- Release asset update status.
- Plugin repo CI result.
- Obsidian PR validation result.
- Any untouched unrelated files, such as `.vscode/`.
