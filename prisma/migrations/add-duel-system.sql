-- Add duels table
CREATE TABLE IF NOT EXISTS duels (
  id TEXT PRIMARY KEY,
  player1_id TEXT NOT NULL,
  player2_id TEXT,
  matiere_id TEXT,
  course_id TEXT,
  status TEXT DEFAULT 'waiting' NOT NULL,
  winner_id TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add duel_answers table
CREATE TABLE IF NOT EXISTS duel_answers (
  id TEXT PRIMARY KEY,
  duel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  answered_at INTEGER NOT NULL,
  response_time_ms INTEGER,
  FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);
CREATE INDEX IF NOT EXISTS idx_duel_answers_duel_id ON duel_answers(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_answers_user_id ON duel_answers(user_id);

