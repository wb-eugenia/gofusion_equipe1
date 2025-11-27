-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  prenom TEXT NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  role TEXT DEFAULT 'student' NOT NULL,
  streak_days INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 50 NOT NULL,
  created_at INTEGER NOT NULL
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  threshold_xp INTEGER,
  condition_type TEXT NOT NULL,
  condition_value INTEGER,
  created_at INTEGER NOT NULL
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);

-- Insert default badges
INSERT OR IGNORE INTO badges (id, name, icon, description, threshold_xp, condition_type, condition_value, created_at) VALUES
('badge-1', 'Débutant', '/badges/debutant.svg', 'Atteignez 50 XP', 50, 'xp', NULL, strftime('%s', 'now')),
('badge-2', 'Étudiant sérieux', '/badges/serieux.svg', 'Atteignez 250 XP', 250, 'xp', NULL, strftime('%s', 'now')),
('badge-3', 'Top 10%', '/badges/top10.svg', 'Soyez dans le top 10 du classement', NULL, 'top10', 10, strftime('%s', 'now')),
('badge-4', 'Cours complété', '/badges/cours.svg', 'Complétez 5 cours', NULL, 'courses_completed', 5, strftime('%s', 'now')),
('badge-5', 'Streak 7 jours', '/badges/streak.svg', 'Connectez-vous 7 jours consécutifs', NULL, 'streak', 7, strftime('%s', 'now')),
('badge-6', 'Maître', '/badges/maitre.svg', 'Atteignez 1000 XP', 1000, 'xp', NULL, strftime('%s', 'now')),
('badge-7', 'Expert', '/badges/expert.svg', 'Complétez 10 cours', NULL, 'courses_completed', 10, strftime('%s', 'now')),
('badge-8', 'Légende', '/badges/legende.svg', 'Atteignez 5000 XP', 5000, 'xp', NULL, strftime('%s', 'now'));

