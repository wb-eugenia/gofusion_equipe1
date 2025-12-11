# Configuration de la clé API OpenAI

## ⚠️ Important

Le Worker Cloudflare ne peut **PAS** lire `.env.local` (c'est uniquement pour Next.js).

Pour le développement local, vous devez utiliser un fichier `.dev.vars` à la racine du projet.

## 🔧 Configuration pour le développement local

### 1. Créer le fichier `.dev.vars`

À la racine du projet, créez un fichier `.dev.vars` :

```bash
# Windows PowerShell
New-Item -Path .dev.vars -ItemType File

# Linux/Mac
touch .dev.vars
```

### 2. Ajouter votre clé API

Ouvrez `.dev.vars` et ajoutez :

```env
OPENAI_API_KEY=sk-votre_cle_api_openai_ici
```

**Important** : Remplacez `sk-votre_cle_api_openai_ici` par votre vraie clé API OpenAI.

### 3. Redémarrer le worker

Après avoir créé/modifié `.dev.vars`, **redémarrez le worker** :

```bash
# Arrêtez le worker (Ctrl+C)
# Puis relancez-le
npm run worker:dev
```

Ou si vous utilisez `npm run dev`, redémarrez tout.

## 📝 Vérification

Le fichier `.dev.vars` est déjà dans `.gitignore`, donc il ne sera pas commité (c'est sécurisé).

## 🚀 Configuration pour la production

Pour la production sur Cloudflare :

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sélectionnez votre Worker (`gamification-app`)
3. Allez dans **Settings** > **Variables and Secrets**
4. Cliquez sur **Add variable**
5. Entrez :
   - **Variable name** : `OPENAI_API_KEY`
   - **Value** : Votre clé API OpenAI
   - **Type** : Secret (cochez "Encrypt")
6. Cliquez sur **Save**

## 🔍 Dépannage

### "OpenAI API key not configured"

- ✅ Vérifiez que `.dev.vars` existe à la racine du projet
- ✅ Vérifiez que la clé est bien écrite (sans espaces, sans guillemets)
- ✅ Redémarrez le worker après avoir créé/modifié `.dev.vars`
- ✅ Vérifiez que vous n'avez pas mis la clé dans `.env.local` (ça ne fonctionne pas pour le worker)

### Le worker ne charge pas la variable

1. Arrêtez complètement le worker (Ctrl+C)
2. Vérifiez que `.dev.vars` est bien à la racine (même niveau que `wrangler.toml`)
3. Relancez le worker : `npm run worker:dev`

## 📂 Structure des fichiers

```
GoFusion/
├── .dev.vars          ← ICI (pour le Worker)
├── .env.local         ← ICI (pour Next.js uniquement)
├── wrangler.toml
├── workers/
│   └── src/
│       └── index.ts
└── ...
```

## 💡 Note

- `.dev.vars` = Variables pour le Worker Cloudflare (développement local)
- `.env.local` = Variables pour Next.js (frontend)

Les deux fichiers sont nécessaires si vous avez des variables pour les deux parties de l'application.

