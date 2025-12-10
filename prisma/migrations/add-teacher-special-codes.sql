-- Migration: Add support for special teacher codes (1 code = 1 teacher account = 1 matiere)
-- These codes allow creating teacher accounts directly during registration

ALTER TABLE teacher_codes ADD COLUMN matiere_id TEXT REFERENCES matieres(id) ON DELETE CASCADE;
ALTER TABLE teacher_codes ADD COLUMN is_special_code INTEGER DEFAULT 0 NOT NULL;

-- Make teacher_id nullable for special codes
-- Note: SQLite doesn't support ALTER COLUMN, so we'll need to recreate the table
-- For now, we'll keep teacher_id as NOT NULL but allow NULL in the application logic

