# AGENTS.md (Claude-style Minimal)

This project uses a **long-running agent model**.

The agent must behave like a **stateless worker**:

* No memory between sessions
* All state is stored in files
* Each session must reconstruct context from files

---

# Core Principle

> Never rely on chat history.
> Always rely on project state.

---

# 👥 Agent Roles

## Initializer

* Create `feature_list.json`
* Create `progress.md`
* Create `init.sh`
* Initialize git
* Do NOT implement business logic

## Coding Agent

* Continue work incrementally
* Only implement ONE feature per run
* Keep system runnable
* Before working on a feature, set `status="in_progress"`
* After successful completion:

  * set `passes=true`
  * set `status="done"`
* On failure:

  * increment `attempts`
  * set `status="blocked"` if attempts exceed threshold
  * record `last_error`

---

# Startup Protocol (MANDATORY)

Every session MUST:

1. Read `progress.md`
2. Read `feature_list.json`
3. Check recent work:

   ```bash
   git log --oneline -20
   ```
4. Run:

   ```bash
   ./init.sh
   ```

Then:

* Pick ONE unfinished feature
* Implement it

---

# State Files

## feature_list.json

`feature_list.json` defines the full feature scope and state.

Each feature may include:

* `id` (string, required)
* `description` (string, required)
* `passes` (boolean, required)
* `status` (optional): one of `["todo", "in_progress", "done", "blocked"]`
* `attempts` (optional, integer): retry count
* `last_error` (optional, string): last failure reason

Rules:

* `passes=true` means feature is completed
* `passes=false` means feature is not completed
* `status` is used for orchestration only and must NOT conflict with `passes`
* `status=blocked` means temporarily skipped due to repeated failures
* `attempts` must be incremented on failure
* Agents MUST NOT delete fields
* Agents MUST preserve unknown fields

---

## State Safety Rules

* Never overwrite entire `feature_list.json`
* Only update the current feature
* Preserve ordering and existing fields
* Do not remove metadata fields

---

## progress.md

Must include:

* Current system status
* Last completed feature
* Next feature
* Known issues

Must be updated after each run

---

# 🔁 Work Rules

* Only ONE feature per run
* Always keep system runnable
* Always update progress.md
* Always commit changes

---

# Anti-Patterns

* ❌ Doing multiple features at once
* ❌ Relying on previous chat
* ❌ Skipping init.sh
* ❌ Leaving broken code

---

# Execution Flow

```text
Read state → Run init → Pick 1 feature → Implement → Update state → Commit
```

---

# Goal

Make the system:

* Recoverable at any time
* Runnable at any time
* Continuously improvable
