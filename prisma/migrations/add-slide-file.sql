-- Migration: Add slide_file column to courses table
-- Allows storing the path to uploaded slide files

ALTER TABLE courses ADD COLUMN slide_file TEXT;

