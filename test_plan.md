# Gentle Memories Test Plan

This file is the durable coverage index for `feature_list.json`. A feature may only be marked `passes=true` when the repository still compiles, relevant automated checks pass, relevant human-style flows are covered, and the smoke suite does not regress.

## Completion Rules

- Code compiles through `npm run build`.
- Pure plugin logic passes through `npm run test:unit`.
- Mock-Obsidian behavior checks pass through `npm run test:harness`.
- Contract checks pass through `npm run test:contract`.
- Existing smoke compatibility checks pass through `npm run smoke`, which remains an alias for the harness layer.
- Manual or human-style flows are documented when behavior requires Obsidian interaction that cannot be fully exercised in the smoke harness.
- CI-sensitive changes include build or workflow evidence.
- Every feature with `passes=true` in `feature_list.json` has a row in the coverage table below before it is considered complete.

## Layered Test Expectations

- The unit layer must validate pure plugin logic, including tag normalization, tag matching, date normalization, excerpt generation, Markdown preview generation, content hashing, settings normalization, display history normalization, and startup cooldown calculations.
- The harness layer must keep validating the local-install manifest, command registration, settings behavior, memory discovery, startup gates, modal controls, display history, AI disabled and missing-key behavior, request payload privacy, cache keys, note filtering, Markdown rendering, compact long-note previews, AI lead-in loading and stale-result handling, release metadata, and ReviewBot text regressions.
- The contract layer must run the manual-plan verifier and this test-plan coverage verifier together.
- The smoke command must remain a compatibility alias for the harness layer.

## Feature Coverage

| Feature | Coverage type | Evidence |
| --- | --- | --- |
| F001 | Build | `npm run build` compiles the TypeScript Obsidian plugin scaffold. |
| F002 | Smoke | `npm run smoke` validates required `manifest.json` fields for local installation. |
| F003 | Smoke | `npm run smoke` verifies command registration for `Gentle Memories: Show memory`. |
| F004 | Smoke | `npm run smoke` verifies settings are exposed and persisted. |
| F005 | Smoke | `npm run smoke` verifies default tagged Markdown note discovery. |
| F006 | Smoke | `npm run smoke` verifies untagged notes are rejected. |
| F007 | Smoke | `npm run smoke` verifies startup display respects `showOnStartup`. |
| F008 | Smoke | `npm run smoke` verifies startup display respects `minDaysBetweenStartupShows`. |
| F009 | Smoke | `npm run smoke` verifies the manual command works when startup display is disabled. |
| F010 | Smoke | `npm run smoke` verifies shown memories contain title, excerpt, controls, and derivable date. |
| F011 | Smoke | `npm run smoke` verifies `Open note` opens the source note. |
| F012 | Smoke | `npm run smoke` verifies `Next` avoids repeating the current note when another eligible note exists. |
| F013 | Smoke | `npm run smoke` verifies display history persists across plugin reloads. |
| F014 | Smoke | `npm run smoke` verifies AI is disabled by default. |
| F015 | Smoke | `npm run smoke` verifies provider requests are gated by the enabled and keyed AI state. |
| F016 | Smoke | `npm run smoke` verifies no network request occurs while AI is disabled. |
| F017 | Smoke | `npm run smoke` verifies AI request payloads exclude full note content, file paths, vault names, and display history. |
| F018 | Smoke | `npm run smoke` verifies AI cache entries are keyed by `${path}:${contentHash}`. |
| F019 | Smoke | `npm run smoke` verifies empty or unusable notes are not shown. |
| F020 | Manual + verifier | `docs/manual-verification.md` plus `npm run verify:manual-plan` cover the SPEC section 14 scenarios. |
| F021 | Smoke | `npm run smoke` verifies only the selected provider key input appears while hidden keys persist. |
| F022 | Smoke | `npm run smoke` verifies debug mode exposes the manual settings control and privacy-safe diagnostics. |
| F023 | Smoke | `npm run smoke` verifies rich Markdown memory rendering with Show more and Show less. |
| F024 | Smoke | `npm run smoke` verifies provider prompts request excerpt-language warm reading lead-ins. |
| F025 | Smoke | `npm run smoke` verifies the AI reading prompt button is labeled `Memories` with preserved behavior. |
| F026 | Smoke | `npm run smoke` verifies shorter collapsed long-note previews. |
| F027 | Smoke | `npm run smoke` verifies automatic AI lead-in generation or cache loading when AI is enabled and keyed. |
| F028 | Smoke | `npm run smoke` verifies the AI lead-in section is visually separated with theme-aware classes. |
| F029 | Smoke | `npm run smoke` verifies the collapsed preview is constrained to a roughly one-screen view. |
| F030 | Smoke | `npm run smoke` verifies immediate AI loading text and stale-result protection. |
| F031 | Build + smoke | `npm run build` and `npm run smoke` verify release metadata, versions mapping, README notes, and secret-safe ignores. |
| F032 | Smoke | `npm run smoke` verifies release-facing author metadata uses `Armstrong Yan`. |
| F033 | Smoke | `npm run smoke` verifies marketplace-facing descriptions satisfy validation wording. |
| F034 | CI | `.github/workflows/build.yml` runs `npm ci` and `npm run build` on Ubuntu, Windows, and macOS. |
| F035 | Smoke | `npm run smoke` verifies modal action buttons wrap cleanly on narrow mobile screens. |
| F036 | Smoke | `npm run smoke` verifies `requestUrl`, settings heading, and sentence-case ReviewBot compliance behavior. |
| F037 | Smoke | `npm run smoke` verifies the user-facing ribbon icon opens the manual memory flow without debug mode. |
| F038 | Smoke | `npm run smoke` verifies the ribbon icon uses `sparkles` while preserving behavior. |
| F039 | Smoke | `npm run smoke` verifies no unnecessary async parsing, no repeated plugin heading, and flagged UI sentence case. |
| F040 | Smoke | `npm run smoke` verifies the journal tags placeholder and Openai-facing settings UI text. |
| F041 | Smoke | `npm run smoke` verifies scanner-compatible `Openai` casing while preserving internal provider behavior. |
| F042 | Verifier | `npm run verify:test-plan` checks every `passes=true` feature has a coverage row in this file. |
| F043 | Unit + harness + contract | `npm run test:unit`, `npm run test:harness`, and `npm run test:contract` verify explicit test layers and `./init.sh` runs them after build. |

## Verifier

Run the automated coverage gate after editing this file, or run the full contract layer:

```bash
npm run verify:test-plan
npm run test:contract
```

`./init.sh` also runs build, unit, harness, and contract checks so completed features cannot silently lose coverage evidence.
