# 🛠️ Guide de Développement Local

Guide pour développer avec une base de données D1 locale Cloudflare.

## ✅ Configuration Terminée

- ✅ Connecté à Cloudflare (`wrangler login`)
- ✅ Base D1 créée : `gamification-db`
- ✅ Namespace KV créé : `sessions`
- ✅ Base de données locale initialisée
- ✅ Scripts configurés pour le développement local

## 🚀 Démarrer le Développement

### Option 1 : Tout en une commande (recommandé)

```bash
npm run dev
```

Cette commande lance :
- Le Worker API sur `http://localhost:8787` (avec D1 local)
- Le frontend Next.js sur `http://localhost:3000`

### Option 2 : Séparément

#### Terminal 1 - Worker API
```bash
npm run worker:dev
```
Worker disponible sur `http://localhost:8787` avec D1 local.

#### Terminal 2 - Frontend Next.js
```bash
npm run next:dev
```
Frontend disponible sur `http://localhost:3000`.

## 📊 Base de Données Locale

### Où est stockée la DB locale ?

La base de données locale est stockée dans :
```
.wrangler/state/v3/d1/
```

### Commandes utiles

#### Exécuter des migrations locales
```bash
npm run prisma:migrate:local
```

#### Exécuter des migrations sur la DB distante
```bash
npm run prisma:migrate
```

#### Exécuter une requête SQL locale
```bash
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM users"
```

#### Voir les données locales
```bash
npx wrangler d1 execute gamification-db --local --command "SELECT COUNT(*) FROM badges"
```

## 🔄 Différence Local vs Remote

### Local (`--local`)
- Base de données stockée localement dans `.wrangler/state/v3/d1/`
- Parfait pour le développement
- Données persistantes entre les redémarrages
- Pas besoin d'internet (après la première initialisation)

### Remote (sans `--local`)
- Base de données sur Cloudflare
- Pour la production
- Nécessite une connexion internet
- Données partagées entre tous les environnements

## 🧪 Tester l'Application

1. **Lancer le dev** :
   ```bash
   npm run dev
   ```

2. **Ouvrir le navigateur** :
   - Frontend : http://localhost:3000
   - API : http://localhost:8787

3. **Tester l'inscription** :
   - Entrez un prénom sur la landing page
   - Vous serez redirigé vers `/student/courses`

4. **Vérifier les données** :
   ```bash
   npx wrangler d1 execute gamification-db --local --command "SELECT * FROM users"
   ```

## 🐛 Dépannage

### "Cannot connect to API"
- Vérifiez que le worker tourne sur `http://localhost:8787`
- Vérifiez `.env.local` contient `NEXT_PUBLIC_API_URL=http://localhost:8787`

### "Database not found"
- Exécutez `npm run prisma:migrate:local` pour initialiser la DB locale

### "Port already in use"
- Changez le port dans `package.json` ou arrêtez le processus qui utilise le port

### Réinitialiser la DB locale
```bash
# Supprimer le dossier local
rm -rf .wrangler/state/v3/d1

# Réinitialiser
npm run prisma:migrate:local
```

## 📝 Notes

- La DB locale est persistante : les données restent entre les redémarrages
- Pour tester avec la DB distante, utilisez `npm run worker:dev` sans `--local`
- Les badges par défaut sont créés automatiquement lors de la migration

---

**Bon développement ! 🎮**

