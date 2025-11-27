# Script PowerShell pour Windows

Write-Host "🚀 Configuration de l'application de gamification" -ForegroundColor Cyan
Write-Host ""

# Vérifier que wrangler est installé
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Wrangler n'est pas installé. Installation..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Créer la base de données D1
Write-Host "📦 Création de la base de données D1..." -ForegroundColor Cyan
$dbOutput = npx wrangler d1 create gamification-db
Write-Host $dbOutput

Write-Host ""
Write-Host "⚠️  IMPORTANT: Copiez le 'database_id' ci-dessus et mettez-le dans wrangler.toml" -ForegroundColor Yellow

# Créer le namespace KV
Write-Host ""
Write-Host "🔑 Création du namespace KV pour les sessions..." -ForegroundColor Cyan
$kvOutput = npx wrangler kv namespace create sessions
Write-Host $kvOutput

$kvPreviewOutput = npx wrangler kv namespace create sessions --preview
Write-Host $kvPreviewOutput

Write-Host ""
Write-Host "⚠️  IMPORTANT: Copiez les IDs ci-dessus et mettez-les dans wrangler.toml" -ForegroundColor Yellow

# Installer les dépendances
Write-Host ""
Write-Host "📥 Installation des dépendances..." -ForegroundColor Cyan
npm install

# Exécuter les migrations
Write-Host ""
Write-Host "🗄️  Exécution des migrations..." -ForegroundColor Cyan
npm run prisma:migrate

Write-Host ""
Write-Host "✅ Configuration terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Mettez à jour wrangler.toml avec les IDs copiés"
Write-Host "2. Déployez le worker: npm run worker:deploy"
Write-Host "3. Déployez Pages: npm run deploy:pages"

