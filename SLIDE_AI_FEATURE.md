# Fonctionnalité d'Upload de Slides avec Génération IA de Questions

## 📋 Description

Cette fonctionnalité permet aux professeurs d'uploader leurs slides (PDF, PPT, PPTX, images) et de générer automatiquement des questions QCM basées sur le contenu grâce à l'IA (OpenAI).

## 🚀 Installation

### 1. Installer la dépendance OpenAI

```bash
npm install
```

La dépendance `openai` a été ajoutée au `package.json`.

### 2. Configurer la clé API OpenAI

#### Pour le développement local :

Ajoutez dans votre fichier `.env.local` (ou créez-le) :

```env
OPENAI_API_KEY=votre_cle_api_openai
```

#### Pour la production (Cloudflare Workers) :

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sélectionnez votre Worker (`gamification-app`)
3. Allez dans **Settings** > **Variables and Secrets**
4. Ajoutez une variable secrète :
   - **Variable name** : `OPENAI_API_KEY`
   - **Value** : Votre clé API OpenAI
   - Cochez **Encrypt** pour la sécurité

### 3. Exécuter la migration de base de données

La migration ajoute le champ `slide_file` à la table `courses`.

#### En local :

```bash
npm run prisma:migrate:local
```

#### En production :

```bash
npm run prisma:migrate
```

## 📝 Utilisation

### Pour les professeurs :

1. **Créer un nouveau cours** :
   - Allez sur la page "Mes Cours"
   - Cliquez sur "+ Nouveau Cours"
   - Remplissez le titre et la description

2. **Uploader un slide** :
   - Dans le formulaire de création, utilisez le champ "Slide du cours"
   - Sélectionnez un fichier (PDF, PPT, PPTX, PNG, JPEG)
   - Taille maximum : 10MB

3. **Générer les questions avec l'IA** :
   - Après l'upload, cliquez sur "🤖 Analyser avec IA et générer les questions"
   - L'IA analyse le contenu et génère automatiquement 5 questions QCM
   - Les questions sont ajoutées à votre cours

4. **Réviser et modifier** :
   - Vous pouvez modifier, supprimer ou ajouter des questions manuellement
   - Les questions générées peuvent être éditées comme les questions normales

5. **Sauvegarder le cours** :
   - Cliquez sur "Créer" pour sauvegarder le cours avec les questions

## 🔧 Formats supportés

- **PDF** : `.pdf`
- **PowerPoint** : `.ppt`, `.pptx`
- **Images** : `.png`, `.jpg`, `.jpeg`

## ⚙️ Configuration de l'IA

L'endpoint d'analyse utilise :
- **Modèle** : `gpt-4o` (pour les images avec vision)
- **Nombre de questions par défaut** : 5
- **Type de questions** : QCM (multiple choice) uniquement

Vous pouvez modifier ces paramètres dans `workers/src/index.ts` dans la fonction `/api/teacher/analyze-slide`.

## 📊 Architecture

### Endpoints créés :

1. **POST `/api/teacher/upload-slide`**
   - Upload un fichier slide
   - Retourne les données du fichier (base64)

2. **POST `/api/teacher/analyze-slide`**
   - Analyse le slide avec OpenAI
   - Génère des questions basées sur le contenu
   - Retourne un tableau de questions formatées

### Modifications de la base de données :

- Ajout du champ `slide_file` (TEXT) dans la table `courses`
- Migration : `prisma/migrations/add-slide-file.sql`

### Modifications de l'UI :

- Ajout d'un champ d'upload de fichier dans le formulaire de cours
- Bouton pour déclencher l'analyse IA
- Affichage des questions générées automatiquement

## 🔒 Sécurité

- Seuls les professeurs (et admins) peuvent uploader des slides
- Validation du type de fichier côté serveur
- Limite de taille : 10MB
- La clé API OpenAI est stockée comme variable secrète dans Cloudflare

## 🐛 Dépannage

### L'analyse IA ne fonctionne pas :

1. Vérifiez que `OPENAI_API_KEY` est bien configurée
2. Vérifiez que vous avez des crédits OpenAI
3. Consultez les logs du worker pour voir les erreurs

### Les questions ne sont pas générées :

- L'IA peut avoir des difficultés avec certains formats (PPT complexe)
- Essayez avec un PDF ou une image
- Vérifiez que le slide contient du texte lisible

### Erreur d'upload :

- Vérifiez la taille du fichier (max 10MB)
- Vérifiez le format du fichier
- Vérifiez les permissions du dossier public (si applicable)

## 📝 Notes

- Les fichiers sont actuellement stockés en base64 dans la réponse. Pour la production, considérez utiliser Cloudflare R2 pour un stockage plus efficace.
- Pour les PDF/PPT complexes, l'extraction de texte peut nécessiter des bibliothèques supplémentaires (comme `pdf-parse` ou des services OCR).
- L'IA génère uniquement des questions QCM pour l'instant. Les types Memory et Match nécessitent une configuration différente.

