# Migration slide_file - Instructions

## ⚠️ Important

Le champ `slideFile` a été temporairement retiré du schéma Drizzle pour éviter les erreurs si la colonne n'existe pas encore en base de données.

## Pour activer complètement la fonctionnalité :

### 1. Exécuter la migration

```bash
# En local
npm run prisma:migrate:local

# En production  
npm run prisma:migrate
```

### 2. Réactiver slideFile dans le schéma

Une fois la migration exécutée, décommentez la ligne dans `prisma/schema.d1.ts` :

```typescript
export const courses = sqliteTable('courses', {
  // ... autres champs
  slideFile: text('slide_file'), // Décommentez cette ligne
  // ...
});
```

### 3. Simplifier le code dans workers/src/index.ts

Une fois la colonne créée, vous pouvez simplifier le code d'insertion et de mise à jour pour utiliser directement Drizzle au lieu des requêtes SQL brutes.

## État actuel

- ✅ Le code fonctionne même si la colonne n'existe pas
- ✅ Les INSERT/UPDATE utilisent des requêtes SQL brutes pour slideFile
- ✅ Les erreurs sont gérées gracieusement
- ⚠️ slideFile est retiré du schéma Drizzle (à réactiver après migration)

