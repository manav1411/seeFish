CREATE TABLE IF NOT EXISTS reveal_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clicked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  gender TEXT NOT NULL CHECK(gender IN ('men', 'women')),
  city TEXT NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  height_min INTEGER,
  height_max INTEGER,
  income_min INTEGER,
  income_max INTEGER,
  backgrounds_json TEXT NOT NULL,
  estimated_matches INTEGER NOT NULL,
  eligible_population INTEGER NOT NULL,
  match_share REAL NOT NULL,
  model_version TEXT NOT NULL,
  expires_at INTEGER NOT NULL DEFAULT (unixepoch() + 31536000)
);

CREATE INDEX IF NOT EXISTS reveal_events_clicked_at
  ON reveal_events(clicked_at DESC);

CREATE INDEX IF NOT EXISTS reveal_events_filters
  ON reveal_events(city, gender, clicked_at DESC);
