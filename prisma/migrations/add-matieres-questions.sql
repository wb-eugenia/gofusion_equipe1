-- Add matieres table
CREATE TABLE IF NOT EXISTS matieres (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- Add matiere_id and game_type to courses
ALTER TABLE courses ADD COLUMN matiere_id TEXT;
ALTER TABLE courses ADD COLUMN game_type TEXT NOT NULL DEFAULT 'quiz';

-- Add questions table
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  question TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  options TEXT,
  correct_answer TEXT,
  "order" INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_courses_matiere_id ON courses(matiere_id);
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);

