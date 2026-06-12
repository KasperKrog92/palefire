# Development notes

## Architecture

`src-tauri` is a thin desktop shell containing Tauri plugins and database migrations. Application behavior lives in the frontend:

- `src/db/repo.ts` owns SQL access.
- `src/audio/engine.ts` is the singleton Web Audio mixer and crossfade engine.
- `src/stores/` contains the Zustand app, data, and audio stores.
- `src/views/` contains one module per sidebar view.
- `src/db/seed.ts` contains The Night Ferry example campaign.

## Windows environment

Rust stable with the MSVC toolchain and Visual Studio 2022 Build Tools are required. Cargo may need to be added to a fresh PowerShell session:

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

`Cargo.lock` pins `time = 0.3.47` because `time = 0.3.48` conflicts with `cookie = 0.18.1`. Do not update it until the upstream dependency chain is fixed.

## Database and migrations

The development database is `%APPDATA%\com.palefire.app\palefire.db`, with adjacent `-wal` and `-shm` files. Remove all three when a full reseed is intentionally required.

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
- Audio sources use `builtin:<name>` for generated files served from `public/audio`, or `file:<name>` for imports under `%APPDATA%\com.palefire.app\audio`.
