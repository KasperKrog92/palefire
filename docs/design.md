# Design intent

Palefire is a local-first Windows tool for tabletop game masters. It favors a handcrafted, atmospheric experience over generic SaaS conventions: no accounts, cloud services, AI features, plugin system, or feature density for its own sake.

## Product priorities

- Make the app dependable and calm during a live tabletop session.
- Keep scene navigation, notes, and atmosphere controls close at hand.
- Prefer focused workflows over broad configuration surfaces.
- Store the campaign locally and make ownership of its files obvious.

## Voice and mood

The writing is quiet, literary, and slightly melancholic. The Night Ferry should remain ambiguous rather than leaning on explicit horror cliches. Empty states and labels should feel reassuring and unobtrusive.

The visual language is a warm, dark ferry interior: deep blue-greys, ember and brass accents, Fraunces for expressive type, and IBM Plex for practical UI text. The canonical palette and font definitions live in `src/styles.css`.

## Applying this guidance

When choosing between features or layouts, bias toward live-session usability and low cognitive load. New work should feel native to the existing scene board, archives, atmosphere mixer, Live Table, and logbook rather than introducing a separate product metaphor.

Optional artwork guidance lives in [`visuals.md`](visuals.md).
