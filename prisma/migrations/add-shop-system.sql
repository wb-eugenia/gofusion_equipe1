-- Add shop_items table
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  price INTEGER NOT NULL,
  data TEXT,
  icon TEXT,
  created_at INTEGER NOT NULL
);

-- Add user_purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  purchased_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
);

-- Add user_skins table
CREATE TABLE IF NOT EXISTS user_skins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skin_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skin_id) REFERENCES shop_items(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skins_user_id ON user_skins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skins_active ON user_skins(user_id, is_active);

