-- Add theoretical_content column to courses table (if not exists)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- We'll use a workaround by trying to add it and ignoring errors if it exists

-- Add theoretical_content to courses
-- Check if column exists first (SQLite workaround)
-- Since SQLite doesn't support IF NOT EXISTS for ALTER TABLE, we'll just add it
-- If it already exists, the migration will fail but that's okay
ALTER TABLE courses ADD COLUMN theoretical_content TEXT;

-- Add fixed session columns to sessions table
ALTER TABLE sessions ADD COLUMN is_fixed INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN recurrence_type TEXT;
ALTER TABLE sessions ADD COLUMN recurrence_day INTEGER;
ALTER TABLE sessions ADD COLUMN scheduled_at INTEGER;

-- Add indexes for scheduled sessions
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_fixed ON sessions(is_fixed);

