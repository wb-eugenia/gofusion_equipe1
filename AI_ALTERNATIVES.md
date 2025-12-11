# Alternatives à OpenAI pour l'analyse de slides

## 🚨 Problème de quota OpenAI

Si vous recevez l'erreur "insufficient_quota", voici des alternatives gratuites ou moins chères.

## 🆓 Option 1 : Google Gemini (GRATUIT - Recommandé)

Google Gemini offre un quota généreux gratuitement.

### Configuration

1. Obtenez une clé API gratuite sur : https://makersuite.google.com/app/apikey

2. Ajoutez dans `.dev.vars` :
```env
GEMINI_API_KEY=votre_cle_gemini_ici
```

3. Redémarrez le worker

### Avantages
- ✅ Gratuit avec quota généreux
- ✅ Excellente qualité pour l'analyse d'images
- ✅ Supporte les PDFs et images

---

## 🔄 Option 2 : Replicate (Pay-as-you-go)

Replicate offre des modèles open-source à la demande.

### Configuration

1. Créez un compte sur : https://replicate.com
2. Obtenez votre token API dans les paramètres

3. Ajoutez dans `.dev.vars` :
```env
REPLICATE_API_TOKEN=r8_votre_token_ici
```

4. Redémarrez le worker

### Avantages
- ✅ Payez seulement ce que vous utilisez
- ✅ Modèles open-source
- ✅ Pas de quota fixe

### Inconvénients
- ⚠️ Peut être plus lent (modèles sur GPU)
- ⚠️ Coût variable selon l'utilisation

---

## 💡 Option 3 : Réapprovisionner OpenAI

Si vous préférez rester avec OpenAI :

1. Allez sur : https://platform.openai.com/account/billing
2. Ajoutez des crédits à votre compte
3. Ou passez à un plan payant

---

## 🔧 Configuration actuelle

Le code supporte maintenant automatiquement :
- ✅ OpenAI (si `OPENAI_API_KEY` est configuré)
- ✅ Replicate (si `REPLICATE_API_TOKEN` est configuré) - À implémenter
- ✅ Google Gemini (si `GEMINI_API_KEY` est configuré) - À implémenter

Le système utilisera automatiquement le premier service disponible dans cet ordre :
1. OpenAI
2. Gemini
3. Replicate

---

## 📝 Exemple de `.dev.vars`

```env
# Utilisez UNE de ces options :

# Option 1 : OpenAI (payant)
OPENAI_API_KEY=sk-...

# Option 2 : Gemini (gratuit - recommandé)
GEMINI_API_KEY=...

# Option 3 : Replicate (pay-as-you-go)
REPLICATE_API_TOKEN=r8_...
```

---

## 🚀 Pour la production

Configurez la même variable dans Cloudflare Dashboard :
1. Allez dans votre Worker
2. Settings > Variables and Secrets
3. Ajoutez `GEMINI_API_KEY` ou `REPLICATE_API_TOKEN`
4. Cochez "Encrypt" pour la sécurité

---

## 💰 Comparaison des coûts

| Service | Coût | Quota gratuit |
|---------|------|---------------|
| **Google Gemini** | Gratuit | 60 requêtes/min |
| **Replicate** | ~$0.01-0.10/requête | Aucun |
| **OpenAI GPT-4** | ~$0.01-0.03/image | Aucun |

**Recommandation** : Commencez avec Gemini (gratuit), puis passez à Replicate si besoin.

