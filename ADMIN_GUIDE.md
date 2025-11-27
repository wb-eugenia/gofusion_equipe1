# 👨‍💼 Guide Admin - Accès et Utilisation

## 🎯 Accéder au Dashboard Admin

### Méthode 1 : Créer un Admin via Script (Recommandé)

#### Sur Windows (PowerShell)

```powershell
.\scripts\create-admin.ps1 "Admin"
```

Remplacez `"Admin"` par le prénom que vous voulez utiliser.

#### Sur Linux/Mac

```bash
chmod +x scripts/create-admin.sh
./scripts/create-admin.sh Admin
```

**Ensuite :**
1. Allez sur http://localhost:3000
2. Inscrivez-vous avec le **même prénom** que celui utilisé dans le script
3. Vous serez automatiquement connecté en tant qu'admin
4. Accédez à http://localhost:3000/admin/kpi

### Méthode 2 : Créer un Admin Manuellement

1. **Créez un utilisateur normal** via l'interface web (http://localhost:3000)
2. **Notez le prénom** utilisé
3. **Exécutez cette commande** :

```powershell
# Pour la DB locale
npx wrangler d1 execute gamification-db --local --command "UPDATE users SET role = 'admin' WHERE prenom = 'VotrePrenom';"

# Pour la DB distante (production)
npx wrangler d1 execute gamification-db --command "UPDATE users SET role = 'admin' WHERE prenom = 'VotrePrenom';"
```

4. **Déconnectez-vous et reconnectez-vous** avec le même prénom

## 📊 Pages Admin Disponibles

### 1. Dashboard KPI (`/admin/kpi`)

Affiche les statistiques :
- 👥 Nombre total d'étudiants
- ⭐ XP total accumulé
- 📚 Nombre de cours actifs
- 🎖️ Nombre de badges débloqués

### 2. Gestion des Cours (`/admin/courses`)

- ✅ Voir tous les cours
- ➕ Créer un nouveau cours
- ✏️ Modifier un cours existant
- 🗑️ Supprimer un cours

**Pour créer un cours :**
1. Cliquez sur "Nouveau Cours"
2. Remplissez :
   - **Titre** : Nom du cours
   - **Description** : Description du cours
   - **XP Reward** : Points XP gagnés à la complétion
3. Cliquez sur "Créer"

### 3. Gestion des Badges (`/admin/badges`)

- ✅ Voir tous les badges
- ➕ Créer un nouveau badge
- ✏️ Modifier un badge existant
- 🗑️ Supprimer un badge

## 💾 Vérifier que les Données sont Sauvegardées

### Script de Vérification

```powershell
# Vérifier la DB locale
.\scripts\check-data.ps1

# Vérifier la DB distante
.\scripts\check-data.ps1 -Local:$false
```

### Vérification Manuelle

```powershell
# Voir tous les utilisateurs
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM users;"

# Voir tous les cours
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM courses;"

# Voir tous les badges
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM badges;"

# Voir la progression
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM user_progress;"
```

## ✅ Oui, les Données sont Sauvegardées dans D1 (SQL)

**Toutes les opérations sont persistantes :**

- ✅ **Inscription** → Enregistré dans `users`
- ✅ **Création de cours** → Enregistré dans `courses`
- ✅ **Complétion de cours** → Enregistré dans `user_progress` + XP ajouté dans `users`
- ✅ **Déblocage de badges** → Enregistré dans `user_badges`
- ✅ **Création de badges** → Enregistré dans `badges`

### Base de Données Locale vs Distante

- **Locale** (`.wrangler/state/v3/d1/`) : Pour le développement
- **Distante** (Cloudflare) : Pour la production

Les deux sont des bases SQLite (D1) et fonctionnent de la même manière.

## 🔍 Tester l'Enregistrement

1. **Créez un cours** via `/admin/courses`
2. **Vérifiez dans la DB** :
   ```powershell
   npx wrangler d1 execute gamification-db --local --command "SELECT * FROM courses;"
   ```
3. **Complétez le cours** en tant qu'étudiant
4. **Vérifiez la progression** :
   ```powershell
   npx wrangler d1 execute gamification-db --local --command "SELECT * FROM user_progress;"
   ```

## 🚀 Workflow Complet

1. **Créer un admin** : `.\scripts\create-admin.ps1 "Admin"`
2. **S'inscrire** : http://localhost:3000 avec le prénom "Admin"
3. **Accéder au dashboard** : http://localhost:3000/admin/kpi
4. **Créer des cours** : http://localhost:3000/admin/courses
5. **Vérifier les données** : `.\scripts\check-data.ps1`

## 📝 Notes Importantes

- Les données sont **persistantes** entre les redémarrages
- La DB locale est stockée dans `.wrangler/state/v3/d1/`
- Pour réinitialiser la DB locale, supprimez ce dossier
- Les migrations sont exécutées avec `npm run prisma:migrate:local`

---

**Tout est sauvegardé dans D1 (SQL) ! 🎉**

