# Variables d'Environnement pour Cloudflare Pages

## Variables à configurer dans Cloudflare Pages Dashboard

Allez sur : https://dash.cloudflare.com > Pages > gamification-app > Settings > Environment Variables

### Variable requise :

**Variable :** `NEXT_PUBLIC_API_URL`  
**Valeur :** `https://gamification-app.wbouzidane.workers.dev`  
**Environnement :** Production (et Preview si vous voulez)

### Comment configurer :

1. Connectez-vous à [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Allez dans **Pages** > **gamification-app**
3. Cliquez sur **Settings** (Paramètres)
4. Allez dans **Environment Variables** (Variables d'environnement)
5. Cliquez sur **Add variable** (Ajouter une variable)
6. Entrez :
   - **Variable name** : `NEXT_PUBLIC_API_URL`
   - **Value** : `https://gamification-app.wbouzidane.workers.dev`
   - Cochez **Production** (et **Preview** si vous voulez)
7. Cliquez sur **Save** (Enregistrer)

### Important :

- Les variables qui commencent par `NEXT_PUBLIC_` sont accessibles côté client
- Après avoir ajouté la variable, vous devez **redéployer** le site pour qu'elle soit prise en compte
- Vous pouvez redéployer via le dashboard ou en relançant `npm run deploy:pages`

### Vérification :

Après le redéploiement, vérifiez que l'API fonctionne en ouvrant la console du navigateur sur votre site et en testant une requête API.

