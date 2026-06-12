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

Because SQLite is a binary file, Git cannot merge campaign edits made independently on
two PCs. Pull before a session and push after it rather than running divergent copies.

## Database and migrations

`tauri-plugin-sql` checksums migration SQL. Never edit a released migration; add a new numbered migration. Keep both protections against Windows line-ending changes:

- `lib.rs` normalizes CRLF to LF before registering migrations.
- `.gitattributes` declares `*.sql text eol=lf`.

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
