-- Server-owned progress for accounts (guests keep theirs on the device): the
-- XP, title, places and bests the server has graded itself, and the weekly
-- boards built from them. Weeks are Monday-to-Sunday UTC, numbered by
-- server/src/progressCore.ts `weekOf`.
CREATE TABLE progress (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  street_xp INTEGER NOT NULL DEFAULT 0,
  fame_xp INTEGER NOT NULL DEFAULT 0,
  hustle_xp INTEGER NOT NULL DEFAULT 0,
  -- "<ladder>:<rank>" or NULL
  title TEXT,
  -- JSON array of room ids, and JSON object of game -> best score
  visited TEXT NOT NULL DEFAULT '[]',
  bests TEXT NOT NULL DEFAULT '{}',
  -- UTC day number and the score XP paid on it, against the daily cap
  day INTEGER NOT NULL DEFAULT 0,
  day_xp INTEGER NOT NULL DEFAULT 0,
  -- Bumped on every write; a write that lost a race matches no row and retries.
  rev INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Each player's best score per game per week. `at` breaks ties: first there wins.
CREATE TABLE weekly_scores (
  week INTEGER NOT NULL,
  game TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  score REAL NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (week, game, user_id)
);
CREATE INDEX weekly_scores_rank ON weekly_scores (week, game, score, at);

-- XP earned per ladder per week (imports from old saves don't count).
CREATE TABLE weekly_xp (
  week INTEGER NOT NULL,
  ladder TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  xp INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (week, ladder, user_id)
);
CREATE INDEX weekly_xp_rank ON weekly_xp (week, ladder, xp, at);
