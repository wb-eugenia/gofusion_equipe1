#!/bin/bash

# Script pour créer un utilisateur admin
if [ -z "$1" ]; then
    echo "Usage: ./create-admin.sh <prenom>"
    exit 1
fi

PRENOM=$1
USER_ID=$(uuidgen)
TIMESTAMP=$(date +%s)

echo "🔧 Création d'un utilisateur admin..."
echo ""

SQL="INSERT INTO users (id, prenom, xp, role, streak_days, created_at) VALUES ('$USER_ID', '$PRENOM', 0, 'admin', 0, $TIMESTAMP);"

echo "📝 Exécution de la requête SQL..."
echo ""

npx wrangler d1 execute gamification-db --local --command "$SQL"

echo ""
echo "✅ Utilisateur admin créé !"
echo ""
echo "📋 Informations :"
echo "   ID: $USER_ID"
echo "   Prénom: $PRENOM"
echo "   Rôle: admin"
echo ""
echo "⚠️  IMPORTANT :"
echo "   Vous devez maintenant vous inscrire via l'interface web"
echo "   avec le même prénom '$PRENOM' pour obtenir une session."
echo ""

