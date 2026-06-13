# Design intent

Palefire is a local-first Windows tool for tabletop game masters. It favors a handcrafted, atmospheric experience over generic SaaS conventions: no accounts, telemetry, plugin system, or feature density for its own sake. Its core campaign and live-table tools make no network calls.

The sole exception is **Solo Crossing**, an opt-in conversational narrator for the
owner's personal between-session play. It may send selected campaign context to an
LLM provider, but it must remain passenger-bound, off the main navigation, disabled
without a local API key, and isolated from the tracked campaign database. Its full
design and implementation boundary live in [`plans/solo-crossing.md`](plans/solo-crossing.md).

## Product priorities

- Make the app dependable and calm during a live tabletop session.
- Keep scene navigation, notes, and atmosphere controls close at hand.
- Treat player characters as first-class **Passengers**, distinct from the Archives
  that hold NPCs, locations, factions, and notes.
- Prefer focused workflows over broad configuration surfaces.
- Store the campaign locally and make ownership of its files obvious.
- Compress imported artwork on the way in, so a campaign stays light to store, copy,
  and carry while its images remain crisp table reference.

## Passengers

Passenger sheets are GM aids, not a rules engine. They may hold identity, portrait,
boarding prompts, narrative overview, structured campaign connections, scene
presence, private GM notes, and a per-passenger log. Every field is optional; an
unfinished sheet remains useful at the table.

The fixed Night Ferry register uses four attributes rated 1–5: **Body**, **Wits**,
**Heart**, and **Resolve**. Conditions are split between what the body gives
(**Chilled**, **Hurt**, **Spent**) and what the nerve gives (**Shaken**, **Adrift**,
**Haunted**). A full track means the passenger is **Overcome**. These values are
displayed and edited as quiet table-state reminders; Palefire does not roll dice or
derive additional mechanics from them.

Live Table passenger summaries must remain safe to show players. GM-only secrets and
what the ferry may need belong only behind the collapsed curtain on the full sheet.

Solo Crossing begins from a passenger sheet rather than becoming another main
workspace. Its transcript and private memories live outside tracked campaign data.
Model narration is provisional: only an explicit, confirmed promotion may turn part
of a crossing into campaign canon.

## Atmosphere

Atmosphere is built from recorded sound the GM imports — Palefire ships no
generated or bundled audio. A preset layers those recordings with per-layer
volume and fade timings.

A layer is either part of the **ambient bed** or a **one-shot stinger**, decided
by its loop toggle:

- **Looping layers** are the bed. They start automatically when a scene's
  atmosphere activates and crossfade between moods.
- **Non-looping layers** ("plays once") never auto-play. They surface as manual
  trigger buttons in the Live Table helm, so the GM fires a bell, a foghorn, or a
  knock on cue. Panic silences everything, stingers included.

This keeps the live soundscape calm by default — nothing startles the table
unless the GM chooses it.

## Voice and mood

The writing is quiet, literary, and slightly melancholic. The Night Ferry should remain ambiguous rather than leaning on explicit horror cliches. Empty states and labels should feel reassuring and unobtrusive.

The visual language is a warm, dark ferry interior: deep blue-greys, ember and brass accents, Fraunces for expressive type, and IBM Plex for practical UI text. The canonical palette and font definitions live in `src/styles.css`.

The Palefire flame-over-water icon and transparent wordmark are the canonical visual
identity. Keep their proportions intact. In light mode, the interface may render the
wordmark as a dark silhouette for contrast without changing the source artwork.

## Large desktop layout

Palefire is primarily used maximized on a 1920x1200 display. At wide breakpoints,
use the extra room for clearer working structure: broader indexes, additional card
columns, and side-by-side reference material. Keep prose at a comfortable reading
measure rather than stretching text across the window.

Passenger sheets should treat character artwork as first-class table reference.
On large displays, show the full image uncropped beside the sheet while identity,
stats, notes, and controls remain visible in the adjacent column. Smaller windows
must retain the compact single-column layout and the 1080x700 minimum remains a
supported working size.

## Applying this guidance

When choosing between features or layouts, bias toward live-session usability and low cognitive load. New work should feel native to the existing scene board, archives, passengers, atmosphere mixer, Live Table, and logbook rather than introducing a separate product metaphor.

Optional artwork guidance lives in [`visuals.md`](visuals.md).
