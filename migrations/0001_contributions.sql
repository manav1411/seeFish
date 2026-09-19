CREATE TABLE IF NOT EXISTS contributions (
  capability_hash TEXT PRIMARY KEY CHECK(length(capability_hash) = 64),
  preferences_json TEXT NOT NULL,
  profile_json TEXT,
  disclosure_version TEXT NOT NULL,
  profile_disclosure_version TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  preferences_updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  profile_updated_at INTEGER,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS contributions_active_profiles
  ON contributions(expires_at)
  WHERE profile_json IS NOT NULL;
