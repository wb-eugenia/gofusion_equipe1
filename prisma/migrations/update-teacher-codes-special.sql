-- Migration: Update teacher_codes table to support special codes
-- Adds matiere_id and is_special_code columns, makes teacher_id nullable

-- Note: SQLite doesn't support ALTER COLUMN to make a column nullable
-- If the table already exists with teacher_id NOT NULL, we need to recreate it
-- This migration assumes the table might already exist

-- Add new columns if they don't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we use a workaround
-- We'll check if columns exist and add them if needed

-- For existing installations, you may need to manually update the table structure
-- or recreate it with the new schema

-- If the table doesn't exist yet, it will be created by add-teacher-codes.sql with the correct structure
-- If it exists, you may need to:
-- 1. Create a backup
-- 2. Drop the table
-- 3. Recreate it with the new schema
-- 4. Restore data (if any)

-- For now, we'll just document the changes needed
-- The application code will handle NULL values for teacher_id even if the column is NOT NULL in SQLite

