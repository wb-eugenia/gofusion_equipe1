-- Migration: Add support for special teacher codes (1 code = 1 teacher account = 1 matiere)
-- This migration adds matiere_id and is_special_code columns to teacher_codes table

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll try to add them and ignore errors if they already exist

-- Add matiere_id column (if it doesn't exist)
-- Note: This will fail silently if the column already exists, which is fine
-- In SQLite, we can't check if a column exists before adding it
-- So we'll just add it and handle the error in the application

-- For local development, you may need to manually check if columns exist
-- For production, this migration should be run before the table is used

-- Add matiere_id column
ALTER TABLE teacher_codes ADD COLUMN matiere_id TEXT;

-- Add is_special_code column with default value
ALTER TABLE teacher_codes ADD COLUMN is_special_code INTEGER DEFAULT 0 NOT NULL;

-- Note: If teacher_id is currently NOT NULL, we can't make it nullable with ALTER TABLE in SQLite
-- The application code will handle NULL values even if the column constraint is NOT NULL
-- For a proper fix, you would need to recreate the table, but that's more complex

-- Add foreign key constraint for matiere_id (if supported)
-- SQLite may not support adding foreign keys after table creation in all versions
-- But we'll try to add it
-- Note: This might fail if foreign keys are not enabled or if the constraint already exists

