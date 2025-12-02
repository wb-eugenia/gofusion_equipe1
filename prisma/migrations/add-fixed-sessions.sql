-- Add fixed session columns
ALTER TABLE sessions ADD COLUMN is_fixed INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE sessions ADD COLUMN recurrence_type TEXT;
ALTER TABLE sessions ADD COLUMN recurrence_day INTEGER;
ALTER TABLE sessions ADD COLUMN scheduled_at INTEGER;

-- Add index for scheduled sessions
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_fixed ON sessions(is_fixed);

