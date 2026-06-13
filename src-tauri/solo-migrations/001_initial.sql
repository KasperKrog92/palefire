PRAGMA foreign_keys = ON;

CREATE TABLE crossings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  pc_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'adrift', 'ashore')),
  summary TEXT NOT NULL DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crossing_id INTEGER NOT NULL REFERENCES crossings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'narrator', 'aside')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete'
    CHECK (status IN ('streaming', 'complete', 'failed')),
  reply_to_message_id INTEGER REFERENCES crossing_messages(id) ON DELETE SET NULL,
  provider_id TEXT,
  stop_reason TEXT,
  in_context INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crossing_id INTEGER REFERENCES crossings(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL,
  pc_id INTEGER,
  kind TEXT NOT NULL
    CHECK (kind IN ('person', 'place', 'relationship', 'thread', 'lore', 'object')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'kept', 'archived')),
  source_message_id INTEGER REFERENCES crossing_messages(id) ON DELETE SET NULL,
  promoted_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crossing_id INTEGER NOT NULL REFERENCES crossings(id) ON DELETE CASCADE,
  source_message_id INTEGER NOT NULL REFERENCES crossing_messages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('atmosphere', 'image')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crossing_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_crossings_subject
  ON crossings(campaign_id, pc_id, status, updated_at);
CREATE INDEX idx_crossing_messages_thread
  ON crossing_messages(crossing_id, id);
CREATE INDEX idx_crossing_memories_status
  ON crossing_memories(crossing_id, status);
CREATE INDEX idx_crossing_suggestions_status
  ON crossing_suggestions(crossing_id, status);
