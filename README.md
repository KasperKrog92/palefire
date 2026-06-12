# Palefire

Palefire is a Windows desktop prototype for a tabletop roleplaying game
master's cockpit. It uses Tauri 2, React, TypeScript, and a small Rust backend.

## Current features

- Campaign, Scenes, and Audio navigation
- Native multi-file audio import into `data/audio`
- File renaming from the audio layer list
- Independent looping playback for each audio layer
- Per-layer enable toggles and volume controls
- Git-friendly JSON persistence in `data/palefire.json`

## Development

```powershell
npm install
npm run tauri dev
```

Build the Windows application with:

```powershell
npm run tauri build
```

The frontend can also run by itself with `npm run dev`. In that mode,
`localStorage` and browser file pickers stand in for the Tauri backend.

## Project data

When Palefire runs from this repository, imported audio and app state are kept
under `data/`. Commit that directory to Git to share the same library and layer
configuration across machines.

When a portable build runs outside a source repository, it creates `data/`
beside `palefire.exe`.
