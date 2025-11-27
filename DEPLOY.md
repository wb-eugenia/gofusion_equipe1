# 🚀 Guide de Déploiement

Guide complet pour déployer l'application de gamification sur Cloudflare.

## 📋 Prérequis

1. Compte Cloudflare avec Workers/Pages activé
2. Wrangler CLI installé : `npm install -g wrangler`
3. Authentification Cloudflare : `npx wrangler login`

## 🔧 Étape 1 : Configuration Cloudflare

### 1.1 Créer la base de données D1

```bash
npx wrangler d1 create gamification-db
```

**Important** : Copiez le `database_id` retourné. Vous en aurez besoin pour `wrangler.toml`.

Exemple de sortie :
```
✅ Successfully created DB 'gamification-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "gamification-db"
database_id = "abc123def456..."  ← COPIEZ CET ID
```

### 1.2 Créer le namespace KV pour les sessions

```bash
# Production
npx wrangler kv namespace create sessions

# Preview (pour le développement)
npx wrangler kv namespace create sessions --preview
```

**Important** : Copiez les IDs retournés.

Exemple :
```
✅ Created namespace with id "xyz789..."  ← COPIEZ CET ID
```

### 1.3 Mettre à jour wrangler.toml

Éditez `wrangler.toml` et remplacez :

```toml
[[d1_databases]]
binding = "DB"
database_name = "gamification-db"
database_id = "VOTRE_DATABASE_ID"  ← Remplacez ici

[[kv_namespaces]]
binding = "SESSIONS"
id = "VOTRE_KV_ID"  ← Remplacez ici
preview_id = "VOTRE_KV_PREVIEW_ID"  ← Remplacez ici
```

## 🗄️ Étape 2 : Initialiser la Base de Données

### 2.1 Exécuter les migrations

```bash
npm run prisma:migrate
```

Cette commande :
- Crée toutes les tables (users, courses, badges, etc.)
- Insère les 8 badges par défaut
- Configure les index pour les performances

### 2.2 Vérifier la base de données (optionnel)

```bash
npx wrangler d1 execute gamification-db --command "SELECT COUNT(*) as badge_count FROM badges"
```

Vous devriez voir `8` badges.

## 🔨 Étape 3 : Déployer le Worker (API)

### 3.1 Déployer

```bash
npm run worker:deploy
```

Ou directement :

```bash
npx wrangler deploy workers/src/index.ts
```

### 3.2 Vérifier le déploiement

Le Worker sera disponible à l'URL :
```
https://gamification-app-prod.VOTRE_SUBDOMAIN.workers.dev
```

Notez cette URL, vous en aurez besoin pour configurer le frontend.

## 🎨 Étape 4 : Déployer Pages (Frontend)

### 4.1 Configurer l'URL de l'API

Créez un fichier `.env.production` ou configurez dans Cloudflare Pages :

```env
NEXT_PUBLIC_API_URL=https://gamification-app-prod.VOTRE_SUBDOMAIN.workers.dev
```

### 4.2 Build et déployer

```bash
npm run build
npm run deploy:pages
```

Ou utilisez l'intégration GitHub :

1. Connectez votre repo GitHub à Cloudflare Pages
2. Configurez les variables d'environnement dans les paramètres
3. Le déploiement se fera automatiquement à chaque push

### 4.3 Configuration dans Cloudflare Pages

Dans les paramètres de votre projet Pages :

1. **Variables d'environnement** :
   - `NEXT_PUBLIC_API_URL` = URL de votre Worker

2. **Build settings** :
   - Build command : `npm run build`
   - Build output directory : `.next`

## ✅ Étape 5 : Vérification

### 5.1 Tester l'API

```bash
curl https://gamification-app-prod.VOTRE_SUBDOMAIN.workers.dev/api/admin/kpi
```

Devrait retourner les KPI (même si vides au début).

### 5.2 Tester le frontend

1. Accédez à l'URL de votre Pages
2. Inscrivez-vous avec un prénom
3. Vérifiez que vous êtes redirigé vers `/student/courses`

## 👤 Étape 6 : Créer un Utilisateur Admin (Optionnel)

### Via l'API (recommandé)

```bash
# 1. Créer un utilisateur normal
curl -X POST https://gamification-app-prod.VOTRE_SUBDOMAIN.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"prenom": "Admin"}'

# Notez le userId retourné

# 2. Mettre à jour le rôle en admin (via D1)
npx wrangler d1 execute gamification-db --command "UPDATE users SET role = 'admin' WHERE id = 'VOTRE_USER_ID'"
```

### Via la console D1

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → D1
3. Sélectionnez votre base de données
4. Exécutez :

```sql
UPDATE users SET role = 'admin' WHERE prenom = 'Admin';
```

## 🔄 Déploiements Ultérieurs

### Mettre à jour le Worker

```bash
npm run worker:deploy
```

### Mettre à jour Pages

```bash
npm run build
npm run deploy:pages
```

Ou laissez Cloudflare Pages déployer automatiquement depuis GitHub.

## 🐛 Dépannage

### Erreur : "Database not found"

- Vérifiez que le `database_id` dans `wrangler.toml` est correct
- Vérifiez que la base de données existe dans Cloudflare Dashboard

### Erreur : "KV namespace not found"

- Vérifiez les IDs dans `wrangler.toml`
- Vérifiez que les namespaces existent dans Cloudflare Dashboard

### Erreur CORS

- Vérifiez que l'URL du frontend est autorisée dans `workers/src/index.ts`
- En production, configurez CORS correctement

### Badges ne se débloquent pas

- Vérifiez que les migrations ont été exécutées
- Vérifiez que les badges existent dans la base de données
- Vérifiez les logs du Worker dans Cloudflare Dashboard

## 📊 Monitoring

### Logs du Worker

```bash
npx wrangler tail
```

### Métriques

Consultez les métriques dans Cloudflare Dashboard :
- Workers → Votre worker → Analytics
- D1 → Votre base → Analytics

## 🔐 Sécurité

### En Production

1. **CORS** : Configurez les origines autorisées
2. **Rate Limiting** : Ajoutez du rate limiting sur les endpoints sensibles
3. **Validation** : Toutes les entrées sont validées avec Zod
4. **Sessions** : Les sessions expirent après 7 jours

## 📝 Notes

- Les migrations D1 sont idempotentes (peuvent être exécutées plusieurs fois)
- Les badges par défaut sont créés automatiquement
- Les sessions sont stockées dans KV avec expiration automatique

---

**Bon déploiement ! 🚀**

