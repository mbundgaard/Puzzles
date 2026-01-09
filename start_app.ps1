Write-Host "Starting web server at http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
Set-Location app_classic
python -m http.server 8000