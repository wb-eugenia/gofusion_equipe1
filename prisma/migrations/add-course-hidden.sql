-- Migration: Add is_hidden column to courses table
-- Allows admins to hide courses without deleting them

ALTER TABLE courses ADD COLUMN is_hidden INTEGER DEFAULT 0 NOT NULL;

