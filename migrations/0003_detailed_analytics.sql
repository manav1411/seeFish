ALTER TABLE reveal_events ADD COLUMN visitor_id TEXT;
ALTER TABLE reveal_events ADD COLUMN session_id TEXT;
ALTER TABLE reveal_events ADD COLUMN ip_address TEXT;
ALTER TABLE reveal_events ADD COLUMN user_agent TEXT;
ALTER TABLE reveal_events ADD COLUMN referer TEXT;
ALTER TABLE reveal_events ADD COLUMN client_language TEXT;
ALTER TABLE reveal_events ADD COLUMN client_timezone TEXT;
ALTER TABLE reveal_events ADD COLUMN viewport_width INTEGER;
ALTER TABLE reveal_events ADD COLUMN viewport_height INTEGER;
ALTER TABLE reveal_events ADD COLUMN cf_country TEXT;
ALTER TABLE reveal_events ADD COLUMN cf_region TEXT;
ALTER TABLE reveal_events ADD COLUMN cf_city TEXT;
ALTER TABLE reveal_events ADD COLUMN cf_colo TEXT;
ALTER TABLE reveal_events ADD COLUMN cf_asn INTEGER;
ALTER TABLE reveal_events ADD COLUMN cf_as_organization TEXT;

UPDATE reveal_events
SET expires_at = MIN(expires_at, unixepoch() + 7776000);

CREATE INDEX IF NOT EXISTS reveal_events_visitor
  ON reveal_events(visitor_id, clicked_at DESC);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  client_language TEXT,
  client_timezone TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  cf_country TEXT,
  cf_region TEXT,
  cf_city TEXT,
  cf_colo TEXT,
  cf_asn INTEGER,
  cf_as_organization TEXT,
  expires_at INTEGER NOT NULL DEFAULT (unixepoch() + 7776000)
);

CREATE INDEX IF NOT EXISTS page_views_viewed_at
  ON page_views(viewed_at DESC);

CREATE INDEX IF NOT EXISTS page_views_visitor
  ON page_views(visitor_id, viewed_at DESC);
