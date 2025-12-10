# Debug Routes Not Found

Si vous avez une erreur "route not found" sur les pages Utilisateurs et Codes Profs, voici les étapes de débogage :

## 1. Vérifier que le Worker est démarré

Le Worker doit être en cours d'exécution pour que les routes API fonctionnent.

```bash
# Dans un terminal séparé, démarrez le worker :
npm run worker:dev
```

Le worker doit être accessible sur `http://localhost:8787`

## 2. Vérifier l'URL de l'API

Assurez-vous que `.env.local` contient :

```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## 3. Vérifier les routes dans le Worker

Les routes suivantes doivent exister dans `workers/src/index.ts` :

- `GET /api/admin/users`
- `POST /api/admin/teacher-codes`
- `GET /api/admin/teacher-codes`
- `DELETE /api/admin/teacher-codes/:id`

## 4. Vérifier la console du navigateur

Ouvrez la console du navigateur (F12) et regardez les erreurs réseau. Vous devriez voir :
- L'URL complète de la requête
- Le code de statut HTTP
- Le message d'erreur

## 5. Tester directement l'API

Testez directement l'API avec curl ou Postman :

```bash
# Test de la route users (nécessite un token d'authentification)
curl -H "Authorization: Bearer YOUR_SESSION_ID" http://localhost:8787/api/admin/users

# Test de la route teacher-codes
curl -H "Authorization: Bearer YOUR_SESSION_ID" http://localhost:8787/api/admin/teacher-codes
```

## 6. Vérifier l'authentification

Les routes admin nécessitent une authentification. Assurez-vous que :
- Vous êtes connecté en tant qu'admin
- Le token de session est présent dans localStorage
- Le header `Authorization: Bearer <sessionId>` est envoyé avec chaque requête

## Solutions courantes

1. **Worker non démarré** : Démarrez `npm run worker:dev`
2. **Mauvaise URL** : Vérifiez `.env.local` et `next.config.js`
3. **Problème d'authentification** : Reconnectez-vous en tant qu'admin
4. **Cache du navigateur** : Faites un hard refresh (Ctrl+Shift+R)

