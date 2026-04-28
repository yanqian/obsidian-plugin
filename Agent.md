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

* Full list of features
* Each feature has:

  * id
  * description
  * passes (true/false)

Rules:

* Do NOT delete features
* Only update `passes=true` when done

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
