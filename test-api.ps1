# Script de test de l'API
Write-Host "🧪 Test de l'API Worker..." -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:8787"

# Test 1: Vérifier si le Worker répond
Write-Host "1. Test de connexion au Worker..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/api/auth/register" -Method POST -ContentType "application/json" -Body '{"prenom":"Test"}' -ErrorAction Stop
    Write-Host "✅ Worker accessible !" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Worker non accessible : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Vérifiez que le Worker tourne :" -ForegroundColor Yellow
    Write-Host "   npm run worker:dev" -ForegroundColor White
}

Write-Host ""

# Test 2: Vérifier les routes
Write-Host "2. Test des routes..." -ForegroundColor Yellow
$routes = @(
    "/api/auth/register",
    "/api/user",
    "/api/courses"
)

foreach ($route in $routes) {
    try {
        $response = Invoke-WebRequest -Uri "$apiUrl$route" -Method GET -ErrorAction SilentlyContinue
        Write-Host "   ✅ $route" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  $route (peut nécessiter auth)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Tests terminés !" -ForegroundColor Green

