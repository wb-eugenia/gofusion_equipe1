-- Add status and started_at to sessions
ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'waiting' NOT NULL;
ALTER TABLE sessions ADD COLUMN started_at INTEGER;

-- Create session_quiz_answers table
CREATE TABLE IF NOT EXISTS session_quiz_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  answered_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_quiz_answers_session_id ON session_quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_quiz_answers_user_id ON session_quiz_answers(user_id);

