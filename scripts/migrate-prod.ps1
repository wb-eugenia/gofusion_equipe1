# Script to apply all necessary migrations to production database
# Usage: .\scripts\migrate-prod.ps1

Write-Host "Applying migrations to production database..." -ForegroundColor Cyan

$migrations = @(
    "add-last-activity-date.sql",
    "add-course-hidden.sql",
    "add-theoretical-content.sql",
    "add-session-quiz.sql",
    "add-teacher-codes.sql"
)

$migrationsPath = "prisma/migrations"

foreach ($migration in $migrations) {
    $filePath = Join-Path $migrationsPath $migration
    if (Test-Path $filePath) {
        Write-Host "Applying migration: $migration" -ForegroundColor Yellow
        wrangler d1 execute gamification-db --remote --file=$filePath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migration $migration applied successfully" -ForegroundColor Green
        } else {
            Write-Host "Migration $migration may have already been applied or failed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Migration file not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "All migrations completed!" -ForegroundColor Cyan

