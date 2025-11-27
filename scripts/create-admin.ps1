# Script pour créer un utilisateur admin
param(
    [Parameter(Mandatory=$false)]
    [string]$Prenom = "Admin"
)

Write-Host "🔧 Création d'un utilisateur admin..." -ForegroundColor Cyan
Write-Host ""

# Générer un ID unique
$userId = [guid]::NewGuid().ToString()
$timestamp = [Math]::Floor([decimal](Get-Date -UFormat %s))

# Créer l'utilisateur directement dans la DB locale
$sql = "INSERT INTO users (id, prenom, xp, role, streak_days, created_at) VALUES ('$userId', '$Prenom', 0, 'admin', 0, $timestamp);"

Write-Host "📝 Exécution de la requête SQL..." -ForegroundColor Yellow
Write-Host ""

# Exécuter sur la DB locale
npx wrangler d1 execute gamification-db --local --command $sql

Write-Host ""
Write-Host "✅ Utilisateur admin créé !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Informations :" -ForegroundColor Cyan
Write-Host "   ID: $userId" -ForegroundColor Gray
Write-Host "   Prénom: $Prenom" -ForegroundColor Gray
Write-Host "   Rôle: admin" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT :" -ForegroundColor Yellow
Write-Host "   Vous devez maintenant vous inscrire via l'interface web" -ForegroundColor White
Write-Host "   avec le même prénom '$Prenom' pour obtenir une session." -ForegroundColor White
Write-Host ""
Write-Host "   OU utilisez l'API pour créer une session :" -ForegroundColor White
Write-Host "   POST http://localhost:8787/api/auth/register" -ForegroundColor Gray
Write-Host "   Body: {`"prenom`": `"$Prenom`"}" -ForegroundColor Gray
Write-Host ""

