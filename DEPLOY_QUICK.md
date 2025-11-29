# Déploiement Rapide

## 1. Préparer l'environnement

```bash
# Installer les dépendances
npm install

# Se connecter à Cloudflare
wrangler login
```

## 2. Déployer la base de données

```bash
npm run prisma:migrate
```

## 3. Déployer le Worker (API)

```bash
npm run deploy:worker
```

Notez l'URL du Worker (ex: `https://gamification-app-prod.workers.dev`)

## 4. Configurer l'URL de l'API

Créez un fichier `.env.local` :
```
NEXT_PUBLIC_API_URL=https://gamification-app-prod.workers.dev
```

## 5. Déployer sur Cloudflare Pages

### Via Git (Recommandé)
1. Poussez votre code sur GitHub
2. Cloudflare Dashboard > Pages > Create project
3. Connectez votre repo
4. Build settings :
   - Framework: Next.js
   - Build command: `npm run build`
   - Build output: `.next`

### Via CLI
```bash
npm run build
wrangler pages deploy .next --project-name=gamification-app
```

## 6. Vérifier

Votre site sera accessible sur : `https://gamification-app.pages.dev`

## Important

- Le mot de passe admin est `1234`
- Créez un admin avec `npm run create-admin` en local puis migrez les données

