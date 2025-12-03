# Guide de Déploiement Complet - GoFusion

Guide étape par étape pour déployer GoFusion avec toutes les fonctionnalités, y compris les guerres de clan.

## 📋 Prérequis

1. **Compte Cloudflare** (gratuit) : https://dash.cloudflare.com/sign-up
2. **Node.js** (v18+) : https://nodejs.org/
3. **Git** (optionnel, pour déploiement via Git)

## 🔧 Installation

```bash
# Installer les dépendances
npm install

# Installer Wrangler globalement (optionnel mais recommandé)
npm install -g wrangler
```

## 🔐 Connexion à Cloudflare

```bash
wrangler login
```

Suivez les instructions pour vous connecter à votre compte Cloudflare.

## 📊 Étape 1 : Migrations de Base de Données

### Méthode Automatique (Recommandée)

**Windows** :
```powershell
npm run deploy:all:ps1
```

**Linux/Mac** :
```bash
chmod +x scripts/deploy-all.sh
npm run deploy:all:sh
```

### Méthode Manuelle

Appliquez les migrations dans l'ordre :

```bash
# 1. Schéma principal
wrangler d1 execute gamification-db --file=./prisma/migrations/schema.sql

# 2. Migrations supplémentaires (dans l'ordre)
wrangler d1 execute gamification-db --file=./prisma/migrations/add-matieres-questions.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-clans-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-clan-wars-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-clan-wars-config.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-duel-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-duel-bet.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-friends-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-shop-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-session-quiz.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-fixed-sessions.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-stress-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-theoretical-content.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-analytics-time.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/fix-missing-columns.sql
```

**Note** : Si vous voyez des erreurs "table already exists", c'est normal. Les migrations utilisent `CREATE TABLE IF NOT EXISTS`.

## ⚙️ Étape 2 : Déployer le Worker (API)

```bash
npm run deploy:worker
```

Ou directement :
```bash
wrangler deploy workers/src/index.ts
```

**Notez l'URL du Worker** qui s'affichera (ex: `https://gamification-app-prod.workers.dev`)

## 🌐 Étape 3 : Configurer l'URL de l'API

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_API_URL=https://gamification-app-prod.workers.dev
```

Remplacez l'URL par celle de votre Worker.

## 🏗️ Étape 4 : Build et Déploiement de Pages

### Option A : Via Git (Recommandé pour production)

1. **Poussez votre code sur GitHub** :
   ```bash
   git add .
   git commit -m "Deploy GoFusion with clan wars"
   git push origin main
   ```

2. **Dans Cloudflare Dashboard** :
   - Allez sur **Pages** > **Create a project**
   - Connectez votre repository GitHub
   - Configuration :
     - **Framework preset** : Next.js
     - **Build command** : `npm run build`
     - **Build output directory** : `out`
     - **Root directory** : `/`
   - **Environment variables** :
     - `NEXT_PUBLIC_API_URL` : `https://gamification-app-prod.workers.dev`

3. **Déployez** : Cloudflare déploiera automatiquement à chaque push

### Option B : Via CLI (Déploiement manuel)

```bash
# Build
npm run build

# Déployer
wrangler pages deploy out --project-name=gamification-app
```

## ✅ Étape 5 : Vérification

### 1. Vérifier le Worker

Testez l'endpoint de santé :
```bash
curl https://gamification-app-prod.workers.dev/
```

Vous devriez voir :
```json
{
  "message": "Gamification API is running",
  "version": "1.0.0",
  ...
}
```

### 2. Vérifier les Tables

```bash
# Vérifier les tables de guerres de clan
wrangler d1 execute gamification-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'clan%'"
```

Vous devriez voir :
- `clans`
- `clan_members`
- `clan_wars`
- `clan_war_contributions`
- `clan_wars_config`

### 3. Vérifier la Configuration

```bash
wrangler d1 execute gamification-db --command="SELECT * FROM clan_wars_config"
```

### 4. Tester l'Application

1. Accédez à votre site Pages (ex: `https://gamification-app.pages.dev`)
2. Créez un compte étudiant
3. Connectez-vous en admin (mot de passe: `1234`)
4. Allez sur `/admin/clan-wars` pour configurer les guerres

## 🎛️ Configuration Post-Déploiement

### 1. Créer un Admin

En local :
```bash
npm run create-admin
```

Puis migrez les données vers la production ou créez directement via l'API.

### 2. Configurer les Guerres de Clan

1. Connectez-vous en admin
2. Allez sur `/admin/clan-wars`
3. Configurez :
   - **Récompense par membre** : Nombre de bananes (défaut: 50)
   - **Guerres activées** : Activez/désactivez le système
   - **Création automatique** : Création automatique ou manuelle

### 3. Créer des Clans

Les étudiants peuvent créer/rejoindre des clans depuis `/student/clans`

## 🔄 Cron Job

Le cron job est configuré pour s'exécuter tous les jours à minuit UTC :
- Finalise les guerres expirées
- Distribue les récompenses
- Crée automatiquement de nouvelles guerres (si activé)

**Vérification** : Dans Cloudflare Dashboard > Workers > Votre Worker > Settings > Triggers

## 📝 Commandes Utiles

```bash
# Voir les logs du Worker en temps réel
wrangler tail

# Exécuter une requête SQL
wrangler d1 execute gamification-db --command="SELECT * FROM users LIMIT 5"

# Redéployer uniquement le Worker
npm run deploy:worker

# Redéployer uniquement les Pages
npm run deploy:pages

# Redéployer tout
npm run deploy:all
```

## 🐛 Dépannage

### Erreur "table already exists"
C'est normal, les migrations utilisent `CREATE TABLE IF NOT EXISTS`. Continuez avec les migrations suivantes.

### Le Worker ne répond pas
1. Vérifiez les logs : `wrangler tail`
2. Vérifiez que le Worker est déployé : Dashboard Cloudflare > Workers
3. Vérifiez les bindings D1 et KV dans `wrangler.toml`

### Les Pages ne se chargent pas
1. Vérifiez que `NEXT_PUBLIC_API_URL` est configuré
2. Vérifiez les logs de build dans Cloudflare Dashboard
3. Testez l'API directement depuis le Worker

### Le cron ne fonctionne pas
1. Vérifiez dans Cloudflare Dashboard > Workers > Settings > Triggers
2. Le cron doit être : `0 0 * * *` (tous les jours à minuit UTC)
3. Vérifiez les logs : `wrangler tail`

### Les guerres ne se créent pas automatiquement
1. Vérifiez la configuration dans `/admin/clan-wars`
2. Vérifiez que `auto_create_wars` est à `true`
3. Vérifiez les logs du Worker

## 📚 Documentation

- [Guide Admin](ADMIN_GUIDE.md)
- [Guide Sessions](SESSIONS_GUIDE.md)
- [Déploiement Rapide](DEPLOY_QUICK.md)
- [Déploiement Guerres de Clan](DEPLOY_CLAN_WARS.md)

## 🎉 C'est Prêt !

Votre application est maintenant déployée avec toutes les fonctionnalités, y compris les guerres de clan hebdomadaires !

