-- Create clan_wars_config table for admin configuration
CREATE TABLE IF NOT EXISTS clan_wars_config (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at INTEGER NOT NULL
);

-- Insert default configuration (using key as id for simplicity)
INSERT OR IGNORE INTO clan_wars_config (id, key, value, description, updated_at) VALUES
  ('config-reward-per-member', 'reward_per_member', '50', 'Nombre de bananes données à chaque membre du clan gagnant', strftime('%s', 'now')),
  ('config-wars-enabled', 'wars_enabled', 'true', 'Activer ou désactiver les guerres de clan', strftime('%s', 'now')),
  ('config-auto-create', 'auto_create_wars', 'true', 'Créer automatiquement les guerres chaque semaine', strftime('%s', 'now'));

