# Migration de la Base de Données

## Migration Locale (Développement)

La migration locale a été effectuée avec succès. La table `teacher_codes` contient maintenant :
- `matiere_id` (pour les codes spéciaux)
- `is_special_code` (pour distinguer les codes normaux des codes spéciaux)
- `teacher_id` (nullable pour les codes spéciaux)

## Migration Production (Remote)

Si vous utilisez la base de données de production, exécutez :

```bash
# Migrer la base de données de production
wrangler d1 execute gamification-db --remote --file=./prisma/migrations/add-teacher-codes.sql
```

## Vérification

Pour vérifier que la table est correcte :

```bash
# Local
wrangler d1 execute gamification-db --local --command="PRAGMA table_info(teacher_codes);"

# Production
wrangler d1 execute gamification-db --remote --command="PRAGMA table_info(teacher_codes);"
```

## Structure de la Table

La table `teacher_codes` doit contenir :
- `id` (TEXT, PRIMARY KEY)
- `code` (TEXT, NOT NULL, UNIQUE)
- `teacher_id` (TEXT, nullable)
- `matiere_id` (TEXT, nullable)
- `course_ids` (TEXT, nullable)
- `max_uses` (INTEGER, DEFAULT -1)
- `current_uses` (INTEGER, DEFAULT 0)
- `is_special_code` (INTEGER, DEFAULT 0)
- `expires_at` (INTEGER, nullable)
- `created_at` (INTEGER, NOT NULL)

