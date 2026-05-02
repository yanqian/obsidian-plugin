# Gentle Memories Progress

## Current system status

Initializer scaffold created. The project has a minimal TypeScript Obsidian plugin shell, a valid local-install Obsidian manifest, build tooling, an idempotent `init.sh`, a mock-Obsidian harness, contract verifiers, and a smoke-test helper service available through `npm run serve:smoke`.

Latest verification in progress: F043 adds explicit automated test layers. Pure helpers for tag normalization, tag matching, date normalization, excerpt generation, Markdown preview generation, content hashing, settings normalization, display history normalization, and startup cooldown calculations are exported from `main.ts` without changing plugin behavior. `npm run test:unit` covers those pure helpers. `npm run test:harness` runs the existing mock-Obsidian behavior harness through a dedicated script, and `npm run smoke` remains a compatibility alias for that harness. `npm run test:contract` runs the manual-plan and test-plan verifiers together. `./init.sh` now runs build, unit, harness, and contract checks in order.

F001 through F042 are complete. F043 has been implemented and is ready for evaluator verification. The root `test_plan.md` now describes the layered test structure and includes coverage evidence for F043. The test-plan verifier now recognizes build, unit, harness, smoke, contract, manual, CI, and verifier evidence while continuing to require a coverage row for every `passes=true` feature.

## Last completed feature

F042 - Root test-plan coverage gate for completed feature evidence.

## Next feature

F043 - Await evaluator verification for explicit unit, harness, and contract test layers.

## Known issues

- `init.sh` requires Node.js and npm in the environment.
