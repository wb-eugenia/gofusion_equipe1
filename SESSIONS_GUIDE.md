# 📱 Guide des Sessions avec codes

## 🎯 Fonctionnalités

### Pour les Admins

1. **Dashboard Admin** (`/admin`) :
   - Voir les KPI (étudiants, XP, cours, badges)
   - Gérer les cours (créer, modifier)
   - Créer des sessions avec codes uniques
   - Voir la session active avec son code

2. **Créer une Session** :
   - Cliquez sur "📱 Nouvelle Session"
   - Choisissez la matière/cours
   - Un QR code est généré automatiquement
   - Code unique de 6 caractères

3. **Gérer les Sessions** :
   - Une seule session active à la fois
   - Arrêter une session avec le bouton "Arrêter"
   - Voir les présences dans les détails de session

### Pour les Étudiants

1. **Check-in** (`/student/checkin`) :
   - Entrer le code de session (6 caractères)
   - Gagnez 10 XP par check-in
   - Impossible de s'inscrire deux fois à la même session

## 🚀 Utilisation

### Étape 1 : Créer un Admin

```powershell
npm run create-admin
```

### Étape 2 : Créer des Cours

1. Allez sur `/admin`
2. Cliquez sur "+ Nouveau Cours"
3. Remplissez les informations
4. Créez plusieurs cours

### Étape 3 : Créer une Session

1. Sur `/admin`, cliquez sur "📱 Nouvelle Session"
2. Sélectionnez la matière/cours
3. Cliquez sur "Créer Session"
4. Le code de session est affiché

### Étape 4 : Les Étudiants s'Inscrivent

1. Les étudiants vont sur `/student/checkin`
2. Ils entrent le code de la session fourni par l’enseignant
3. Ils gagnent 10 XP automatiquement
4. Redirection vers `/student/courses`

## 💾 Base de Données

### Tables Créées

- **sessions** : Sessions de présence
  - `id`, `course_id`, `created_by`, `code`, `is_active`, `created_at`, `expires_at`

- **session_attendances** : Présences des étudiants
  - `id`, `session_id`, `user_id`, `checked_in_at`

### Migration

Exécutez la migration pour créer les tables :

```bash
npm run prisma:migrate:local
```

## 📊 Données Sauvegardées

✅ **Tout est sauvegardé dans D1 (SQL)** :
- Sessions créées
- Codes générés
- Présences des étudiants
- XP gagnés

## 🔍 Vérifier les Données

```powershell
# Voir les sessions
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM sessions;"

# Voir les présences
npx wrangler d1 execute gamification-db --local --command "SELECT * FROM session_attendances;"
```

## 🎨 Interface

### Dashboard Admin (`/admin`)
- KPI en haut (4 cartes)
- Session active avec code (si active)
- Liste des cours avec actions

### Check-in Étudiant (`/student/checkin`)
- Formulaire simple avec champ code
- Affichage des erreurs/succès
- Redirection automatique après succès

## ⚙️ Configuration

- **Code unique** : 6 caractères alphanumériques
- **Expiration** : 2 heures par défaut
- **XP par check-in** : 10 XP
- **Une seule session active** : La création d'une nouvelle session désactive l'ancienne

---

**Tout est prêt ! Créez des sessions et les étudiants peuvent s'inscrire avec leur code de session ! 🎉**

