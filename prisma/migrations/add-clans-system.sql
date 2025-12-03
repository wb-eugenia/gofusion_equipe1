-- Create clans table
CREATE TABLE IF NOT EXISTS clans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  matiere_id TEXT NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- Create clan_members table
CREATE TABLE IF NOT EXISTS clan_members (
  id TEXT PRIMARY KEY,
  clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clans_matiere ON clans(matiere_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_role ON clan_members(role);

-- Unique constraint: one clan per user per matiere
CREATE UNIQUE INDEX IF NOT EXISTS idx_clan_members_user_matiere ON clan_members(user_id, clan_id);

