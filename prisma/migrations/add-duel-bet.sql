-- Add bet_amount column to duels table
ALTER TABLE duels ADD COLUMN bet_amount INTEGER DEFAULT 0 NOT NULL;

