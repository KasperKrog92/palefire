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
