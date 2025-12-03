# Script de déploiement complet pour GoFusion
# Ce script déploie la base de données, le worker et les pages

Write-Host "🚀 Déploiement de GoFusion" -ForegroundColor Cyan
Write-Host ""

# Vérifier que wrangler est installé
Write-Host "📦 Vérification de Wrangler..." -ForegroundColor Yellow
try {
    wrangler --version | Out-Null
    Write-Host "✅ Wrangler est installé" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler n'est pas installé. Installez-le avec: npm install -g wrangler" -ForegroundColor Red
    exit 1
}

# Vérifier la connexion
Write-Host ""
Write-Host "🔐 Vérification de la connexion Cloudflare..." -ForegroundColor Yellow
try {
    wrangler whoami | Out-Null
    Write-Host "✅ Connecté à Cloudflare" -ForegroundColor Green
} catch {
    Write-Host "❌ Non connecté. Exécutez: wrangler login" -ForegroundColor Red
    exit 1
}

# Étape 1: Migrations de base de données
Write-Host ""
Write-Host "📊 Étape 1: Application des migrations de base de données..." -ForegroundColor Yellow

# Appliquer le schéma principal
Write-Host "  → Application du schéma principal..." -ForegroundColor Gray
wrangler d1 execute gamification-db --file=./prisma/migrations/schema.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Le schéma principal existe peut-être déjà (c'est normal)" -ForegroundColor Yellow
}

# Appliquer les migrations supplémentaires dans l'ordre
$migrations = @(
    "add-matieres-questions.sql",
    "add-clans-system.sql",
    "add-clan-wars-system.sql",
    "add-clan-wars-config.sql",
    "add-duel-system.sql",
    "add-duel-bet.sql",
    "add-friends-system.sql",
    "add-shop-system.sql",
    "add-session-quiz.sql",
    "add-fixed-sessions.sql",
    "add-stress-system.sql",
    "add-theoretical-content.sql",
    "add-analytics-time.sql",
    "fix-missing-columns.sql"
)

foreach ($migration in $migrations) {
    $migrationPath = "./prisma/migrations/$migration"
    if (Test-Path $migrationPath) {
        Write-Host "  → Application de $migration..." -ForegroundColor Gray
        wrangler d1 execute gamification-db --file=$migrationPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠️  $migration a peut-être déjà été appliquée (c'est normal)" -ForegroundColor Yellow
        }
    }
}

Write-Host "✅ Migrations appliquées" -ForegroundColor Green

# Étape 2: Déploiement du Worker
Write-Host ""
Write-Host "⚙️  Étape 2: Déploiement du Worker (API)..." -ForegroundColor Yellow
npm run deploy:worker
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du déploiement du Worker" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Worker déployé" -ForegroundColor Green

# Étape 3: Build et déploiement de Pages
Write-Host ""
Write-Host "🌐 Étape 3: Build et déploiement de Pages..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}

wrangler pages deploy out --project-name=gamification-app
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du déploiement de Pages" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Pages déployées" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Déploiement terminé avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Vérifiez votre Worker: https://gamification-app-prod.workers.dev/" -ForegroundColor White
Write-Host "  2. Vérifiez votre site Pages dans le dashboard Cloudflare" -ForegroundColor White
Write-Host "  3. Configurez les variables d'environnement si nécessaire" -ForegroundColor White
Write-Host "  4. Testez l'application complète" -ForegroundColor White

