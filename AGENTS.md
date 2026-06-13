# Palefire - notes for coding agents

Local-first Windows desktop app for tabletop GMs (Tauri v2 + React 19 + TS + Tailwind v4 + SQLite + Web Audio). Personal single-user tool: no accounts, no telemetry, no plugin system - keep it that way.

The one sanctioned exception to the otherwise local-only, no-AI stance is **Solo Crossing** (`docs/plans/solo-crossing.md`): an opt-in conversational AI narrator the owner uses to play a recurring passenger between sessions. It is the only feature that makes outbound calls (to an LLM provider), it reads its API key from a gitignored `.env.local` (`VITE_ANTHROPIC_API_KEY`), and it keeps all of its data in a separate, gitignored `data/solo.db`. The core prep tools stay fully local and work with the feature off.

## Commands

- `Start Palefire.cmd` - double-clickable Windows launcher for Tauri dev with Cargo and WebView2 debugging configured
- `npm run tauri dev` - run the app (cargo must be on PATH: `%USERPROFILE%\.cargo\bin`)
- `npm run typecheck` - TS check (run before committing)
- `npm run tauri build` - NSIS installer in `src-tauri/target/release/bundle/nsis/`
- `node scripts/cdp.mjs <shot|eval|click|clicktext|text> ...` - drive a running instance through WebView2 devtools; launch with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223` first

## Architecture in one breath

`src-tauri` is a thin shell: plugins (sql/fs/dialog) + numbered SQL migrations. All logic is frontend: `src/db/repo.ts` (SQL), `src/audio/engine.ts` (Web Audio mixing/crossfades, singleton), `src/stores/*` (zustand: app/data/audio), `src/views/*` (one file per sidebar view, including first-class Passengers), `src/db/seed.ts` (Nox Trajectus campaign content).

## Invariants

- Migration SQL is checksummed by tauri-plugin-sql: never edit `migrations/001_initial.sql` after release; add new numbered migrations. Keep the CRLF-to-LF normalization in `lib.rs` and the `*.sql text eol=lf` gitattribute.
- `Cargo.lock` pins `time = 0.3.47` (0.3.48 breaks `cookie 0.18`). Don't bump until upstream fixes.
- Boot must stay single-flight (`bootPromise` in `App.tsx`) - StrictMode double-runs effects and would double-seed.
- Runtime project data lives directly in the repository: `data/palefire.db`, `data/images/`, and `data/audio/`. The Rust shell exposes the absolute clone-specific paths and dynamically scopes filesystem and asset access to `data/`.
- Solo Crossing private state uses a second, gitignored `data/solo.db` with its own migration chain under `src-tauri/solo-migrations/`. Its frontend connection is lazy: ordinary Palefire boot and core views must not create or open it.
- Audio file `source` column: `file:<name>`, an imported recording stored under `data/audio`. (Palefire is recorded-audio only; the former procedurally generated `builtin:` loops were removed in migration `003_remove_builtin_audio.sql`.)
- SQLite `data/palefire.db-wal` and `data/palefire.db-shm` are ignored runtime sidecars. Palefire must be closed before Git operations that include the database. The tracked `.githooks/pre-commit` guard blocks committing `data/palefire.db` while a non-empty `-wal` exists; activate it per clone with `git config core.hooksPath .githooks`.

## Tone

The app's voice is quiet and literary (see seed content and empty states). The palette and fonts live in `src/styles.css`. Prefer calm, low-stress UI over feature density; this is a tool used live at a game table.

## Model delegation

- You may delegate a task to a smaller model (Sonnet or Haiku) via a subagent when you judge the task simple enough to handle reliably - e.g. mechanical edits, narrow lookups, or well-specified single-file changes.
- When unsure whether a task is simple enough, do not delegate: keep it on the Opus or Fable model.

## Documentation memory

- `docs/design.md` holds durable product and design intent.
- `docs/development.md` holds durable architecture, environment, and troubleshooting knowledge.
- Keep transient session metadata and personal machine notes out of tracked documentation.
- When the user asks to commit and push, review `AGENTS.md` and the relevant durable-memory documents before committing. Update them when the work changes architecture, constraints, setup, workflows, or design intent, then include those documentation updates in the same commit.
- Before committing changes to campaigns or imported media, close Palefire and include `data/palefire.db` and the relevant files under `data/` (images and audio).
- A request to commit and push means commit the intended changes and push them to GitHub's `main` branch. Use another branch only when the user explicitly requests one.
