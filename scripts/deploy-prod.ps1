# Script de deploiement en production
# Applique les migrations et deploy le site

Write-Host "Deploiement en production..." -ForegroundColor Cyan
Write-Host ""

# Migrations a appliquer (en ignorant les erreurs si deja appliquees)
$migrations = @(
    "add-last-activity-date.sql",
    "add-course-hidden.sql", 
    "add-theoretical-content.sql",
    "add-session-quiz.sql",
    "add-teacher-codes.sql"
)

Write-Host "Application des migrations..." -ForegroundColor Yellow
foreach ($migration in $migrations) {
    $filePath = "./prisma/migrations/$migration"
    if (Test-Path $filePath) {
        Write-Host "  -> $migration" -ForegroundColor Gray
        wrangler d1 execute gamification-db --remote --file=$filePath 2>&1 | Out-Null
        # On ignore les erreurs car les migrations peuvent deja etre appliquees
    }
}

Write-Host ""
Write-Host "Deploiement du Worker..." -ForegroundColor Yellow
npm run deploy:worker

Write-Host ""
Write-Host "Build et deploiement des Pages..." -ForegroundColor Yellow
npm run build
wrangler pages deploy out --project-name=gamification-app

Write-Host ""
Write-Host "Deploiement termine!" -ForegroundColor Green

