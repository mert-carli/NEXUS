@echo off
echo ===================================================
echo               Starting NEXUS Platform
echo ===================================================

echo [1/2] Starting FastAPI Backend (Port 8000)...
start "NEXUS Backend" cmd /k "cd backend && venv\Scripts\python -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1"

echo [2/2] Starting Vite React Frontend (Port 5173)...
start "NEXUS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo NEXUS is booting up!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000/api/v1/health
echo API Docs: http://localhost:8000/docs
echo.
timeout /t 3 >nul
start http://localhost:5173
