# Palefire

*A quiet companion for atmospheric tabletop sessions.*

Palefire is a local-first desktop app for game masters who run slow, moody campaigns —
the kind where the room's atmosphere matters as much as the rulebook. It keeps your
scenes, notes and layered ambient soundscapes in one calm place, and stays out of your
way while you play.

Everything lives directly in the cloned repository: the SQLite database and imported
images and audio. No accounts or sync; the core prep tools make no cloud calls.
The optional, personal Solo Crossing narrator is the one documented exception.

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

Palefire ships with **Nox Trajectus**, the Night Ferry campaign setting. Its archive
contains the vessel, crew, ports, factions, and mysteries needed to begin play without
preparing a fixed route. Bring your own ambience: import recorded sounds and layer them
into atmosphere presets.

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

The Palefire branding assets are committed so a clone already contains every asset:

```sh
npx tauri icon app-icon.png # regenerate src-tauri/icons from the source icon
```

### Moving between PCs

Clone or pull the repository, install dependencies, and run Palefire:

```sh
git pull origin main
npm install
npm run tauri dev
```

Run the session normally. Palefire writes directly to `data/palefire.db`,
`data/images/`, and `data/audio/`. When the session is over, close Palefire before using
Git so SQLite can finish writing the database:

```sh
git add -A
git commit -m "Save campaign after session"
git push origin main
```

Do not run Palefire from two PCs against divergent copies of the database. Git stores the
SQLite file as a binary and cannot merge competing database edits.

## Documentation

- [`AGENTS.md`](AGENTS.md) - coding constraints and repository workflow
- [`docs/design.md`](docs/design.md) - product and visual design intent
- [`docs/development.md`](docs/development.md) - architecture, environment, and troubleshooting
- [`docs/visuals.md`](docs/visuals.md) - optional artwork prompts

## Where your data lives

| What | Where |
| --- | --- |
| Database | `data/palefire.db` |
| Imported images | `data/images/` |
| Imported audio | `data/audio/` |

SQLite may create `data/palefire.db-wal` and `data/palefire.db-shm` while Palefire is
open. They are runtime sidecars and are ignored by Git.
