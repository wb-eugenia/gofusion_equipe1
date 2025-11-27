# Script pour vérifier les données dans D1
param(
    [switch]$Local = $true
)

$flag = if ($Local) { "--local" } else { "--remote" }
$location = if ($Local) { "locale" } else { "distante" }

Write-Host "🔍 Vérification des données dans la base D1 $location..." -ForegroundColor Cyan
Write-Host ""

# Compter les utilisateurs
Write-Host "👥 Utilisateurs :" -ForegroundColor Yellow
npx wrangler d1 execute gamification-db $flag --command "SELECT COUNT(*) as count FROM users;"
npx wrangler d1 execute gamification-db $flag --command "SELECT id, prenom, role, xp FROM users LIMIT 10;"

Write-Host ""
Write-Host "📚 Cours :" -ForegroundColor Yellow
npx wrangler d1 execute gamification-db $flag --command "SELECT COUNT(*) as count FROM courses;"
npx wrangler d1 execute gamification-db $flag --command "SELECT id, titre, xp_reward FROM courses LIMIT 10;"

Write-Host ""
Write-Host "🎖️ Badges :" -ForegroundColor Yellow
npx wrangler d1 execute gamification-db $flag --command "SELECT COUNT(*) as count FROM badges;"
npx wrangler d1 execute gamification-db $flag --command "SELECT id, name, condition_type FROM badges LIMIT 10;"

Write-Host ""
Write-Host "📊 Progression :" -ForegroundColor Yellow
npx wrangler d1 execute gamification-db $flag --command "SELECT COUNT(*) as count FROM user_progress;"

Write-Host ""
Write-Host "🏆 Badges débloqués :" -ForegroundColor Yellow
npx wrangler d1 execute gamification-db $flag --command "SELECT COUNT(*) as count FROM user_badges;"

Write-Host ""
Write-Host "✅ Vérification terminée !" -ForegroundColor Green

