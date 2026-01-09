# Hjernespil - Start Development Server
# Runs SvelteKit dev server with hot reload

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "Hjernespil - Development Server" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting development server with hot reload..." -ForegroundColor Yellow
Write-Host ""
Write-Host "New App: http://localhost:5173/Puzzles/app/" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

Push-Location "$ProjectRoot\app"
try {
    npm run dev
}
finally {
    Pop-Location
}
