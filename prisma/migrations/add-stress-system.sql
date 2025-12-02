-- Add stress_levels table
CREATE TABLE IF NOT EXISTS stress_levels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT,
  level_before INTEGER NOT NULL,
  level_after INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_stress_levels_user_id ON stress_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_levels_course_id ON stress_levels(course_id);

