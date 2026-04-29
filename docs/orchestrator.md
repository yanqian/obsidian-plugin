# Orchestrator

`orchestrator.py` runs unattended feature development with a separate coding step and evaluation step.

## Normal Flow

```text
python3 orchestrator.py
  -> read progress.md and feature_list.json
  -> git log --oneline -20
  -> ./init.sh
  -> pick one unfinished feature
  -> mark it in_progress and increment attempts
  -> codex exec "Coding Agent implement Fxxx"
  -> codex exec "Evaluator Agent evaluate Fxxx"
  -> evaluator PASS: mark done and commit "Complete Fxxx"
  -> evaluator FAIL: mark todo/blocked, record last_error, and commit "Block Fxxx"
```

The orchestrator owns final state transitions and commits. The Coding Agent should edit implementation, `progress.md`, and only the current feature entry in `feature_list.json`, but it should not stage or commit during orchestrated runs.

## Feature Selection

The orchestrator selects features where:

* `passes` is `false`
* normalized `status` is `todo` or `in_progress`
* `attempts` is below `--max-attempts`

Features are sorted by optional priority (`P0`, `P1`, `P2`) and then by their order in `feature_list.json`.

## Evaluation

The Evaluator Agent verifies one feature and must emit exactly one result:

```text
EVAL_PASS: Fxxx
EVAL_FAIL: Fxxx: <reason>
```

The orchestrator accepts a feature only when the evaluator exits successfully and emits the exact pass line.

## Commands

Run default unattended rounds:

```bash
python3 orchestrator.py
```

Run a fixed number of rounds:

```bash
python3 orchestrator.py --max-rounds 10
```

Run with a custom retry limit:

```bash
python3 orchestrator.py --max-attempts 5
```

Evaluate one existing feature without coding, state updates, or commits:

```bash
python3 orchestrator.py --eval-only F020
```

Evaluate all features without coding, state updates, or commits:

```bash
python3 orchestrator.py --eval-only all
```

Preview prompts without running agents:

```bash
python3 orchestrator.py --dry-run
```

## Notes

`./init.sh` starts a smoke server on `127.0.0.1:4173`. Run evaluator checks serially unless you provide distinct `SMOKE_PORT` values, otherwise concurrent checks can contend for the same port.
