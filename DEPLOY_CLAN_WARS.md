# Guide de Déploiement - Guerres de Clan

Ce guide explique comment déployer les nouvelles fonctionnalités de guerres de clan.

## ⚠️ Important

Les nouvelles migrations pour les guerres de clan doivent être appliquées avant le déploiement.

## Déploiement Rapide

### Windows (PowerShell)

```powershell
npm run deploy:all:ps1
```

### Linux/Mac (Bash)

```bash
chmod +x scripts/deploy-all.sh
npm run deploy:all:sh
```

## Déploiement Manuel

### 1. Migrations de Base de Données

Appliquez les nouvelles migrations dans l'ordre :

```bash
# Schéma principal (si pas déjà fait)
wrangler d1 execute gamification-db --file=./prisma/migrations/schema.sql

# Migrations des guerres de clan
wrangler d1 execute gamification-db --file=./prisma/migrations/add-clans-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-clan-wars-system.sql
wrangler d1 execute gamification-db --file=./prisma/migrations/add-clan-wars-config.sql
```

### 2. Déployer le Worker

```bash
npm run deploy:worker
```

### 3. Déployer les Pages

```bash
npm run build
wrangler pages deploy out --project-name=gamification-app
```

## Vérification Post-Déploiement

1. **Vérifier les tables créées** :
   ```bash
   wrangler d1 execute gamification-db --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'clan%'"
   ```

2. **Vérifier la configuration** :
   ```bash
   wrangler d1 execute gamification-db --command="SELECT * FROM clan_wars_config"
   ```

3. **Tester l'API** :
   - Worker: `https://gamification-app-prod.workers.dev/`
   - Test config: `https://gamification-app-prod.workers.dev/api/admin/clan-wars/config`

4. **Tester l'interface admin** :
   - Accédez à `/admin/clan-wars` dans votre application
   - Vérifiez que la configuration s'affiche correctement

## Configuration Initiale

Après le déploiement, connectez-vous en tant qu'admin et :

1. Allez sur `/admin/clan-wars`
2. Vérifiez/configurez les paramètres :
   - Récompense par membre (défaut: 50 bananes)
   - Guerres activées (défaut: true)
   - Création automatique (défaut: true)

## Cron Job

Le cron job est configuré dans `wrangler.toml` pour s'exécuter tous les jours à minuit UTC :
- Finalise les guerres expirées
- Distribue les récompenses
- Crée automatiquement de nouvelles guerres (si activé)

## Dépannage

### Erreur "table already exists"
C'est normal si les migrations ont déjà été appliquées. Le script continue avec les migrations suivantes.

### Le cron ne fonctionne pas
Vérifiez que le cron est activé dans le dashboard Cloudflare Workers :
1. Allez sur votre Worker
2. Settings > Triggers
3. Vérifiez que le cron est configuré

### Les guerres ne se créent pas automatiquement
1. Vérifiez la configuration dans `/admin/clan-wars`
2. Vérifiez que `auto_create_wars` est à `true`
3. Vérifiez les logs du Worker : `wrangler tail`

## Support

En cas de problème :
1. Vérifiez les logs : `wrangler tail`
2. Vérifiez les données D1 dans le dashboard Cloudflare
3. Testez les endpoints API individuellement

