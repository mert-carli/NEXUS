Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "             Starting NEXUS Platform              " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "`n[1/2] Starting FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"

Write-Host "[2/2] Starting Vite Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; npm run dev"

Write-Host "`nNEXUS is running!" -ForegroundColor Green
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "API Docs:    http://localhost:8000/docs`n" -ForegroundColor White

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
