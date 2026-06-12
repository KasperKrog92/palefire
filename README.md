# Palefire

*A quiet companion for atmospheric tabletop sessions.*

Palefire is a local-first desktop app for game masters who run slow, moody campaigns —
the kind where the room's atmosphere matters as much as the rulebook. It keeps your
scenes, notes and layered ambient soundscapes in one calm place, and stays out of your
way while you play.

Everything lives on your machine: a SQLite database and a folder of images and audio.
No accounts, no cloud, no sync.

![Palefire](app-icon.png)

## What it does

- **Campaigns** — title, description, cover. Switch between them from the harbor screen.
- **Scene Board** — your index cards for the night. Drag to reorder, duplicate, and
  activate; activating a scene crossfades the room into its atmosphere.
- **Archives** — a flexible campaign notebook: characters, locations, factions and notes,
  written in markdown, tagged, optionally illustrated, and linkable to scenes.
- **Atmosphere** — the heart of the app. Layer looping audio into presets with per-layer
  volume and fade timings. Crossfade between moods, ride the mixer live, and when the
  doorbell rings mid-séance: one panic button, instant silence.
- **Live Table** — a calm, large-type view for running the session: active scene, notes,
  linked NPCs a tap away, previous/next scene, and the atmosphere controls that matter.
- **Logbook** — timestamped session notes, nothing more.

Palefire ships with **The Night Ferry**, a small example campaign aboard the MS Aurelia,
including six scenes and six procedurally generated ambience loops (engine hum, north sea
swell, rain on steel, cabin drone, radio static, dock wind).

## Stack

[Tauri v2](https://v2.tauri.app) · React · TypeScript · Tailwind CSS v4 · SQLite
(via `tauri-plugin-sql`) · Web Audio API · Vite

## Development

Prerequisites: Node 20+, Rust (stable, MSVC toolchain on Windows), and the
Microsoft C++ Build Tools.

```sh
npm install
npm run tauri dev      # run the desktop app
npm run typecheck      # TypeScript check
npm run tauri build    # produce the Windows installer (NSIS)
```

The built-in ambience loops and the app icon are generated procedurally — no binary
assets in the repo:

```sh
npm run ambience               # regenerate public/audio/*.wav
node scripts/generate-icon.mjs # regenerate app-icon.png
```

## Where your data lives

| What | Where |
| --- | --- |
| Database | `%APPDATA%/com.palefire.app/palefire.db` |
| Imported images | `%APPDATA%/com.palefire.app/images/` |
| Imported audio | `%APPDATA%/com.palefire.app/audio/` |

Copy those and you've copied the whole harbor.
