# Plan — Player Characters ("Passengers")

Status: proposed (not yet implemented)
Author: planning pass, 2026-06-13

## Goal

Add a dedicated top-level section for the **player characters** — the people the
stories revolve around — separate from the Archives, which keeps holding NPCs,
locations, factions, and notes. Each PC gets:

- an overview and **how it connects to the rest** of the campaign (structured links),
- character details plus a light **stat system**,
- a per-PC **GM log**,
- presence in **scenes**, surfacing on the **Live Table** as a portrait + name that
  opens the passenger's profile,
- and a handful of supporting features chosen below.

This is a GM aid, not a dice roller or a rules engine: stats are **displayed and
edited**, never rolled. Nothing is mandatory; an empty sheet is a valid sheet.

## Decisions locked in (from planning Q&A)

| Question | Decision |
|---|---|
| Stat system | **Bespoke "Year-Zero-lite"** — 4 attributes (1–5) + condition tracks, tuned to the Night Ferry's cozy-horror tone. Vaesen-inspired, lighter, no skill table to maintain. |
| Stat schema | **Fixed global system** baked into the app (all campaigns share the Night Ferry register). |
| Connections | **Structured links** — a PC links to Archive entries and to other PCs, each with a short relationship note; rendered as a Connections panel. |
| Extra features | **All of:** portrait image, the four boarding prompts, conditions tracker, GM-only secrets — plus the additional touches proposed below. |
| Scene presence | Passengers are **linked to scenes** (toggled in the Scene Editor, like Archive entries) and appear on the **Live Table** as portrait + name chips that open the passenger profile. |

### The section's name — decided: "Passengers"

The seed canon already calls player characters **passengers** ("Player characters
belong to this company. They remain passengers."), and the design doc asks new work
to feel native to the Night Ferry rather than introduce a separate product metaphor.

**Decided:** the sidebar entry is **"Passengers"** (subtitle clarifies these are the
player characters), file `src/views/Passengers.tsx`, view id `"passengers"`.

## The stat system (full spec)

A passenger sheet carries four **attributes**, two **condition tracks**, and a light
free-text **expertise** line. No skill list, no derived hit points, no dice.

### Attributes — rated 1–5, shown as dots (●●●○○)

| Attribute | What it covers |
|---|---|
| **Body** | Strength, stamina, a steady hand — the work of ropes, weather, and hard nights. |
| **Wits** | Perception and reason; noticing the small changes before they grow large. |
| **Heart** | Warmth and empathy; the nerve to sit with someone else's grief. |
| **Resolve** | Composure against the strange; the will to hold a door shut. |

Scale read as 1 = frail, 2 = ordinary (default), 3 = capable, 4 = strong,
5 = exceptional. Edited inline on the sheet by clicking a dot.

### Conditions — two tracks of three, then *Overcome*

Conditions are live status the GM toggles at the table. Each is a clickable chip
that lights when active, with a one-line meaning on hover.

**The body gives:**
- **Chilled** — the cold gets in; everything is a little harder.
- **Hurt** — an injury that wants attention.
- **Spent** — out of strength; needs rest, food, the engine's warmth.

**The nerve gives:**
- **Shaken** — frightened; the hands won't stay quite still.
- **Adrift** — unmoored, hopeless; the shore feels imaginary.
- **Haunted** — carrying something witnessed that won't let go.

When all three conditions of **either** track are taken, the passenger is
**Overcome** — they withdraw, are cared for, or are carried by the others until they
recover. "Overcome" is derived from a full track (no separate stored flag), and the
sheet marks it visibly but calmly.

### Expertise (light "skills")

One free-text tag line (reusing the existing `TagInput`) — e.g. `navigation,
medicine, lying well`. Flavor and reminders, not a mechanical skill list. Optional.

## Data model — new migration `002_player_characters.sql`

Follows the existing column-oriented style (`archive_entries`) and tag-as-TEXT
pattern. Three new tables; nothing in `001_initial.sql` changes (invariant: never
edit a released migration — add a numbered one).

```sql
CREATE TABLE player_characters (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  player        TEXT NOT NULL DEFAULT '',   -- who plays them, GM convenience
  concept       TEXT NOT NULL DEFAULT '',   -- one-line role/concept
  pronouns      TEXT NOT NULL DEFAULT '',
  age           TEXT NOT NULL DEFAULT '',    -- free text or Young/Middle-aged/Old
  image         TEXT,                        -- portrait, data/images via ImagePicker

  -- attributes (1..5)
  body          INTEGER NOT NULL DEFAULT 2,
  wits          INTEGER NOT NULL DEFAULT 2,
  heart         INTEGER NOT NULL DEFAULT 2,
  resolve       INTEGER NOT NULL DEFAULT 2,
  expertise     TEXT NOT NULL DEFAULT '',    -- comma tags, light skills

  conditions    TEXT NOT NULL DEFAULT '',    -- comma keys: chilled,hurt,spent,shaken,adrift,haunted

  -- boarding prompts (seed canon: the "Player Characters" note)
  carrying      TEXT NOT NULL DEFAULT '',    -- something they carry
  left_behind   TEXT NOT NULL DEFAULT '',    -- a place left badly / never properly left
  comfort       TEXT NOT NULL DEFAULT '',    -- a small comfort accepted from strangers
  question      TEXT NOT NULL DEFAULT '',    -- a question they'd rather answer later
  the_pull      TEXT NOT NULL DEFAULT '',    -- how they were drawn aboard

  -- narrative
  overview      TEXT NOT NULL DEFAULT '',    -- markdown bio / "how they connect" prose
  secret        TEXT NOT NULL DEFAULT '',    -- GM-only: a twist the player doesn't know
  ferry_needs   TEXT NOT NULL DEFAULT '',    -- GM-only: what the ferry may need from them

  position      INTEGER NOT NULL DEFAULT 0,  -- roster order
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pc_connections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id         INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  target_kind   TEXT NOT NULL CHECK (target_kind IN ('archive','pc')),
  target_id     INTEGER NOT NULL,            -- archive_entries.id or player_characters.id
  relationship  TEXT NOT NULL DEFAULT '',    -- short note: "estranged sister", "owes a debt"
  position      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE pc_log_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pc_id         INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- passengers present in a scene; mirrors scene_entry_links exactly
CREATE TABLE scene_pc_links (
  scene_id      INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  pc_id         INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  PRIMARY KEY (scene_id, pc_id)
);

CREATE INDEX idx_pcs_campaign        ON player_characters (campaign_id, position);
CREATE INDEX idx_pc_connections_pc   ON pc_connections (pc_id);
CREATE INDEX idx_pc_logs_pc          ON pc_log_entries (pc_id, created_at);
CREATE INDEX idx_scene_pc_links_pc   ON scene_pc_links (pc_id);
```

Notes:
- **Polymorphic connection target.** `pc_connections` can't FK both archive entries
  and PCs, so it uses `target_kind` + `target_id` resolved in the app layer. Deleting
  an Archive entry or a PC can orphan rows; the repo's PC-delete cascades its own
  rows, and the UI filters out connections whose target no longer resolves. A small
  cleanup pass (delete `('archive', id)` rows on archive delete; delete both
  directions of `('pc', id)` rows on PC delete) lives in `repo.ts` — see below.
- Conditions are stored as a comma list (mirrors the `tags` convention) rather than
  six boolean columns, so the set stays easy to extend.

### Migration registration (`src-tauri/src/lib.rs`)

The shell currently leaks one normalized migration string and registers version 1.
Add the second, normalized identically (CRLF→LF, invariant):

```rust
let pcs: &'static str = Box::leak(
    include_str!("../migrations/002_player_characters.sql")
        .replace("\r\n", "\n")
        .into_boxed_str(),
);
let migrations = vec![
    Migration { version: 1, description: "initial_schema",  sql: initial, kind: MigrationKind::Up },
    Migration { version: 2, description: "player_characters", sql: pcs,    kind: MigrationKind::Up },
];
```

`*.sql text eol=lf` in `.gitattributes` already covers the new file. No capability
change is needed — `sql:allow-execute`/`sql:allow-select` in
`capabilities/default.json` are table-agnostic.

**DB-evolution note:** the tracked `data/palefire.db` is at version 1. The first
launch after this change applies migration 2 in place, which is the repo's normal
pattern (the DB is tracked and evolves). Per `AGENTS.md`, close Palefire before any
commit that includes the upgraded `data/palefire.db`, and respect the pre-commit WAL
guard.

## Types (`src/types.ts`)

Add interfaces and the fixed metadata tables the UI maps over:

- `PlayerCharacter` (mirrors the columns; attributes typed as `number`).
- `PcConnection` (`{ id, pc_id, target_kind: "archive" | "pc", target_id, relationship, position }`).
- `PcLogEntry` (`{ id, pc_id, body, created_at }`).
- `ScenePcLink` (`{ scene_id, pc_id }`, mirroring `SceneEntryLink`).
- `PC_ATTRIBUTES`: `[{ key: "body", label: "Body", blurb }, …]` for `wits`, `heart`, `resolve`.
- `PC_CONDITIONS`: `[{ key, label, track: "body" | "nerve", meaning }, …]` for the six.
- Reuse `parseTags`/`joinTags` for `conditions` and `expertise`; add a tiny
  `isOvercome(conditions: string[])` helper (true when a whole track is present).

## Repo layer (`src/db/repo.ts`)

New exported objects following existing shapes:

- `playerCharacters`: `forCampaign`, `create`, `update`, `setStats` (cheap inline
  attribute/condition writes that `touch` updated_at), `reorder(orderedIds)`,
  `remove`. `remove` first deletes the PC's own connections and any `('pc', id)`
  connection rows pointing **at** it from other PCs.
- `pcConnections`: `forCampaign(campaignId)` (join via `player_characters` so the
  store can hold them all), `forPc(pcId)`, `add`, `updateNote`, `remove`,
  `removeForArchiveEntry(entryId)` (called from `archive.remove` to clear orphans).
- `pcLog`: `forPc(pcId)`, `create(pcId, body)`, `remove(id)` — mirrors `logbook`.

Extend the existing `scenes` object (mirroring its `scene_entry_links` helpers) with
scene↔passenger links: `linkedPcIds(sceneId)`, `setLinkedPcs(sceneId, pcIds)`,
`pcLinksForCampaign(campaignId)`, and `scenesLinkedToPc(pcId)` (for the passenger
sheet's "Appears in"). Update `scenes.duplicate` to copy the duplicated scene's PC
links as well as its entry links.

Wire `archive.remove` to also call `pcConnections.removeForArchiveEntry` so deleting
an NPC doesn't leave dangling links (and Archives already reloads entries/scenes
after delete; it'll also reload PC connections).

## Stores

- `appStore.ts`: extend `View` with `"passengers"` and add a lightweight cross-view
  focus channel so a Connections link can open the right place:
  `pendingFocus: { view: View; id: number } | null` plus
  `focus(view, id)` (sets view + pendingFocus) and `clearFocus()`. Archives and
  Passengers consume `pendingFocus` on mount/update to select the target entry/PC.
- `dataStore.ts`: add `playerCharacters: PlayerCharacter[]` and
  `pcConnections: PcConnection[]` to state, load both in `loadAll`, and add
  `reloadPlayerCharacters` / `reloadPcConnections`. Add `pcLinks: ScenePcLink[]` and
  fold its fetch into the existing `fetchScenes` helper so `reloadScenes` refreshes
  both entry links and passenger links together. Per-PC GM **logs are fetched
  lazily** inside the view for the selected PC (kept out of the global store to keep
  it small), matching nothing-preloads-everything pragmatism.

## Navigation (`src/shell/Shell.tsx` + `icons.tsx`)

- Add a `Passengers` icon to `icons.tsx` (no person/cast glyph exists yet — a simple
  head-and-shoulders figure, or a two-figure group, in the established 24×24 /
  1.7-stroke style).
- Insert a NAV item **after Archives**: `{ view: "passengers", label: "Passengers",
  icon: <Passengers/> }`, and render `{view === "passengers" && <Passengers />}` in
  `<main>`.

## The Passengers view (`src/views/Passengers.tsx`)

Two-pane master/detail, mirroring `Archives.tsx` so it feels native.

### Left rail — the roster ("how it connects, at a glance")

- "New passenger" button in the `ViewHeader`.
- A reorderable list of PCs; each row shows portrait thumbnail, name, and the
  `player` / `concept` line. This roster is the at-a-glance overview.
- Calm empty state in the Night Ferry voice (passengers are drawn aboard by the
  pull; the roster fills as players board).

### Right pane — the sheet

Sections, top to bottom:

1. **Header** — portrait, name, pronouns · age, player, one-line concept; Edit and
   Delete buttons (Edit opens the modal below).
2. **Stats** — the four attributes as inline-editable dot ratings; the six condition
   chips in two labelled tracks, toggled live; an "Overcome" marker when a track
   fills; the expertise tags.
3. **Overview** — markdown prose (`Markdown` component), the character and how they
   connect in words.
4. **Boarding** — the four canonical prompts (carrying / left behind / comfort /
   question) and **the Pull**, shown as a quiet labelled list; blanks are simply
   omitted.
5. **Connections** — structured links grouped by kind (crew/NPCs, locations,
   factions, other passengers), each with its relationship note. Clicking a link
   uses `appStore.focus(...)` to open that Archive entry or passenger. An "Add
   connection" control opens a picker over the campaign's Archive entries and other
   PCs, with a relationship-note field. (Optional nicety: show reciprocal links on
   the target's Archive entry — deferred unless wanted.)
6. **Behind the curtain** (GM-only) — `secret` and `ferry_needs`, in a visually
   distinct, **collapsed-by-default** panel with a reveal toggle. This is not access
   control (the GM is the only user); it keeps spoilers off-screen when the window is
   shown to players (e.g. during the Live Table).
7. **GM log** — a per-PC timestamped log reusing the Logbook UX (compose box,
   Enter-to-log, date grouping via `splitTimestamp`), scoped to this passenger and
   fetched lazily on selection.

### Editing model

- **Inline & live** on the sheet: attribute dots, condition chips, connections, and
  the GM log — the things touched mid-session.
- **Modal editor** ("Edit passenger", reusing `Modal` + `Field`/`Input`/`TextArea`/
  `ImagePicker`/`TagInput`, like `EntryEditor`) for the slower fields: identity,
  portrait, overview, boarding prompts, the Pull, secret, and ferry-needs. A
  Write/Preview toggle on the markdown overview, matching Archives.

## Scene presence & the Live Table

Passengers are tied to scenes the same way Archive entries already are, then surfaced
prominently on the live-session screen.

### Scene Editor (`src/views/SceneEditor.tsx`)

Below the existing "Linked archive entries" block, add a **"Cast in this scene"**
field: the campaign's passengers as toggle chips (portrait thumbnail + name), backed
by a `linkedPcs: Set<number>` loaded via `scenes.linkedPcIds(scene.id)` and saved
with `scenes.setLinkedPcs(id, [...linkedPcs])` alongside the existing
`setLinkedEntries` call. Same visual language as the entry toggles.

### Scene Board (`src/views/SceneBoard.tsx`)

The scene card's link-count chip currently counts only entry links. Add a small,
distinct **cast indicator** (person icon + count, or up to ~3 overlapping portrait
avatars) sourced from `pcLinks`, so a scene's passengers are legible at a glance
without conflating them with archive links.

### Live Table (`src/views/LiveTable.tsx`)

This is the payoff. For the active scene, derive its linked passengers from `pcLinks`
and render a **cast strip** — each passenger as a portrait avatar + name chip (larger
and warmer than the existing text-only entry pills), placed with the linked-entry
pills under the scene title.

Clicking a passenger opens a **profile drawer** (reusing the existing right-side
drawer pattern, parallel to the archive-entry drawer): portrait, the four attribute
dots, any active conditions, and the markdown overview — a read-at-the-table summary.
The drawer carries an **"Open full profile"** action that calls
`appStore.focus("passengers", id)` to jump to the full sheet in the Passengers view.
The GM-only "Behind the curtain" content is **not** shown in this drawer (the Live
Table is the screen most likely to face players).

Portraits reuse `useStoredImage` / `CoverImage`; passengers without a portrait fall
back to an initial or the existing `fallbackCover` treatment.

### Passenger sheet — "Appears in"

The sheet (right pane of the Passengers view) gains a small **"Appears in"** panel,
mirroring the Archive `EntryView`: the scenes this passenger is linked to, via
`scenes.scenesLinkedToPc(pc.id)` (or filtered from `pcLinks` + `scenes` in the
store). Reinforces "how they connect" and closes the loop with the Scene Board.

## Seeding (`src/db/seed.ts`)

**Leave the roster empty by default**, consistent with scenes/presets/logbook
starting empty and with the canon that players create their own passengers. The
existing Archives "Player Characters" note (GM how-to) stays where it is as guidance.
Optional: seed one or two example passengers to demonstrate the sheet — only if you
want a populated first-run; recommended **off**.

## Documentation to update (same change)

Per the `AGENTS.md` workflow, fold these into the implementing commit:

- `docs/design.md` — note Passengers as a first-class section and the bespoke
  stat/condition vocabulary as part of the product's design intent.
- `docs/development.md` — record migration `002`, the four tables (incl.
  `scene_pc_links`), the cross-view focus channel, and the polymorphic-connection
  cleanup rule.
- `AGENTS.md` — one line in the architecture breath if the view roster is enumerated.

## Verification

- `npm run typecheck` (gate before commit).
- `npm run tauri dev` with WebView2 remote debugging; drive with
  `node scripts/cdp.mjs` to: create a passenger, set attributes/conditions, add a
  connection to an existing NPC and confirm the link navigates, add and delete a GM
  log note, reveal/hide the GM-only panel, edit via the modal, reorder the roster,
  delete a passenger (and confirm its connections and an NPC's reciprocal links are
  gone). Link the passenger to a scene in the Scene Editor, activate that scene, and
  confirm it appears on the Live Table as portrait + name, the drawer opens, and
  "Open full profile" lands on the right sheet; confirm the sheet's "Appears in"
  lists that scene and deleting the passenger clears the scene link. Confirm
  migration 2 applied cleanly to the existing `data/palefire.db`.

## Out of scope / possible later

- A visual relationship graph (the "+ map" option was not chosen).
- Per-campaign customizable stat schemas (global fixed system chosen).
- Reciprocal connection rendering on Archive entries (easy follow-up if wanted).

## Implementation order (suggested)

1. `migrations/002_player_characters.sql` (incl. `scene_pc_links`) + register
   version 2 in `lib.rs`.
2. `types.ts` interfaces (incl. `ScenePcLink`) + `PC_ATTRIBUTES` / `PC_CONDITIONS` /
   `isOvercome`.
3. `repo.ts` — `playerCharacters`, `pcConnections`, `pcLog`; scene↔passenger link
   helpers + `duplicate` copy; hook `archive.remove`.
4. `dataStore.ts` (incl. `pcLinks`) + `appStore.ts` (View + focus channel) wiring.
5. `icons.tsx` Passengers icon; `Shell.tsx` nav + route.
6. `views/Passengers.tsx` — roster, sheet (incl. "Appears in"), modal editor,
   connections picker, GM log.
7. Scene wiring: `SceneEditor.tsx` cast toggles, `SceneBoard.tsx` cast indicator,
   `LiveTable.tsx` cast strip + profile drawer.
8. Docs updates; `npm run typecheck`; runtime verification.
```

