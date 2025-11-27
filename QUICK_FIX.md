# ⚡ Fix Rapide - Erreurs 404

## 🎯 Solution Rapide

### Étape 1 : Arrêter tous les processus

Appuyez sur `Ctrl+C` dans tous les terminaux pour arrêter les serveurs.

### Étape 2 : Nettoyer le cache

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

### Étape 3 : Vérifier la configuration

Assurez-vous que `.env.local` existe à la racine avec :

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Étape 4 : Lancer le Worker SEUL d'abord

```bash
npm run worker:dev
```

**Attendez de voir :**
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**Testez dans un nouveau terminal :**
```powershell
Invoke-WebRequest -Uri "http://localhost:8787/api/auth/register" -Method POST -ContentType "application/json" -Body '{"prenom":"Test"}'
```

Si ça fonctionne, vous devriez voir une réponse JSON avec `sessionId`.

### Étape 5 : Si le Worker fonctionne, lancer Next.js

Dans un **nouveau terminal** (gardez le Worker qui tourne) :

```bash
npm run next:dev
```

Ouvrez http://localhost:3000

### Étape 6 : Si les deux fonctionnent séparément, lancer ensemble

```bash
npm run dev
```

## 🔍 Diagnostic

### Le Worker ne démarre pas ?

1. Vérifiez `wrangler.toml` :
   - Le `database_id` est correct
   - Les IDs KV sont corrects

2. Vérifiez les erreurs dans le terminal

3. Réinitialisez la DB locale :
   ```bash
   npm run prisma:migrate:local
   ```

### Next.js ne démarre pas ?

1. Supprimez `.next` :
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

2. Vérifiez que `app/` existe à la racine (pas `pages/app/`)

3. Vérifiez `tsconfig.json` :
   ```json
   "@/*": ["./app/*"]
   ```

### Les deux tournent mais 404 ?

1. Vérifiez `.env.local` :
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8787
   ```

2. Redémarrez Next.js après avoir créé/modifié `.env.local`

3. Vérifiez la console du navigateur (F12) pour les erreurs

## ✅ Checklist

- [ ] Worker tourne sur http://localhost:8787
- [ ] Test API direct fonctionne
- [ ] Next.js tourne sur http://localhost:3000
- [ ] `.env.local` existe avec la bonne URL
- [ ] Structure `app/` à la racine
- [ ] Pas d'erreurs dans les terminaux

---

**Commencez par tester le Worker SEUL, puis Next.js SEUL, puis les deux ensemble !**

