-- Create clan_wars table
CREATE TABLE IF NOT EXISTS clan_wars (
  id TEXT PRIMARY KEY,
  matiere_id TEXT NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  week_start INTEGER NOT NULL,
  week_end INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  winner_clan_id TEXT REFERENCES clans(id) ON DELETE SET NULL,
  total_bananas INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);

-- Create clan_war_contributions table
CREATE TABLE IF NOT EXISTS clan_war_contributions (
  id TEXT PRIMARY KEY,
  clan_war_id TEXT NOT NULL REFERENCES clan_wars(id) ON DELETE CASCADE,
  clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bananas_contributed INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clan_wars_matiere ON clan_wars(matiere_id);
CREATE INDEX IF NOT EXISTS idx_clan_wars_status ON clan_wars(status);
CREATE INDEX IF NOT EXISTS idx_clan_wars_week_start ON clan_wars(week_start);
CREATE INDEX IF NOT EXISTS idx_clan_war_contributions_war ON clan_war_contributions(clan_war_id);
CREATE INDEX IF NOT EXISTS idx_clan_war_contributions_clan ON clan_war_contributions(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_war_contributions_user ON clan_war_contributions(user_id);

-- Unique constraint: one contribution per user per war
CREATE UNIQUE INDEX IF NOT EXISTS idx_clan_war_contributions_user_war ON clan_war_contributions(user_id, clan_war_id);

