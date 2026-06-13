# Development notes

## Architecture

`src-tauri` is a thin desktop shell containing Tauri plugins and database migrations. Application behavior lives in the frontend:

- `src/db/repo.ts` owns SQL access.
- `src/audio/engine.ts` is the singleton Web Audio mixer and crossfade engine.
- `src/projectPaths.ts` reads the repository data paths exposed by the Rust shell.
- `src/stores/` contains the Zustand app, data, and audio stores.
- `src/views/` contains one module per sidebar view.
- `src/db/seed.ts` contains the Nox Trajectus campaign.

## Windows environment

Rust stable with the MSVC toolchain and Visual Studio 2022 Build Tools are required. Cargo may need to be added to a fresh PowerShell session:

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

For normal local use, double-click `Start Palefire.cmd` at the repository root. It
sets Cargo on `PATH`, enables the WebView2 debugging port, and runs `npm run tauri dev`.

`Cargo.lock` pins `time = 0.3.47` because `time = 0.3.48` conflicts with `cookie = 0.18.1`. Do not update it until the upstream dependency chain is fixed.

## Repository data

Palefire reads and writes its working data directly in the clone:

- `data/palefire.db`
- `data/images/`
- `data/audio/`

`src-tauri/src/lib.rs` derives the absolute `data/` path from `CARGO_MANIFEST_DIR`,
registers migrations against that database URL, exposes the paths through the
`project_paths` command, and grants the filesystem and asset-protocol scopes at runtime.
A clone must be rebuilt if it is moved to another path after compilation.

SQLite may create `palefire.db-wal` and `palefire.db-shm` beside the database while the
app is open. They are ignored by Git. Close Palefire before pulling, committing, or
pushing so all changes are checkpointed into `palefire.db`.

A tracked `pre-commit` hook in `.githooks/` enforces this: it blocks any commit that
stages `data/palefire.db` while a non-empty `data/palefire.db-wal` exists, since that
would capture a stale database and drop the unsaved campaign data. The hook is inert
until each clone is pointed at it once:

```powershell
git config core.hooksPath .githooks
```

Run that on every machine (it is local config, not shared). Bypass a single commit with
`git commit --no-verify` if the WAL is a known-harmless leftover.

Because SQLite is a binary file, Git cannot merge campaign edits made independently on
two PCs. Pull before a session and push after it rather than running divergent copies.

## Branding assets

- `app-icon.png` is the canonical square source for the desktop icon.
- `src/assets/palefire-logo.png` is the transparent wordmark used by the frontend.
- Run `npx tauri icon app-icon.png` after replacing the source icon. Commit the Windows
  outputs referenced by `src-tauri/tauri.conf.json` under `src-tauri/icons/`.

## Database and migrations

`tauri-plugin-sql` checksums migration SQL. Never edit a released migration; add a new numbered migration. Keep both protections against Windows line-ending changes:

- `lib.rs` normalizes CRLF to LF before registering migrations.
- `.gitattributes` declares `*.sql text eol=lf`.

Migration `002_player_characters.sql` adds the passenger system:

- `player_characters` stores identity, portrait, fixed attributes, conditions,
  boarding prompts, narrative notes, GM-only fields, and roster order.
- `pc_connections` stores ordered polymorphic links from a passenger to either an
  Archive entry or another passenger.
- `pc_log_entries` stores the passenger-scoped GM log.
- `scene_pc_links` connects passengers to scenes alongside `scene_entry_links`.

`pc_connections.target_kind` + `target_id` cannot use a single foreign key. Deleting
an Archive entry must explicitly remove matching `('archive', id)` rows. Deleting a
passenger must remove both its own rows and inbound `('pc', id)` rows. These cleanup
rules live in `src/db/repo.ts`; normal passenger-owned logs and scene links cascade.

## Cross-view focus

`appStore.ts` carries a one-shot `pendingFocus` target. `focus(view, id)` changes the
sidebar view and asks the destination to select a specific record; the destination
must consume and clear the target. Archives and Passengers use this for structured
connection navigation, and Live Table uses it for "Open full profile".

## Runtime verification

Launch the app with WebView2 remote debugging enabled:

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9223"
npm run tauri dev
```

Drive it with:

```text
node scripts/cdp.mjs <shot|eval|click|clicktext|text> ...
```

WebView2 permits the AudioContext to run without a user gesture in this setup, so audio can be verified headlessly. PowerShell can mangle backticks and nested quotes in `cdp.mjs eval` arguments; prefer single quotes inside JavaScript and unquoted CSS attribute selectors.

## Behavioral invariants

- Keep application boot single-flight through the module-level `bootPromise` in `App.tsx`; React StrictMode runs effects twice in development.
- Audio sources use `builtin:<name>` for generated, tracked files served from `public/audio`, or `file:<name>` for imports under `data/audio`.
