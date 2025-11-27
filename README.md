# 🎮 Gamification App - Application de Gamification pour Étudiants

Application web complète de gamification pour étudiants avec système de badges/achievements, déployable sur Cloudflare Pages avec D1.

## 🚀 Stack Technique

- **Cloudflare Pages** (Next.js 14 App Router)
- **Cloudflare Workers** + **Hono** (API)
- **D1 database** (Drizzle ORM)
- **TypeScript** + **Tailwind CSS**
- **Cloudflare KV** (sessions)

## 📁 Structure du Projet

```
my-gamification-app/
├── pages/              # Frontend Next.js
│   ├── app/           # App Router
│   ├── components/    # Composants React
│   └── lib/           # Utilitaires
├── workers/           # API Hono
│   └── src/
│       └── index.ts
├── prisma/           # Schema D1
│   ├── schema.d1.ts
│   └── migrations/
├── public/badges/    # Icons SVG badges
└── wrangler.toml
```

## 🎯 Fonctionnalités

### Pour les Étudiants
- ✅ Inscription simple (prénom)
- ✅ Liste des cours avec progression
- ✅ Complétion de cours → gain d'XP automatique
- ✅ Classement en temps réel (Top 10)
- ✅ Profil avec statistiques (XP, streak, progression)
- ✅ Galerie de badges avec pourcentage de déblocage
- ✅ Déblocage automatique de badges selon les conditions

### Pour les Admins
- ✅ Dashboard KPI (étudiants, XP total, cours, badges)
- ✅ CRUD complet des cours
- ✅ CRUD complet des badges
- ✅ Gestion des conditions de déblocage

### Système de Badges
- 🎖️ **Débutant** : 50 XP
- 🎖️ **Étudiant sérieux** : 250 XP
- 🎖️ **Top 10%** : Être dans le top 10
- 🎖️ **Cours complété** : 5+ cours finis
- 🎖️ **Streak 7 jours** : 7 jours consécutifs
- 🎖️ **Maître** : 1000 XP
- 🎖️ **Expert** : 10 cours complétés
- 🎖️ **Légende** : 5000 XP

## 🛠️ Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Cloudflare

#### Créer la base de données D1

```bash
npx wrangler d1 create gamification-db
```

Copiez le `database_id` retourné et mettez-le dans `wrangler.toml` :

```toml
[[d1_databases]]
binding = "DB"
database_name = "gamification-db"
database_id = "VOTRE_DATABASE_ID"
```

#### Créer le namespace KV

```bash
npx wrangler kv namespace create sessions
npx wrangler kv namespace create sessions --preview
```

Copiez les IDs et mettez-les dans `wrangler.toml` :

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "VOTRE_KV_ID"
preview_id = "VOTRE_KV_PREVIEW_ID"
```

### 3. Initialiser la base de données

```bash
npm run prisma:migrate
```

Cette commande exécute le schéma SQL dans D1 et crée les badges par défaut.

### 4. Créer un utilisateur admin (optionnel)

Vous pouvez créer un utilisateur admin directement dans la base de données ou via l'API.

## 🚀 Déploiement

### Déployer le Worker (API)

```bash
npm run worker:deploy
```

### Déployer Pages (Frontend)

```bash
npm run build
npm run deploy:pages
```

Ou en une seule commande :

```bash
npm run deploy:all
```

### Développement local

#### Worker (API)

```bash
npm run worker:dev
```

L'API sera disponible sur `http://localhost:8787`

#### Frontend Next.js

```bash
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`

**Important** : Configurez `NEXT_PUBLIC_API_URL` dans `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## 📝 Configuration

### Variables d'environnement

Créez un fichier `.env.local` pour le développement :

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

Pour la production, configurez les variables dans Cloudflare Pages.

### wrangler.toml

Assurez-vous que votre `wrangler.toml` contient :

- Le `database_id` de votre D1
- Les IDs de vos namespaces KV
- Le nom de votre worker

## 🎮 Utilisation

### Première connexion

1. Accédez à la landing page
2. Entrez votre prénom
3. Vous êtes redirigé vers `/student/courses`

### Compléter un cours

1. Allez sur `/student/courses`
2. Cliquez sur "Commencer" pour un cours
3. L'XP est ajoutée automatiquement
4. Les badges sont vérifiés et débloqués automatiquement

### Accéder au dashboard admin

Pour créer un utilisateur admin, vous devez modifier directement la base de données D1 ou utiliser l'API.

## 🔧 API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `GET /api/user` - Informations utilisateur + badges

### Courses
- `GET /api/courses` - Liste des cours
- `POST /api/courses/:id/complete` - Compléter un cours

### Ranking
- `GET /api/student/ranking` - Classement (Top 10 + position)

### Badges
- `GET /api/student/badges` - Tous les badges avec statut

### Admin
- `GET /api/admin/kpi` - Statistiques
- `GET /api/admin/courses` - Liste des cours
- `POST /api/admin/courses` - Créer un cours
- `PUT /api/admin/courses/:id` - Modifier un cours
- `DELETE /api/admin/courses/:id` - Supprimer un cours
- `GET /api/admin/badges` - Liste des badges
- `POST /api/admin/badges` - Créer un badge
- `PUT /api/admin/badges/:id` - Modifier un badge
- `DELETE /api/admin/badges/:id` - Supprimer un badge

## 🎨 Personnalisation

### Ajouter des badges

1. Créez un fichier SVG dans `public/badges/`
2. Allez sur `/admin/badges`
3. Cliquez sur "Nouveau Badge"
4. Remplissez le formulaire avec les conditions

### Modifier les couleurs

Éditez `tailwind.config.js` pour personnaliser les couleurs du thème.

## 📚 Documentation

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Hono](https://hono.dev/)
- [Next.js 14](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)

## 🐛 Dépannage

### Erreur de connexion à la base de données

Vérifiez que :
- Le `database_id` dans `wrangler.toml` est correct
- La base de données existe bien dans Cloudflare
- Les migrations ont été exécutées

### Erreur CORS

L'API est configurée pour accepter toutes les origines en développement. En production, configurez CORS dans `workers/src/index.ts`.

### Badges ne se débloquent pas

Vérifiez que :
- La fonction `checkAndUnlockBadges` est appelée après chaque action
- Les conditions dans la base de données sont correctes
- L'utilisateur remplit bien les conditions

## 📄 Licence

MIT

## 🙏 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

**Créé avec ❤️ pour les étudiants**

