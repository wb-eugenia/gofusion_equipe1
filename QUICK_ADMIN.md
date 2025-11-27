# ⚡ Accès Admin Rapide

## 🚀 Créer un Admin en 30 secondes

### Étape 1 : Créer l'utilisateur admin

```powershell
npm run create-admin
```

Ou avec un prénom personnalisé :
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/create-admin.ps1 "MonPrenom"
```

### Étape 2 : S'inscrire via l'interface

1. Allez sur http://localhost:3000
2. Entrez le **même prénom** que celui utilisé dans le script (par défaut "Admin")
3. Cliquez sur "Commencer"

### Étape 3 : Accéder au dashboard

Vous serez automatiquement connecté en tant qu'admin. Accédez à :
- **KPI** : http://localhost:3000/admin/kpi
- **Cours** : http://localhost:3000/admin/courses
- **Badges** : http://localhost:3000/admin/badges

## ✅ Vérifier les Données dans SQL

```powershell
# Voir toutes les données
npm run check-data

# Ou manuellement
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM users;"
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM courses;"
```

## 📝 Oui, Tout est Sauvegardé dans D1 (SQL) !

- ✅ **Inscription** → Table `users`
- ✅ **Création de cours** → Table `courses`
- ✅ **Complétion de cours** → Table `user_progress` + mise à jour `users.xp`
- ✅ **Badges débloqués** → Table `user_badges`
- ✅ **Création de badges** → Table `badges`

Toutes les données sont **persistantes** et stockées dans D1 (SQLite).

---

**C'est tout ! 🎉**

