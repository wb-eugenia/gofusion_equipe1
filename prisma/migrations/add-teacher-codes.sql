-- Migration: Add teacher_codes table for professor course enrollment codes
-- Allows teachers to create codes that automatically enroll students in their courses

CREATE TABLE IF NOT EXISTS teacher_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  teacher_id TEXT, -- Nullable for special codes (codes that create teacher accounts)
  matiere_id TEXT, -- For special codes: 1 code = 1 matiere
  course_ids TEXT, -- JSON array of course IDs
  max_uses INTEGER DEFAULT -1 NOT NULL, -- -1 = unlimited
  current_uses INTEGER DEFAULT 0 NOT NULL,
  is_special_code INTEGER DEFAULT 0 NOT NULL, -- true = code for creating teacher account
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE
);

