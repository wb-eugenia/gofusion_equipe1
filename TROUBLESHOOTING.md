# 🔧 Guide de Dépannage - Erreurs 404

## 🐛 Problème : Erreurs 404 sur localhost et Worker

### ✅ Vérifications à faire

#### 1. Vérifier que le Worker tourne

```bash
npm run worker:dev
```

Vous devriez voir :
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**Si le Worker ne démarre pas :**
- Vérifiez que vous êtes dans le bon dossier
- Vérifiez que `wrangler.toml` est correct
- Vérifiez les erreurs dans le terminal

#### 2. Vérifier que Next.js tourne

```bash
npm run next:dev
```

Vous devriez voir :
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

**Si Next.js ne démarre pas :**
- Supprimez `.next` : `Remove-Item -Recurse -Force .next`
- Réinstallez : `npm install`

#### 3. Tester l'API directement

Ouvrez un nouveau terminal et testez :

```powershell
# Test d'inscription
Invoke-WebRequest -Uri "http://localhost:8787/api/auth/register" -Method POST -ContentType "application/json" -Body '{"prenom":"Test"}'
```

**Si ça ne fonctionne pas :**
- Le Worker n'est pas lancé
- Le port 8787 est occupé
- Il y a une erreur dans le Worker

#### 4. Vérifier les variables d'environnement

Créez `.env.local` à la racine :

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

**Important :** Redémarrez Next.js après avoir créé/modifié `.env.local`

#### 5. Vérifier la structure des fichiers

La structure doit être :

```
app/                    ← À la racine
├── layout.tsx
├── page.tsx
├── globals.css
└── ...

pages/
├── components/
└── lib/
```

**Si les fichiers sont dans `pages/app/` :**
- Déplacez-les vers `app/` à la racine
- Mettez à jour `tsconfig.json` et `tailwind.config.js`

### 🔍 Diagnostic détaillé

#### Tester le Worker seul

```bash
# Terminal 1
npm run worker:dev
```

Dans un autre terminal :

```bash
# Test simple
curl http://localhost:8787/api/auth/register -X POST -H "Content-Type: application/json" -d '{"prenom":"Test"}'
```

#### Tester Next.js seul

```bash
# Terminal 1
npm run next:dev
```

Ouvrez http://localhost:3000 dans le navigateur.

#### Tester les deux ensemble

```bash
npm run dev
```

Cette commande lance les deux en même temps.

### 🛠️ Solutions courantes

#### Erreur : "Cannot GET /"
- Le Worker n'a pas de route pour `/`
- Normal, les routes commencent par `/api/`

#### Erreur : "Failed to fetch"
- Le Worker n'est pas lancé
- Mauvaise URL dans `.env.local`
- Problème CORS (normalement géré)

#### Erreur : "404 Not Found" sur les routes API
- Vérifiez que les routes existent dans `workers/src/index.ts`
- Vérifiez que le Worker exporte correctement : `export default app;`

#### Erreur : "Database not found"
- Exécutez : `npm run prisma:migrate:local`
- Vérifiez `wrangler.toml` contient le bon `database_id`

### 📝 Checklist de débogage

- [ ] Worker tourne sur http://localhost:8787
- [ ] Next.js tourne sur http://localhost:3000
- [ ] `.env.local` existe avec `NEXT_PUBLIC_API_URL=http://localhost:8787`
- [ ] Structure correcte : `app/` à la racine
- [ ] Base de données locale initialisée : `npm run prisma:migrate:local`
- [ ] Pas d'erreurs dans les terminaux
- [ ] Ports 3000 et 8787 libres

### 🚀 Commandes de réinitialisation

Si rien ne fonctionne :

```bash
# 1. Arrêter tous les processus
# Ctrl+C dans tous les terminaux

# 2. Nettoyer
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# 3. Réinitialiser la DB locale
Remove-Item -Recurse -Force .wrangler\state\v3\d1
npm run prisma:migrate:local

# 4. Relancer
npm run dev
```

### 💡 Aide supplémentaire

Si le problème persiste :

1. **Vérifiez les logs du Worker** dans le terminal où il tourne
2. **Vérifiez la console du navigateur** (F12) pour les erreurs
3. **Testez l'API directement** avec curl ou Postman
4. **Vérifiez que les ports ne sont pas occupés**

---

**Besoin d'aide ? Vérifiez d'abord que le Worker et Next.js tournent tous les deux !**

