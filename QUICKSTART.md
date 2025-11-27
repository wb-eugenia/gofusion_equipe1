# 🚀 Quick Start Guide

Guide rapide pour démarrer l'application de gamification.

## ⚡ Démarrage Rapide (5 minutes)

### 1. Installation

```bash
npm install
```

### 2. Configuration Cloudflare

```bash
# Créer D1
npx wrangler d1 create gamification-db

# Créer KV
npx wrangler kv namespace create sessions
npx wrangler kv namespace create sessions --preview
```

**Copiez les IDs** et mettez-les dans `wrangler.toml`.

### 3. Initialiser la base de données

```bash
npm run prisma:migrate
```

### 4. Lancer en développement

#### Terminal 1 - API Worker
```bash
npm run worker:dev
```
API disponible sur `http://localhost:8787`

#### Terminal 2 - Frontend
```bash
npm run dev
```
Frontend disponible sur `http://localhost:3000`

**Important** : Créez `.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 5. Tester l'application

1. Ouvrez `http://localhost:3000`
2. Entrez un prénom
3. Explorez les cours, badges, classement !

## 🎯 Fonctionnalités à tester

### Étudiant
- ✅ Inscription avec prénom
- ✅ Voir les cours disponibles
- ✅ Compléter un cours → gagner de l'XP
- ✅ Voir le classement
- ✅ Voir son profil avec badges
- ✅ Galerie de badges

### Admin (après création d'un admin)
- ✅ Dashboard KPI
- ✅ CRUD cours
- ✅ CRUD badges

## 🔧 Créer un Admin

```bash
# 1. Créer un utilisateur normal via l'interface
# 2. Noter son ID
# 3. Mettre à jour le rôle
npx wrangler d1 execute gamification-db --command "UPDATE users SET role = 'admin' WHERE id = 'USER_ID'"
```

## 📦 Déploiement

### Worker (API)
```bash
npm run worker:deploy
```

### Pages (Frontend)
```bash
npm run build
npm run deploy:pages
```

## 🐛 Problèmes courants

### "Cannot connect to API"
- Vérifiez que le worker tourne sur `http://localhost:8787`
- Vérifiez `.env.local`

### "Database not found"
- Vérifiez `wrangler.toml`
- Vérifiez que les migrations ont été exécutées

### "Badges not unlocking"
- Vérifiez que les badges existent dans la DB
- Vérifiez les conditions dans la base de données

## 📚 Documentation complète

- `README.md` - Documentation complète
- `DEPLOY.md` - Guide de déploiement détaillé
- `STRUCTURE.md` - Structure du projet

---

**Bon développement ! 🎮**

