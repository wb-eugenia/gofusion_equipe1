# Configuration Replicate pour l'analyse de slides

## 🎯 Modèles utilisés

### Pour les images (PNG, JPEG)
- **Modèle** : `llava-1.5-13b`
- **Version ID** : `2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd3739592`
- **Description** : Modèle de vision qui peut analyser des images et générer du texte structuré
- **Coût** : ~$0.01-0.05 par image

### Pour les PDFs/PPT (texte)
- **Modèle** : `meta/llama-2-70b-chat`
- **Version ID** : `02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3`
- **Description** : Modèle de langage puissant pour l'analyse de texte et la génération
- **Coût** : ~$0.001-0.01 par requête

## 🔧 Configuration

### 1. Créer un compte Replicate

1. Allez sur : https://replicate.com
2. Créez un compte (gratuit)
3. Ajoutez un mode de paiement dans les paramètres (pay-as-you-go)

### 2. Obtenir votre token API

1. Allez dans **Settings** > **API tokens**
2. Cliquez sur **Create token**
3. Copiez le token (commence par `r8_...`)

### 3. Configurer dans `.dev.vars`

Ajoutez dans votre fichier `.dev.vars` :

```env
REPLICATE_API_TOKEN=r8_votre_token_ici
```

### 4. Redémarrer le worker

```bash
# Arrêtez le worker (Ctrl+C)
npm run worker:dev
```

## 💰 Coûts

Replicate fonctionne en **pay-as-you-go** :
- **LLaVA (images)** : ~$0.01-0.05 par image analysée
- **Llama-2 (texte)** : ~$0.001-0.01 par requête
- Pas de frais mensuels
- Payez seulement ce que vous utilisez

## 🚀 Ordre de priorité

Le système utilise les services dans cet ordre :

1. **Google Gemini** (si `GEMINI_API_KEY` configuré) - GRATUIT
2. **OpenAI** (si `OPENAI_API_KEY` configuré) - Payant
3. **Replicate** (si `REPLICATE_API_TOKEN` configuré) - Pay-as-you-go

## 📝 Exemple de `.dev.vars`

```env
# Utilisez UNE ou PLUSIEURS de ces options :

# Option 1 : Gemini (gratuit - recommandé)
GEMINI_API_KEY=...

# Option 2 : OpenAI (payant)
OPENAI_API_KEY=sk-...

# Option 3 : Replicate (pay-as-you-go)
REPLICATE_API_TOKEN=r8_...
```

## 🔍 Dépannage

### "Failed to upload image to Replicate"
- Vérifiez que votre token API est correct
- Vérifiez que vous avez ajouté un mode de paiement
- Vérifiez que le fichier n'est pas trop volumineux (max 5MB)

### "Replicate prediction failed"
- Vérifiez votre solde Replicate
- Vérifiez que le modèle est disponible
- Consultez les logs pour plus de détails

### Le traitement est lent
- Replicate utilise des GPU à la demande, donc il peut y avoir un délai de démarrage
- Les images peuvent prendre 10-30 secondes
- C'est normal pour Replicate

## 🌐 Pour la production

Configurez `REPLICATE_API_TOKEN` dans Cloudflare Dashboard :
1. Allez dans votre Worker
2. Settings > Variables and Secrets
3. Ajoutez `REPLICATE_API_TOKEN`
4. Cochez "Encrypt" pour la sécurité

## 📊 Comparaison

| Service | Coût/image | Vitesse | Qualité |
|---------|-----------|---------|---------|
| Gemini | Gratuit | Rapide | Excellente |
| OpenAI | ~$0.01 | Rapide | Excellente |
| Replicate | ~$0.01-0.05 | Plus lent | Très bonne |

**Recommandation** : Utilisez Gemini en premier (gratuit), puis Replicate si besoin.

