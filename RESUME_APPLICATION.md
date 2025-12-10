# 📚 Résumé Détaillé de l'Application GoFusion

## 🎯 Vue d'Ensemble

**GoFusion** est une plateforme de gamification éducative complète permettant aux étudiants d'apprendre via des cours interactifs, de gagner des points (bananes 🍌), de débloquer des badges, et de participer à des activités sociales (clans, duels, sessions en direct).

---

## 🏗️ Architecture Technique

### Stack Technologique

- **Frontend** : Next.js 14 (App Router) + React 18 + TypeScript
- **Backend API** : Cloudflare Workers + Hono (framework web)
- **Base de données** : Cloudflare D1 (SQLite) avec Drizzle ORM
- **Sessions** : Cloudflare KV (stockage clé-valeur)
- **Styling** : Tailwind CSS
- **Éditeur de texte riche** : React Quill
- **Déploiement** : Cloudflare Pages (frontend) + Cloudflare Workers (API)

### Structure du Projet

```
gofusion/
├── app/                    # Next.js App Router
│   ├── admin/              # Interface administrateur
│   ├── student/            # Interface étudiant
│   └── page.tsx            # Landing page
├── components/             # Composants React réutilisables
├── hooks/                  # Hooks personnalisés (usePopup, useToast)
├── lib/                    # Utilitaires (api.ts)
├── workers/src/            # API Hono (Cloudflare Worker)
├── prisma/                 # Schéma D1 + migrations
├── public/                 # Assets statiques (badges, singes)
└── scripts/                # Scripts PowerShell/Bash (setup, deploy)
```

---

## 💾 Base de Données (D1 - SQLite)

### Tables Principales

#### **users**
- `id`, `prenom`, `xp` (bananes), `role` (student/admin), `streakDays`, `createdAt`

#### **courses**
- `id`, `titre`, `description`, `matiereId`, `gameType` (quiz/memory/match), `theoreticalContent` (HTML), `xpReward`, `createdAt`

#### **questions**
- `id`, `courseId`, `question`, `type` (multiple_choice/memory_pair/match_pair), `options` (JSON), `correctAnswer`, `order`, `createdAt`

#### **userProgress**
- `id`, `userId`, `courseId`, `completedAt`

#### **badges**
- `id`, `name`, `icon`, `description`, `thresholdXp`, `conditionType`, `conditionValue`, `createdAt`

#### **userBadges**
- `id`, `userId`, `badgeId`, `unlockedAt`

#### **sessions**
- `id`, `courseId`, `createdBy`, `code` (unique QR code), `isActive`, `status` (waiting/started/finished), `startedAt`, `createdAt`, `expiresAt`, `isFixed`, `recurrenceType`, `scheduledAt`

#### **sessionAttendances**
- `id`, `sessionId`, `userId`, `checkedInAt`

#### **sessionQuizAnswers**
- `id`, `sessionId`, `userId`, `questionId`, `answer`, `isCorrect`, `answeredAt`

#### **shopItems**
- `id`, `name`, `description`, `type` (skin/powerup/cosmetic), `price`, `data` (JSON), `icon`, `createdAt`

#### **userPurchases** & **userSkins**
- Gestion des achats et activation de skins

#### **duels** & **duelAnswers**
- Système de duels entre étudiants avec paris en bananes

#### **clans**, **clanMembers**, **clanWars**, **clanWarContributions**
- Système de clans par matière avec guerres de clans hebdomadaires

#### **friendships** & **friendRequests**
- Système d'amis

#### **stressLevels**
- Suivi du stress avant/après cours

#### **matieres**
- Catégories de cours (Sciences, Français, etc.)

---

## 👨‍🎓 Fonctionnalités Côté Étudiant

### 1. **Landing Page** (`app/page.tsx`)
- Inscription ultra-simple (juste le prénom)
- Présentation des fonctionnalités (bananes, badges, classement, cours, sessions, streak)
- Design moderne avec mascotte (singe professeur)

### 2. **Cours** (`app/student/courses/`)
- **Liste des cours** (`page.tsx`) :
  - Sélection par matière
  - Affichage des cours avec XP reward
  - Bouton "Commencer" adapté au type (Quiz/Memory/Relier)
  
- **Jeu de cours** (`quiz/page.tsx`) :
  - **Type Quiz** : Questions QCM séquentielles avec progression
  - **Type Memory** : Grille de cartes à retourner, trouver les paires (emoji ↔ mot)
  - **Type Match** : Relier définitions ↔ mots avec lignes colorées
  - Affichage du contenu théorique (HTML)
  - Slider de stress avant/après
  - Validation si score ≥ 50%
  - Attribution automatique des bananes

### 3. **Classement** (`app/student/ranking/page.tsx`)
- Top 10 des étudiants
- Position de l'utilisateur
- Affichage des XP (bananes)

### 4. **Profil** (`app/student/profile/`)
- Statistiques personnelles (XP, streak, cours complétés)
- Badges débloqués
- Vue publique du profil

### 5. **Badges** (`app/student/badges/page.tsx`)
- Galerie de tous les badges
- Badges débloqués vs verrouillés
- Pourcentage de complétion
- Conditions de déblocage affichées

### 6. **Boutique** (`app/student/shop/page.tsx`)
- Achat de skins (singes) avec bananes
- Filtres par type (Skins/Power-ups/Cosmétiques)
- Activation de skins achetés
- Affichage des icônes de skins

### 7. **Sessions** (`app/student/checkin/` & `session/quiz/`)
- Check-in via code de session (QR code)
- Participation aux quiz en direct
- Réponses en temps réel
- Classement de session

### 8. **Duels** (`app/student/duel/`)
- Création de duels avec paris en bananes
- Lobby d'attente
- Jeu en temps réel contre un adversaire
- Attribution des gains/pertes

### 9. **Clans** (`app/student/clans/`)
- Création/rejoindre des clans par matière
- Guerres de clans hebdomadaires
- Contribution en bananes
- Classement des clans

### 10. **Amis** (`app/student/friends/page.tsx`)
- Envoi/demande d'amis
- Liste des amis
- Activité des amis

---

## 👨‍💼 Fonctionnalités Côté Admin

### 1. **Dashboard** (`app/admin/page.tsx`)
- KPI en temps réel :
  - Nombre d'étudiants
  - Total de bananes distribuées
  - Cours actifs
  - Badges débloqués
- Session active avec QR code
- Boutons pour lancer/arrêter les sessions

### 2. **Gestion des Cours** (`app/admin/courses/page.tsx`)
- **CRUD complet** :
  - Création/Modification/Suppression
  - Titre, description, matière, contenu théorique (WYSIWYG)
  - Récompense en bananes
  
- **Gestion des Questions** (intégrée dans la modale) :
  - Ajout/Modification/Suppression de questions
  - **3 types de questions** :
    - **QCM** (`multiple_choice`) : Question + options JSON + index bonne réponse
    - **Memory** (`memory_pair`) : Paire terme ↔ définition (emoji ↔ mot)
    - **Match** (`match_pair`) : Paire définition ↔ mot à relier
  
- **Détermination automatique du type de cours** :
  - Le `gameType` (quiz/memory/match) est déduit automatiquement du type des questions
  - Validation : toutes les questions doivent être du même type

### 3. **Gestion des Badges** (`app/admin/badges/page.tsx`)
- CRUD complet
- Conditions de déblocage :
  - `xp` : Seuil d'XP
  - `top10` : Être dans le top 10
  - `courses_completed` : Nombre de cours complétés
  - `streak` : Jours consécutifs
- Upload d'icônes SVG

### 4. **Gestion de la Boutique** (`app/admin/shop/page.tsx`)
- CRUD des items (skins, power-ups, cosmétiques)
- **Sélecteur d'icônes visuel** :
  - Grille des 11 images de singes depuis `singes/singes boutique`
  - Sélection visuelle avec aperçu
  - Chemin automatique rempli (`/singes/singes boutique/nom.png`)
- Prix en bananes
- Métadonnées JSON optionnelles

### 5. **Sessions** (`app/admin/sessions/page.tsx`)
- Création de sessions avec code unique
- QR code pour check-in
- Lancement/arrêt des quiz
- Suivi des présences
- Sessions récurrentes (quotidiennes/hebdomadaires)

### 6. **Analytics** (`app/admin/analytics/page.tsx`)
- Statistiques détaillées
- Graphiques de progression

### 7. **Guerres de Clans** (`app/admin/clan-wars/page.tsx`)
- Configuration des guerres
- Création manuelle
- Fin de guerre
- Statistiques

### 8. **Gestion des Clans** (`app/admin/clans/page.tsx`)
- Liste des clans
- Membres par clan
- Suppression de membres

---

## 🎮 Systèmes de Gamification

### 1. **Système de Bananes (XP)**
- Gagnées via :
  - Complétion de cours (récompense configurable)
  - Participation aux sessions (+10 bananes)
  - Victoires en duels (gains du pari)
  - Contributions aux guerres de clans
- Utilisées pour :
  - Acheter des skins dans la boutique
  - Parier dans les duels

### 2. **Système de Badges**
- **Badges par défaut** :
  - 🎖️ Débutant : 50 XP
  - 🎖️ Étudiant sérieux : 250 XP
  - 🎖️ Top 10% : Être dans le top 10
  - 🎖️ Cours complété : 5+ cours finis
  - 🎖️ Streak 7 jours : 7 jours consécutifs
  - 🎖️ Maître : 1000 XP
  - 🎖️ Expert : 10 cours complétés
  - 🎖️ Légende : 5000 XP
- Déblocage automatique après chaque action (complétion cours, gain XP, etc.)

### 3. **Streak (Série)**
- Compteur de jours consécutifs d'activité
- Réinitialisé si pas d'activité un jour

### 4. **Classement**
- Top 10 global
- Position personnelle
- Mise à jour en temps réel

---

## 📝 Types de Cours et Tests

### 1. **Quiz (QCM)**
- **Côté admin** :
  - Création de questions avec plusieurs options
  - Définition de la bonne réponse (index)
  
- **Côté étudiant** :
  - Affichage séquentiel des questions
  - Sélection d'une option
  - Navigation précédent/suivant
  - Score calculé à la fin
  - Validation si ≥ 50%

### 2. **Memory**
- **Côté admin** :
  - Création de paires (terme ↔ définition, ou emoji ↔ mot)
  - Stockage dans `options` (JSON array)
  
- **Côté étudiant** :
  - Grille de cartes mélangées
  - Clic pour retourner 2 cartes
  - Si paire trouvée → reste verte
  - Si erreur → retourne après 1.5s
  - Victoire uniquement si **toutes les paires trouvées**

### 3. **Match (Relier)**
- **Côté admin** :
  - Création de paires définition ↔ mot
  - Stockage dans `options` (JSON array)
  
- **Côté étudiant** :
  - Colonne gauche : définitions
  - Colonne droite : mots mélangés
  - Clic définition → clic mot → **ligne colorée** entre les deux
  - Chaque paire correcte a une **couleur unique**
  - Validation uniquement si **toutes les correspondances correctes**

---

## 🔌 API Endpoints (Cloudflare Worker)

### Auth
- `POST /api/auth/register` - Inscription (prénom)
- `GET /api/user` - Infos utilisateur + badges

### Courses (Étudiant)
- `GET /api/courses` - Liste des cours
- `GET /api/courses/:id` - Détails d'un cours + questions
- `POST /api/courses/:id/complete` - Compléter un cours

### Admin - Courses
- `GET /api/admin/courses` - Liste des cours
- `POST /api/admin/courses` - Créer un cours
- `PUT /api/admin/courses/:id` - Modifier un cours
- `DELETE /api/admin/courses/:id` - Supprimer un cours
- `GET /api/admin/courses/:id/questions` - Questions d'un cours
- `POST /api/admin/courses/:id/questions` - Créer une question
- `PUT /api/admin/questions/:id` - Modifier une question
- `DELETE /api/admin/questions/:id` - Supprimer une question

### Admin - Badges
- `GET /api/admin/badges` - Liste des badges
- `POST /api/admin/badges` - Créer un badge
- `PUT /api/admin/badges/:id` - Modifier un badge
- `DELETE /api/admin/badges/:id` - Supprimer un badge

### Admin - Shop
- `GET /api/admin/shop/items` - Liste des items
- `POST /api/admin/shop/items` - Créer un item
- `PUT /api/admin/shop/items/:id` - Modifier un item
- `DELETE /api/admin/shop/items/:id` - Supprimer un item

### Admin - Sessions
- `GET /api/admin/sessions` - Liste des sessions
- `POST /api/admin/sessions` - Créer une session
- `POST /api/admin/sessions/:id/start` - Lancer le quiz
- `POST /api/admin/sessions/:id/stop` - Arrêter la session
- `GET /api/admin/sessions/:id/attendances` - Présences

### Student - Sessions
- `POST /api/student/sessions/checkin` - Check-in avec code
- `GET /api/student/sessions/code/:code` - Infos session
- `GET /api/student/sessions/:id/status` - Statut session
- `POST /api/student/sessions/answer` - Répondre à une question
- `GET /api/student/sessions/:id/ranking` - Classement session

### Student - Shop
- `GET /api/student/shop/items` - Items disponibles
- `POST /api/student/shop/purchase` - Acheter un item
- `POST /api/student/shop/activate-skin` - Activer un skin

### Student - Duels
- `GET /api/student/duels/stats` - Statistiques de duels
- `POST /api/student/duels` - Créer un duel
- `POST /api/student/duels/:id/join` - Rejoindre un duel
- `POST /api/student/duels/:id/answer` - Répondre en duel
- `DELETE /api/student/duels/:id` - Supprimer un duel

### Student - Clans
- `GET /api/student/clans` - Liste des clans
- `GET /api/student/clans/my` - Mes clans
- `POST /api/student/clans/create` - Créer un clan
- `POST /api/student/clans/:id/join` - Rejoindre un clan
- `POST /api/student/clans/:id/leave` - Quitter un clan

### Student - Friends
- `GET /api/student/friends` - Liste des amis
- `GET /api/student/friends/requests` - Demandes d'amis
- `POST /api/student/friends/request` - Envoyer une demande
- `POST /api/student/friends/accept/:id` - Accepter
- `POST /api/student/friends/reject/:id` - Rejeter
- `DELETE /api/student/friends/:id` - Supprimer un ami

### Ranking & Badges
- `GET /api/student/ranking` - Classement (Top 10 + position)
- `GET /api/student/badges` - Badges avec statut

### KPI Admin
- `GET /api/admin/kpi` - Statistiques globales

---

## 🧩 Composants Clés

### `QuestionEditor` (`components/QuestionEditor.tsx`)
- Éditeur de questions pour admin
- Support des 3 types (QCM, Memory, Match)
- Validation selon le type
- Interface adaptative

### `RichTextEditor` (`components/RichTextEditor.tsx`)
- Éditeur WYSIWYG (React Quill)
- Pour le contenu théorique des cours
- Formatage (gras, italique, listes, couleurs, images)

### `MonkeyProfessor` (`components/MonkeyProfessor.tsx`)
- Mascotte de l'application
- Affichage conditionnel selon le contexte

### `StressSlider` (`components/StressSlider.tsx`)
- Slider 1-10 pour mesurer le stress
- Avant/après cours

### `Popup` (`components/Popup.tsx`) + `usePopup` (`hooks/usePopup.tsx`)
- Système de popups (erreur, succès, confirmation)
- Hook personnalisé pour faciliter l'usage

### `Toast` (`components/Toast.tsx`) + `useToast` (`hooks/useToast.tsx`)
- Notifications toast
- Auto-dismiss

---

## 🔄 Workflow Utilisateur Typique

### Étudiant
1. **Inscription** : Landing page → Prénom → Redirection `/student/courses`
2. **Parcours de cours** :
   - Sélection matière → Choix cours → Jeu (Quiz/Memory/Match)
   - Stress avant → Réponses → Stress après → Validation
   - Gain de bananes + vérification badges
3. **Social** :
   - Rejoindre un clan → Contribuer aux guerres
   - Créer/rejoindre des duels → Gagner/perdre des bananes
   - Ajouter des amis → Voir leur activité
4. **Progression** :
   - Consulter classement
   - Voir badges débloqués
   - Acheter des skins avec bananes

### Admin
1. **Création de contenu** :
   - Créer un cours → Ajouter questions (QCM/Memory/Match)
   - Définir contenu théorique (WYSIWYG)
   - Configurer récompense en bananes
2. **Gestion** :
   - Créer des badges avec conditions
   - Ajouter des items à la boutique (skins)
   - Créer des sessions avec QR code
3. **Monitoring** :
   - Dashboard KPI
   - Analytics
   - Gestion des clans/guerres

---

## 🎨 Design & UX

- **Thème** : Design moderne et ludique
- **Couleurs** : Palette chaude (orange, beige, marron) avec accents colorés
- **Mascotte** : Singe professeur récurrent
- **Responsive** : Mobile-first avec breakpoints Tailwind
- **Animations** : Transitions douces, hover effects, boutons "physiques" avec ombres
- **Accessibilité** : Labels, ARIA, navigation clavier

---

## 🚀 Déploiement

### Développement Local
```bash
npm run dev  # Lance worker (8787) + Next.js (3000)
```

### Production
```bash
npm run deploy:all  # Déploie worker + pages
```

### Configuration Requise
- Cloudflare D1 database
- Cloudflare KV namespace (sessions)
- Variables d'environnement (`NEXT_PUBLIC_API_URL`)

---

## 📊 Statistiques & Métriques

L'application suit :
- XP total distribué
- Nombre d'étudiants actifs
- Cours complétés
- Badges débloqués
- Sessions créées
- Duels joués
- Guerres de clans
- Achats en boutique

---

## 🔐 Sécurité

- **Authentification** : Sessions via Cloudflare KV
- **Autorisation** : Rôles (student/admin) vérifiés côté API
- **Validation** : Zod schemas pour toutes les entrées
- **CORS** : Configuré pour production
- **Sanitization** : Contenu HTML sécurisé

---

## 🎯 Points Forts de l'Application

1. **Gamification complète** : Badges, XP, classements, duels, clans
2. **3 types de tests interactifs** : Quiz, Memory, Match avec interfaces dédiées
3. **Sessions en direct** : QR codes, quiz temps réel
4. **Social** : Amis, clans, guerres, duels
5. **Boutique** : Système d'achat avec skins personnalisables
6. **Admin complet** : CRUD pour tous les éléments
7. **Architecture moderne** : Cloudflare edge, scalable
8. **UX soignée** : Design cohérent, animations, responsive

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2024  
**Stack** : Next.js 14 + Cloudflare Workers + D1 + Hono

