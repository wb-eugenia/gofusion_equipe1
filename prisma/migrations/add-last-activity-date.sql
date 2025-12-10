-- Migration: Add last_activity_date column to users table for improved streak calculation
-- This allows tracking the exact date of last activity to calculate streaks accurately

ALTER TABLE users ADD COLUMN last_activity_date INTEGER;

-- Initialize last_activity_date with created_at for existing users
UPDATE users SET last_activity_date = created_at WHERE last_activity_date IS NULL;

