-- Create default clans for each matiere
-- This creates one clan per matiere with a default name

-- Insert clans for each existing matiere
INSERT OR IGNORE INTO clans (id, name, matiere_id, description, created_at)
SELECT 
  'clan-' || m.id || '-' || lower(replace(replace(replace(m.nom, ' ', '-'), 'é', 'e'), 'è', 'e')),
  'Clan ' || m.nom,
  m.id,
  'Clan officiel pour la matière ' || m.nom || '. Rejoignez ce clan pour participer aux guerres hebdomadaires !',
  strftime('%s', 'now')
FROM matieres m
WHERE NOT EXISTS (
  SELECT 1 FROM clans c WHERE c.matiere_id = m.id
);

