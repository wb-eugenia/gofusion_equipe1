#!/bin/bash

echo "🚀 Configuration de l'application de gamification"
echo ""

# Vérifier que wrangler est installé
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler n'est pas installé. Installation..."
    npm install -g wrangler
fi

# Créer la base de données D1
echo "📦 Création de la base de données D1..."
DB_OUTPUT=$(npx wrangler d1 create gamification-db)
echo "$DB_OUTPUT"

# Extraire le database_id (nécessite une manipulation manuelle)
echo ""
echo "⚠️  IMPORTANT: Copiez le 'database_id' ci-dessus et mettez-le dans wrangler.toml"

# Créer le namespace KV
echo ""
echo "🔑 Création du namespace KV pour les sessions..."
KV_OUTPUT=$(npx wrangler kv namespace create sessions)
echo "$KV_OUTPUT"

KV_PREVIEW_OUTPUT=$(npx wrangler kv namespace create sessions --preview)
echo "$KV_PREVIEW_OUTPUT"

echo ""
echo "⚠️  IMPORTANT: Copiez les IDs ci-dessus et mettez-les dans wrangler.toml"

# Installer les dépendances
echo ""
echo "📥 Installation des dépendances..."
npm install

# Exécuter les migrations
echo ""
echo "🗄️  Exécution des migrations..."
npm run prisma:migrate

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "Prochaines étapes:"
echo "1. Mettez à jour wrangler.toml avec les IDs copiés"
echo "2. Déployez le worker: npm run worker:deploy"
echo "3. Déployez Pages: npm run deploy:pages"

