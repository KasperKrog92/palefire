# Plan — Solo Crossing (conversational play between sessions)

Status: **Phase 1 complete** — local crossing lifecycle is implemented; AI conversation has not started.
Last revised: 2026-06-13
Scope: add one deliberately bounded AI feature to the owner's personal Palefire
clone without changing the local-first behavior of the core campaign tools.

Solo Crossing is a sanctioned exception to Palefire's otherwise local-only stance.
The owner has explicitly approved cloud AI for this personal, single-user feature.
The implementation must preserve that narrow boundary: no accounts, telemetry,
plugin system, background network activity, or AI behavior elsewhere in the app.

---

## 1. Decisions already made

These are implementation constraints, not open questions:

1. **Build the feature.** Solo Crossing is approved for the owner's personal clone.
2. **Use Anthropic first.** The first implementation calls the Claude API directly
   from the Tauri webview through the official TypeScript SDK.
3. **Read the key only from `.env.local`.** The variable is
   `VITE_ANTHROPIC_API_KEY`. There is no key-entry UI and the key is never written
   to either database.
4. **Keep Solo Crossing private and separate.** Crossings, messages, summaries,
   memories, consent state, and usage records live in gitignored `data/solo.db`.
5. **Keep canon in the tracked database.** Solo Crossing may read campaign data
   from `data/palefire.db`; only an explicit, confirmed promotion may write back.
6. **Enter through a Passenger.** Solo Crossing is not added to the main sidebar.
   A passenger sheet opens that passenger's crossing index or active crossing.
7. **Use one literary narrator.** The narrator may voice crew and NPCs in prose,
   but v1 does not model separate autonomous agents or character bots.
8. **Keep memories private by default.** Promotion into campaign canon is offered
   only when the owner asks for it, never as an interrupting automatic prompt.
9. **Renderer transport is acceptable for this personal tool.** Moving the key and
   HTTP transport into Rust is a future hardening step required only before the app
   is distributed to other users.
10. **No local-model provider in v1.** Preserve a provider boundary, but do not
    build Ollama/OpenAI support until the core experience has proved worthwhile.

### Design principles that fall out of this

- **Off by default.** Without `VITE_ANTHROPIC_API_KEY`, there is no network access
  and the UI explains how to enable the personal feature. `solo.db` is opened only
  when Solo Crossing is entered.
- **A side room, not a new floor.** Solo Crossing is reachable from a Passenger,
  not a sixth pillar of the live-table workflow. It must not change the calm of
  Scene Board / Archives / Atmosphere / Live Table / Logbook.
- **The model is a guest, never the author of canon.** Nothing it says becomes a
  saved campaign fact unless the GM promotes it (§7, §8).
- **Personal play stays personal.** Transcripts are private creative writing; they
  should not be force-committed to the shared campaign repo (§5, §9).

---

## 2. Feature overview

**Solo Crossing** lets the owner play a single recurring **passenger** aboard the
Night Ferry between real-life sessions, in conversation with an LLM that narrates
scenes, crossings, ports, and the people aboard. It is slow, atmospheric, single-
player, and asynchronous — a quiet way to inhabit a character and, as a side
effect, grow setting lore and campaign material the GM can later fold into the
real campaign.

A *crossing* is one ongoing thread, bound to one passenger. Over many sittings the
thread accumulates: a transcript, a set of **remembered** facts (people, places,
relationships, unfinished threads) that the GM has chosen to keep, and an evolving
sense of the character. Recurring crew and NPCs already in the Archives can appear;
new ones the model invents stay provisional until promoted.

It explicitly is **not**: a generic AI RPG, a dice/mechanics engine, a random
content generator, or a lore-dump machine. The seed canon already names the failure
modes (see `Tone and Table Practice` → *Avoid*: "Explaining the ferry too quickly,"
"Resolving a mystery simply because it has appeared," and `Open Doors`: "Some doors
are better left ajar"). Those lines are, almost verbatim, the guardrails for the
narrator (§8).

---

## 3. Goals / non-goals

### Goals

- A focused, reading-first conversational mode where the user plays one passenger.
- Continuity across sittings: the thread remembers what the GM chose to keep.
- The narrator is grounded in *this* campaign — its Archives, its passenger sheets,
  its canon and tone — not generic fantasy.
- The mode produces material (NPCs, ports, relationships, lore fragments) the GM can
  *optionally* promote into the real campaign, with confirmation.
- Atmosphere and image controls can be *suggested* by the narrator and applied with
  one tap, reusing the existing audio/preset and image systems.
- Cozy horror preserved: ambiguity, emotional realism, slow pacing, unresolved
  mystery, restraint over exposition.

### Non-goals

- No dice, initiative, hit points, or rules adjudication. (Passenger attributes and
  conditions remain *displayed* table-state, consistent with the existing decision
  that "stats are displayed and edited, never rolled.")
- No multiplayer / shared sessions in v1.
- No live-at-the-table use. This is *between* sessions, on purpose.
- No image generation (would need an image API; conflicts with the "import &
  compress your own media" ethos and adds cost/complexity). The model may *reference*
  existing stored images, not create new ones.
- No autonomy: the model never writes canon, never plays the atmosphere, never edits
  the sheet on its own.
- No plugin system, no accounts, no telemetry.

---

## 4. Technical architecture

Palefire's shape (`AGENTS.md`): `src-tauri` is a thin shell (sql/fs/dialog plugins
+ numbered migrations); **all logic is in the frontend** (`src/db/repo.ts`,
`src/audio/engine.ts`, `src/stores/*`, `src/views/*`, `src/db/seed.ts`). Solo
Crossing should follow that grain, with one new concern the app has never had:
**outbound HTTP to an LLM provider**.

### 4.1 Where the LLM call happens

The app is a WebView. `tauri.conf.json` sets `security.csp: null`, so the webview's
`fetch` is **not** blocked by a Tauri-injected CSP. But the app currently has **no
HTTP capability and no `tauri-plugin-http`** (see `Cargo.toml`,
`capabilities/default.json`), and a browser-origin call to `api.anthropic.com` hits
CORS unless explicitly allowed.

**Initial implementation — renderer-side.** Use the official
`@anthropic-ai/sdk` in the renderer with `dangerouslyAllowBrowser: true`, plus the
browser access it enables. The SDK provides typed streaming, errors, prompt caching,
and token counting. Read the key from
`import.meta.env.VITE_ANTHROPIC_API_KEY`; never persist or log it.

This choice is acceptable because Palefire is a personal local app that loads no
remote HTML and has no plugins or untrusted users. It has one important release
constraint: a Vite `VITE_*` value is bundled into a production renderer build.
Therefore, do not publish or share an installer built with the owner's key present.

**Future distribution hardening — Rust-side.** If Palefire is ever distributed,
replace the renderer transport with a small Rust `reqwest` command or a narrowly
scoped HTTP plugin, stream events over a Tauri channel, and store credentials in
Windows Credential Manager. The provider interface must keep that swap out of the
view and context code. This is not part of the initial implementation.

### 4.2 Module layout (mirrors existing conventions)

```
src/solo/
  types.ts         # crossing/message/memory/provider domain types
  db.ts            # lazy second Database.load connection
  repo.ts          # all SQL against solo.db
  provider.ts      # provider interface
  anthropic.ts     # Anthropic SDK implementation
  context.ts       # assembles system prompt + message window from campaign data
  bible.ts         # distills the seed canon into the narrator "setting bible"
  memory.ts        # proposed→kept memory model + promotion helpers
  prompts.ts       # restraint/tone instructions, the "ferry etiquette"
src/views/SoloCrossing.tsx # conversation view, entered from a Passenger
src/stores/soloStore.ts   # active crossing, streaming state, pending suggestions
src-tauri/solo-migrations/001_initial.sql
```

Supporting changes:

- `src/projectPaths.ts` and `src-tauri/src/lib.rs` expose/register the absolute
  `data/solo.db` URL and its own numbered migration chain.
- `src/vite-env.d.ts` types `VITE_ANTHROPIC_API_KEY` and the optional
  `VITE_ANTHROPIC_MODEL`.
- `.env.example` documents variable names with blank values; `.env.local` remains
  ignored by the existing `*.local` rule.
- `.gitignore` explicitly ignores `data/solo.db`, `data/solo.db-wal`, and
  `data/solo.db-shm`.
- `src/stores/appStore.ts` gains a non-sidebar `"solo-crossing"` view and a focused
  passenger/crossing target.
- `src/shell/Shell.tsx` renders that view without adding it to `NAV`.
- `src/views/Passengers.tsx` adds the entry action to the selected passenger sheet.

Settings shows feature availability, current model, disclosure/redaction controls,
and the local `solo.db` path. It never displays or edits the API key.

### 4.3 The conversation loop (high level)

1. User opens a crossing for a passenger; picks up the existing thread or starts one.
2. On send, `context.ts` assembles: the **setting bible** (cached system prompt) +
   the passenger sheet + relevant recurring characters + **kept** memories + a rolling
   summary + the last N transcript turns + the user's new message.
3. The provider streams narration back; the renderer renders it as it arrives.
4. The turn (user + narrator) is appended to the transcript store.
5. Optionally the model emits **side-channel suggestions** (remember this? / shift
   the atmosphere? / show this portrait?) which surface as quiet, dismissable chips —
   never auto-applied (§7, §8).

---

## 5. Memory & persistence model

Two kinds of state, with very different politics:

- **The transcript** — turn-by-turn play. Large, personal, append-on-send. This is
  the user's private creative writing.
- **Canon** — Archives entries, passenger sheets, `pc_connections`. Small, shared,
  the actual campaign. Lives in the tracked `data/palefire.db` that gets pushed to
  GitHub.

**Key insight:** these should not share a storage lifecycle. The tracked DB is
committed and pushed (`AGENTS.md`), and SQLite can't merge, so piling chat volume
into it is both a privacy problem (personal play in a shared repo) and a
git-friction problem. Keeping the transcript out of the tracked DB *also* solves the
"don't pollute canon" requirement: ephemeral play stays local and uncommitted, and
**only what the GM explicitly promotes** flows into the tracked campaign.

### 5.1 Recommended split

- **Solo Crossing data → a separate, gitignored SQLite database**, e.g.
  `data/solo.db` (add to `.gitignore` next to the existing `*.db-wal`/`-shm`
  entries). Open it as a second `Database.load(...)` connection. Holds crossings,
  messages, summaries, and *proposed/kept* memories.
- **Promoted canon → the existing tracked `data/palefire.db`** via the normal repo
  helpers (`archive.create`, `pcConnections.add`, `playerCharacters.update`), exactly
  as if the GM had typed it. Promotion is the only bridge between the two stores.

This cleanly answers an open question the brief raises ("how to access existing
campaign data"): the narrator *reads* from `palefire.db` (Archives, Passengers,
canon) and *writes proposals* to `solo.db`; nothing crosses back without a tap.

### 5.2 Initial schema (in `solo.db`, its own migration chain)

```sql
CREATE TABLE crossings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id   INTEGER NOT NULL,        -- references palefire.db campaigns.id (logical, not FK)
  pc_id         INTEGER NOT NULL,        -- the passenger being played (logical ref)
  title         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'open',  -- open | adrift (paused) | ashore (ended)
  summary       TEXT NOT NULL DEFAULT '',      -- rolling "the story so far" memo
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  crossing_id   INTEGER NOT NULL REFERENCES crossings(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,           -- passenger | narrator | aside (GM/system note)
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'complete', -- streaming | complete | failed
  reply_to_message_id INTEGER REFERENCES crossing_messages(id) ON DELETE SET NULL,
  provider_id   TEXT,                    -- provider request/message id when available
  stop_reason   TEXT,
  in_context    INTEGER NOT NULL DEFAULT 1,  -- 0 once compacted out of the live window
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_memories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  crossing_id   INTEGER,                 -- null = campaign-wide memory
  campaign_id   INTEGER NOT NULL,
  pc_id         INTEGER,                 -- optional subject
  kind          TEXT NOT NULL,           -- person | place | relationship | thread | lore | object
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'proposed',  -- proposed | kept | archived
  source_message_id INTEGER,            -- which narrator turn proposed it
  promoted_to   TEXT,                    -- e.g. 'archive:42' once folded into canon
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_suggestions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  crossing_id   INTEGER NOT NULL REFERENCES crossings(id) ON DELETE CASCADE,
  source_message_id INTEGER NOT NULL REFERENCES crossing_messages(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,           -- atmosphere | image
  payload_json  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | applied | dismissed
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_settings (        -- key/value, mirrors settings table
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);

CREATE INDEX idx_crossings_subject
  ON crossings(campaign_id, pc_id, status, updated_at);
CREATE INDEX idx_crossing_messages_thread
  ON crossing_messages(crossing_id, id);
CREATE INDEX idx_crossing_memories_status
  ON crossing_memories(crossing_id, status);
CREATE INDEX idx_crossing_suggestions_status
  ON crossing_suggestions(crossing_id, status);
```

Conventions match the existing repo (column-oriented, `datetime('now')`, comma-tag
text fields, `position`-style ordering where useful). Cross-store references
(`campaign_id`, `pc_id`) are *logical* — they can't be SQLite FKs across files — so
the UI filters out memories whose subject no longer resolves, the same way
`pc_connections`' polymorphic targets are handled today.

### 5.3 Context budgeting (so long crossings don't balloon cost)

- Keep a **rolling summary** (`crossings.summary`) regenerated every N turns; older
  messages get `in_context = 0` and drop out of the live window but stay in the
  transcript for the reader.
- Or, later, use the API's server-side **compaction** beta (supported on Opus
  4.6+/Sonnet 4.6) and store the returned compaction blocks. v1 should do the simple
  rolling-summary approach to stay provider-agnostic.

---

## 6. API / provider considerations

Write a thin **provider interface** so a future provider or transport change is a
swap, not a rewrite:

```ts
interface CrossingProvider {
  stream(req: {
    system: SystemBlock[];      // cacheable setting bible
    messages: ChatTurn[];
    signal: AbortSignal;
  }): AsyncIterable<StreamChunk>;   // text deltas + optional structured suggestions
}
```

### 6.1 Anthropic (v1 provider)

Per the current Claude API reference:

API details in this plan were checked on 2026-06-13 against Anthropic's official
[models](https://docs.anthropic.com/en/docs/about-claude/models),
[prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching),
[token counting](https://docs.anthropic.com/en/api/messages-count-tokens), and
[data retention](https://docs.anthropic.com/en/docs/build-with-claude/zero-data-retention)
documentation. Re-check those pages at implementation time; model IDs, prices, and
feature flags are not durable product constants.

- **Model:** default `claude-sonnet-4-6`; it is the better balance of prose quality,
  latency, and recurring-session cost for this feature. Allow an optional
  `VITE_ANTHROPIC_MODEL` override so model changes do not require source edits.
  Settings may offer known model IDs later, but the environment override is enough
  for v1 and avoids treating a fast-moving model list as durable UI.
- **Pricing (per 1M tokens), to surface in the UI so cost is never a surprise:**
  Opus 4.8 $5 in / $25 out; Sonnet 4.6 $3 / $15; Haiku 4.5 $1 / $5.
- **Thinking:** adaptive (`thinking: {type: "adaptive"}`). For a narrator we likely
  want low latency and restraint — start at `output_config: {effort: "low"}` or
  `"medium"`; high effort tends to over-produce, which fights slow pacing.
- **Streaming:** required for the live "ink arriving" feel; use SSE (`messages.stream`
  in the SDK).
- **No prefills** on Opus 4.8 — shape output via the system prompt and (if we ever
  need structured suggestions guaranteed) `output_config.format`, not an assistant
  prefill.
- **Prompt caching is the cost lever.** The setting bible + passenger sheet form a
  large, stable prefix that repeats every turn. Start with top-level automatic
  `cache_control: { type: "ephemeral" }`; move to explicit breakpoints only if usage
  data shows a reason. Cache reads cost ~0.1× and five-minute writes ~1.25×. Keep the prefix
  byte-stable (no timestamps/`Date.now()` interpolated into it) — put volatile
  content (recent turns, the new message) later. Do not pad prompts merely to reach
  a cache minimum. Verify actual cache behavior with
  `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens`.
- **Token counting:** use `messages.countTokens` to show the user the size of a
  crossing's context and to drive the rolling-summary trigger — never `tiktoken`.
- **Mid-conversation system messages** are a possible later optimization for
  injecting newly kept memories without invalidating an earlier cached prefix.
  They are not needed for v1.

### 6.2 Other providers (future)

OpenAI or a local Ollama/llama.cpp endpoint may be added later. Keep the provider
interface generic enough for that possibility, but do not add settings, dependencies,
or transport code for unimplemented providers.

### 6.3 Key & config storage (security-critical)

- **Never store the API key in `data/palefire.db`** — that file is committed and
  pushed to GitHub. A key there is a leaked key. (This is the single most important
  security note in this document.)
- v1 reads `VITE_ANTHROPIC_API_KEY` from gitignored `.env.local`. Do not add a key
  field, key validation endpoint, or database setting.
- `.env.example` contains only blank placeholders and a warning that `VITE_*`
  values are embedded in production bundles.
- Consent, redaction preferences, and soft budget are non-secret and live in
  `crossing_settings` inside ignored `solo.db`.
- A future distributed build moves the key to Windows Credential Manager together
  with the Rust-side transport.

---

## 7. Atmosphere / audio / image integration

The existing audio philosophy (`docs/design.md`): "nothing startles the table unless
the GM chooses it." Solo Crossing must respect that — **suggested, never
auto-played.**

- **Mood suggestions → existing presets.** The narrator can call the
  `suggest_atmosphere` client tool with a mood or target preset. The app matches it
  to an existing preset (by name/description/tag) and surfaces a one-tap **"Shift the air →
  <preset>"** chip that calls `useAudio().playPreset(...)` with the campaign's normal
  crossfade. No match → no chip. Never auto-applied.
- **One-shot stingers.** A bell, a foghorn, a knock can be offered as a tap that
  calls `audio.trigger(file, volume)` — the same manual one-shot path the Live Table
  helm already uses. Panic still silences everything.
- **Images → existing stored art.** The narrator can reference an Archive entry or
  passenger by name; the app shows that record's existing portrait/cover via
  `useStoredImage` / `CoverImage` beside the prose. It does **not** generate images.
- **Reuse, don't reinvent.** All of this rides on `audioStore`, `engine`, the preset
  tables, and `StoredImage` — no new audio/image infrastructure.

Implementation note: use Anthropic client tools for structured proposals rather
than parsing fenced pseudo-JSON from prose. Tool calls such as `propose_memory`,
`suggest_atmosphere`, and `suggest_image` are interpreted locally as suggestions;
they never receive write-capable tools and never execute automatically.

---

## 8. Keeping the narrator restrained (no over-explaining, no hard canon)

This is the make-or-break quality bar. Several reinforcing mechanisms:

1. **The system prompt is built from the campaign's own canon.** `bible.ts` distills
   the seed notes — `Tone and Table Practice`, `Open Doors`, `The Pull`,
   `Why the Ferry Docks`, `Running a Crossing` — into the narrator's instructions.
   The *Avoid* list ("Explaining the ferry too quickly," "Turning every anomaly into
   danger," "Resolving a mystery simply because it has appeared") becomes literal
   negative guidance. The campaign already wrote its own anti-slop guide; we hand it
   to the model.
2. **Restraint instructions** (`prompts.ts`): favour sensory texture over
   exposition; introduce at most one small strange detail per scene; end on open
   questions; never reveal the ferry's origin or the cat's nature; keep turns short
   (slow pacing is a feature). Phrase as positive examples — recent Opus follows the
   system prompt closely, so heavy-handed "CRITICAL: YOU MUST" language overtriggers;
   keep it calm.
3. **Low effort / modest `max_tokens`.** A narrator that thinks less and writes less
   reads as more patient. This is a tuning lever, not just cost control.
4. **Hard separation of narration from canon.** Nothing the model says is saved as a
   fact. Narration is transcript; canon is only what the GM promotes (§5, §9). This
   structurally prevents "hard-canonizing everything."
5. **Proposals default to off.** When the model thinks something is worth
   remembering, it *proposes* (a `proposed` memory) — it does not assert. The GM
   reviews and keeps or discards. Default action is *discard*, not *keep*.
6. **"Some doors are better left ajar" as a standing instruction.** Explicitly tell
   the model that unresolved is the goal, that it should resist closing mysteries,
   and that ambiguity is correct rather than a gap to fill.

---

## 9. What requires confirmation before saving

| Action | Confirmation |
|---|---|
| Appending a turn to the transcript | **None** — it's the chat log itself (deletable later). |
| Marking a proposed memory as **kept** | **One tap** (it stays in the private `solo.db`). |
| **Promoting** a memory into canon (new Archive entry / `pc_connection` / sheet edit in tracked `palefire.db`) | **Explicit confirm** — this writes shared campaign data. Reuse the `Confirm` component; show exactly what will be created/changed. |
| Editing the passenger sheet from within a crossing | **Explicit confirm** (writes `palefire.db`). |
| Applying an atmosphere shift or showing an image | **One tap** (a chip) — reversible, low stakes, matches the "GM chooses" audio rule. |
| Deleting a crossing / transcript / memory | **Confirm** (reuse `Confirm`). |
| Sending a message (a paid API call) | **No per-message confirm** (too noisy) — instead show running token/cost awareness and a soft per-crossing budget the user sets. |

Principle: **money/egress is disclosed, not gated per turn; canon writes are always
gated.** Sending leaves the device — that fact is disclosed up front when the feature
is enabled, and the transcript view always shows that this thread talks to a cloud
provider.

---

## 10. UI / UX

Not a chatbot. A **reading-first, single-column page** in Palefire's quiet,
literary voice — closer to a journal/ship's log than a messenger app.

- **Entry point:** a calm action on the Passenger sheet — *"Take a solo crossing"* —
  opens that passenger's most recent open crossing, or a small crossing index if
  several exist. It remains off the main sidebar. A dedicated `SoloCrossing` view
  renders the thread full-height and has a clear return to the passenger sheet.
- **The thread:** narration as flowing Markdown prose (reuse the `Markdown`
  component and `prose-pf` styling); the passenger's own contributions in a distinct
  but quiet style (a different left-margin/voice, like the Logbook's timeline).
  Streaming text arrives like ink. Pacing is reinforced by typography and restraint,
  not animation gimmicks.
- **Compose box:** an unobtrusive bottom textarea, Enter-to-send / Shift+Enter for a
  newline — exactly the Logbook compose pattern, which users already know.
- **A collapsible "what the ferry remembers" rail:** kept memories, plus any pending
  *proposed* ones awaiting a keep/discard. Behind-the-curtain restraint, like the
  passenger sheet's GM-only panel — collapsed by default.
- **Suggestion chips inline:** "Remember this?", "Shift the air → <preset>",
  "Show <portrait>" appear quietly under the relevant narrator turn; tapping acts,
  ignoring them does nothing. They never interrupt.
- **Quiet status:** a small, non-anxious indicator that this thread reaches a cloud
  provider, plus token/cost-so-far. No dashboards.
- **Empty state** in the Night Ferry voice (the pull, a passenger drawn aboard, the
  page waiting).
- **Visual language:** the existing palette/fonts (`src/styles.css`) — warm dark
  ferry interior, Fraunces for display, IBM Plex for UI. Reuse `ui.tsx` building
  blocks, `Modal`, `Confirm`, `StoredImage`. It should feel native to Archives /
  Passengers / Logbook.

---

## 11. Privacy & security considerations

- **Egress is the headline.** Enabling Solo Crossing sends the setting bible, the
  passenger sheet, and the play transcript to a third party. Disclose this plainly at
  enable-time and keep a persistent reminder in the view. Off by default.
- **Key never in the tracked DB** (§6.3). This is the one that bites: `palefire.db`
  is pushed to GitHub.
- **Transcripts out of the shared repo** (§5): personal creative writing should not
  be committed to the campaign repo the user pushes. Separate gitignored `solo.db`.
- **Provider data handling:** content sent to Anthropic leaves the device and is
  handled under the API account's current retention terms. State this honestly;
  don't overclaim "private" or assume zero-data-retention status.
- **A redaction option:** let the user exclude GM-only passenger fields (`secret`,
  `ferry_needs`) and other sensitive Archive content from what's sent, so the
  player-character's secrets aren't shipped to a cloud if they don't want them to be.
- **Prompt injection:** low risk for a single-user app, and the confirmation gate on
  canon writes means even a misbehaving model can't silently alter the campaign.
- **Cost runaway:** context budgeting (§5.3) + visible token/cost + a soft per-
  crossing cap.
- **No ambient network behavior:** only the Solo Crossing provider module imports
  the SDK, and only an explicit Send action performs a request. Core views remain
  usable with no key and no network.

---

## 12. Phased implementation

Each phase ends in a coherent, testable state. Do not start atmosphere or canon
promotion until the plain conversation loop feels right.

### Phase 0 — Documentation and local configuration

Status: **complete (2026-06-13)**.

Files: `AGENTS.md`, `docs/design.md`, `docs/development.md`, `.gitignore`,
`.env.example`, `src/vite-env.d.ts`, `package.json`.

- Record the sanctioned exception and privacy boundary in durable docs.
- Add `@anthropic-ai/sdk`.
- Document `VITE_ANTHROPIC_API_KEY` and optional `VITE_ANTHROPIC_MODEL`.
- Ignore `data/solo.db` and its sidecars explicitly.
- Add no UI or runtime behavior yet.

Exit criteria: docs no longer contradict the approved feature; a clean clone can
discover the required local variables without containing a secret.

### Phase 1 — Separate store and navigation shell

Status: **complete (2026-06-13)**.

Files: `src-tauri/solo-migrations/001_initial.sql`, `src-tauri/src/lib.rs`,
`src/projectPaths.ts`, `src/solo/{types,db,repo}.ts`,
`src/stores/soloStore.ts`, `src/stores/appStore.ts`, `src/shell/Shell.tsx`,
`src/views/Passengers.tsx`, `src/views/SoloCrossing.tsx`.

- Expose `soloDatabasePath`/`soloDatabaseUrl` beside the existing project paths.
- Register an independent migration chain for `solo.db`.
- Load `solo.db` lazily only when the Solo Crossing view is entered.
- Add repository methods for crossing/message/memory/settings CRUD.
- Add a non-sidebar app view and passenger-sheet entry action.
- Render a local-only empty/index view with create, resume, end, and delete actions.

Exit criteria: crossing lifecycle persists across restarts; no `solo.db` is created
during ordinary core-app use; `palefire.db` remains unchanged.

### Phase 2 — Streaming conversation MVP

Files: `src/solo/{provider,anthropic,bible,prompts,context}.ts`,
`src/stores/soloStore.ts`, `src/views/SoloCrossing.tsx`, `src/styles.css`.

- Detect a missing key before constructing the Anthropic client and show setup help.
- Show the egress disclosure before the first request and persist acknowledgement in
  `solo.db`; no acknowledgement means Send remains disabled.
- Build a stable system prefix from campaign tone/canon plus the selected passenger.
- Exclude `secret` and `ferry_needs` from API context by default. Do not send them
  until a later explicit redaction setting opts them in.
- Add relevant linked Archive entries and passengers, then recent transcript turns.
- Stream text into one provisional narrator message; finalize it on success.
- On abort or provider failure, preserve the user's message, mark/remove the partial
  narrator row deliberately, and provide Retry without duplicating the user turn.
- Persist provider message ID and token usage when available.
- Add automatic prompt caching and a modest `max_tokens`.
- Ensure only an explicit Send action makes a network request.

Exit criteria: create/resume/send/abort/retry/restart all behave predictably; no key
appears in logs or storage; the transcript reads well at both supported window sizes.

### Phase 3 — Memory and context compaction

Files: `src/solo/memory.ts`, `src/solo/context.ts`, `src/solo/repo.ts`,
`src/stores/soloStore.ts`, `src/views/SoloCrossing.tsx`.

- Add the `propose_memory` client tool.
- Render proposed memories as dismissible items; keep/discard is always manual.
- Include only kept memories in future context.
- Generate a rolling summary after a measured token/turn threshold, save it, and mark
  compacted messages `in_context = 0` without removing them from transcript history.
- Keep memory promotion out of this phase.

Exit criteria: long crossings stay bounded; reloading reconstructs the same context;
discarded proposals never return unless independently proposed again.

### Phase 4 — Confirmed canon promotion

Files: `src/solo/memory.ts`, `src/views/SoloCrossing.tsx`,
existing typed helpers in `src/db/repo.ts`.

- Offer promotion only from an explicitly selected kept memory.
- Support narrowly defined targets first: Archive entry and passenger connection.
- Show the exact proposed tracked-database write in the existing `Confirm` modal.
- Call existing campaign repository helpers; do not issue ad hoc campaign SQL from
  Solo Crossing code.
- Record the resulting `archive:<id>` or `pc_connection:<id>` in `promoted_to`.
- Do not automatically rewrite passenger sheets in v1.

Exit criteria: cancel performs no write; confirm performs one auditable write;
promoting twice is blocked; deleting a crossing does not delete promoted canon.

### Phase 5 — Atmosphere and image suggestions

Files: `src/solo/anthropic.ts`, `src/solo/context.ts`,
`src/views/SoloCrossing.tsx`, existing audio/image helpers.

- Add `suggest_atmosphere` and `suggest_image` client tools.
- Resolve suggestions only against existing presets, Archive entries, and passengers.
- Surface one-tap chips; never auto-play audio or auto-change the page.
- Reuse `audioStore`, `engine.trigger`, and `StoredImage`.

Exit criteria: unknown targets are ignored safely; suggestions survive transcript
reload if retained; Panic still stops all sound.

### Phase 6 — Privacy, cost, and polish

Files: `src/views/Settings.tsx`, `src/views/SoloCrossing.tsx`,
`src/solo/{context,repo}.ts`, `docs/development.md`.

- Add redaction controls for optionally including GM-only passenger fields and
  excluding selected Archive categories; defaults remain conservative.
- Show understated per-crossing token totals and estimated cost, labelled as an
  estimate and calculated from a small versioned model-price table.
- Add a soft budget warning that never silently truncates or sends another request.
- Document backup/deletion behavior and the production-build key warning.

Exit criteria: the owner can see what leaves the device, erase all private crossing
data, and understand approximate spend without a per-turn confirmation dialog.

### Future — Distribution hardening

Only if the app will be shared: move provider calls to Rust, restrict egress to the
configured provider host, move the key to Windows Credential Manager, and remove the
`VITE_*` secret. This is intentionally outside the personal-tool implementation.

Verification for every phase:

- Run `npm run typecheck`.
- Run `npm run build` when dependencies or bundling change.
- Launch with the WebView2 debugging port and exercise the changed flow through
  `node scripts/cdp.mjs`.
- Before and after canon-promotion tests, query both databases to prove that private
  state stays in `solo.db` and tracked state changes only after confirmation.
- Test missing key, invalid key, rate limit, offline, abort, malformed tool input,
  deleted passenger, and stale logical references.

---

## 13. Risks & tradeoffs

- **Identity drift (biggest risk).** The defining "no AI, local-first" stance erodes
  the moment this exists. Mitigation: isolation, off-by-default, the explicit
  documented exception, and the separate store so a non-user can't tell it's there.
  If implementation breaks that boundary, stop the affected phase and correct the
  design before continuing.
- **Tone failure.** The model over-explains, canonizes, or resolves mysteries —
  exactly the brief's anti-goals. Mitigation: canon-derived system prompt, restraint
  instructions, low effort, short turns, and the structural separation of narration
  from canon (§8). Still needs play-testing; tone is empirical.
- **Cost & latency.** Cloud calls cost money and add lag. Mitigation: streaming,
  prompt caching, context budgeting, an environment-configurable model, visible cost.
- **Data exposure.** Selected campaign context leaves the device, while the API key
  is present in renderer memory. Mitigation: §11, redaction, no remote content, and
  the explicit prohibition on distributing a key-bearing build.
- **Git friction.** SQLite-in-Git already can't merge; chat volume would worsen it.
  Mitigation: transcripts live in the gitignored `solo.db` (§5).
- **Scope creep into a generic AI RPG.** Mitigation: the non-goals (§3) are product
  guardrails, not just nice-to-haves; resist dice, multiplayer, content generators.
- **Maintenance.** A provider API surface to keep current (model deprecations,
  parameter changes). Mitigation: thin provider interface and checking Anthropic's
  official model/deprecation documentation before changing model IDs.
- **Two databases.** A second connection is a small added complexity (boot, paths,
  migrations). Tradeoff accepted for the privacy/canon/git wins.

---

## 14. Tuning questions for play-testing

These do not block implementation:

1. Does `claude-sonnet-4-6` produce the preferred voice and restraint, or is an
   occasional Opus comparison worth the additional cost?
2. How many recent turns should remain verbatim before rolling summary compaction?
3. Should a passenger have one canonical ongoing crossing or several named crossings?
   The schema supports several; the UI should initially favor resuming the latest.
4. Which campaign notes form the smallest useful setting bible?
5. What turn-length and effort settings produce quiet scenes without making the
   narrator passive?
6. Which two canon-promotion targets are genuinely useful after real play?

---

## 15. Recommendation (summary)

Build it as a small, opt-in, off-by-default side room that leaves the core app
untouched. Keep transcripts in a separate gitignored store; let only owner-confirmed
promotions touch the shared campaign.
Build the narrator's restraint from the campaign's own canon — the seed already
contains its anti-slop guide. Suggest atmosphere and images, never apply them.
Default to Anthropic (`claude-sonnet-4-6`) behind a thin provider interface. Read the
key from `.env.local`, never from a database or UI field, and never distribute a
renderer build containing the owner's key. Ship the conversation MVP first and judge
the tone before building memory, canon promotion, or suggestions.
