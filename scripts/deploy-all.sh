#!/bin/bash

# Script de déploiement complet pour GoFusion
# Ce script déploie la base de données, le worker et les pages

echo "🚀 Déploiement de GoFusion"
echo ""

# Vérifier que wrangler est installé
echo "📦 Vérification de Wrangler..."
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler n'est pas installé. Installez-le avec: npm install -g wrangler"
    exit 1
fi
echo "✅ Wrangler est installé"

# Vérifier la connexion
echo ""
echo "🔐 Vérification de la connexion Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    echo "❌ Non connecté. Exécutez: wrangler login"
    exit 1
fi
echo "✅ Connecté à Cloudflare"

# Étape 1: Migrations de base de données
echo ""
echo "📊 Étape 1: Application des migrations de base de données..."

# Appliquer le schéma principal
echo "  → Application du schéma principal..."
wrangler d1 execute gamification-db --file=./prisma/migrations/schema.sql || echo "  ⚠️  Le schéma principal existe peut-être déjà (c'est normal)"

# Appliquer les migrations supplémentaires dans l'ordre
migrations=(
    "add-matieres-questions.sql"
    "add-clans-system.sql"
    "add-clan-wars-system.sql"
    "add-clan-wars-config.sql"
    "add-duel-system.sql"
    "add-duel-bet.sql"
    "add-friends-system.sql"
    "add-shop-system.sql"
    "add-session-quiz.sql"
    "add-fixed-sessions.sql"
    "add-stress-system.sql"
    "add-theoretical-content.sql"
    "add-analytics-time.sql"
    "fix-missing-columns.sql"
)

for migration in "${migrations[@]}"; do
    migration_path="./prisma/migrations/$migration"
    if [ -f "$migration_path" ]; then
        echo "  → Application de $migration..."
        wrangler d1 execute gamification-db --file="$migration_path" || echo "  ⚠️  $migration a peut-être déjà été appliquée (c'est normal)"
    fi
done

echo "✅ Migrations appliquées"

# Étape 2: Déploiement du Worker
echo ""
echo "⚙️  Étape 2: Déploiement du Worker (API)..."
npm run deploy:worker
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du déploiement du Worker"
    exit 1
fi
echo "✅ Worker déployé"

# Étape 3: Build et déploiement de Pages
echo ""
echo "🌐 Étape 3: Build et déploiement de Pages..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

wrangler pages deploy out --project-name=gamification-app
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du déploiement de Pages"
    exit 1
fi
echo "✅ Pages déployées"

echo ""
echo "🎉 Déploiement terminé avec succès!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Vérifiez votre Worker: https://gamification-app-prod.workers.dev/"
echo "  2. Vérifiez votre site Pages dans le dashboard Cloudflare"
echo "  3. Configurez les variables d'environnement si nécessaire"
echo "  4. Testez l'application complète"

