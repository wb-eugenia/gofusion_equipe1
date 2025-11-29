# Guide de Déploiement - Gamification App

Ce guide vous explique comment déployer l'application sur Cloudflare Pages avec D1 et Workers.

## Prérequis

1. Compte Cloudflare (gratuit)
2. Node.js installé
3. Wrangler CLI installé : `npm install -g wrangler`

## Étapes de Déploiement

### 1. Connexion à Cloudflare

```bash
wrangler login
```

### 2. Migrer la Base de Données D1 (Production)

```bash
npm run prisma:migrate
```

Cette commande exécute le schéma SQL sur la base de données D1 en production.

### 3. Déployer le Worker (API)

```bash
npm run deploy:worker
```

Cette commande déploie l'API Hono sur Cloudflare Workers.

### 4. Déployer Next.js sur Cloudflare Pages

#### Option A : Via Wrangler CLI

```bash
npm run build
wrangler pages deploy .next --project-name=gamification-app
```

#### Option B : Via Git (Recommandé)

1. Poussez votre code sur GitHub
2. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Pages > Create a project > Connect to Git
4. Sélectionnez votre repository
5. Configuration :
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/`

### 5. Configurer les Variables d'Environnement

Dans Cloudflare Pages Dashboard :
- Settings > Environment Variables
- Ajoutez les variables nécessaires si besoin

### 6. Lier le Worker au Pages Project

Dans `wrangler.toml`, assurez-vous que les bindings D1 et KV sont corrects.

## Configuration du Worker pour Pages

Le Worker doit être accessible depuis Pages. Assurez-vous que l'URL du Worker est configurée dans `pages/lib/api.ts`.

## Vérification

1. Vérifiez que le Worker répond : `https://gamification-app-prod.workers.dev/`
2. Vérifiez que Pages est déployé : Votre URL Pages
3. Testez l'application complète

## Commandes Utiles

```bash
# Déployer tout
npm run deploy:all

# Vérifier les logs du Worker
wrangler tail

# Vérifier les données D1
wrangler d1 execute gamification-db --command="SELECT * FROM users LIMIT 5"
```

## Notes Importantes

- Le mot de passe admin est `1234` (à changer en production)
- Les sessions sont stockées dans Cloudflare KV
- La base de données D1 est SQLite (gratuite jusqu'à 5GB)
- Cloudflare Pages est gratuit jusqu'à 500 builds/mois

## Support

En cas de problème, vérifiez :
1. Les logs du Worker : `wrangler tail`
2. Les logs de Pages dans le Dashboard
3. La console du navigateur pour les erreurs frontend
