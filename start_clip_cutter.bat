@echo off
title Clip Cutter - Starter
echo ====================================================
echo           STARTING CLIP CUTTER LOCAL SAAS
echo ====================================================
echo.

echo Checking Python backend dependencies...
cd /d "%~dp0backend"
python -c "import uvicorn, fastapi" >nul 2>&1
if errorlevel 1 (
    echo Installing required backend packages (FastAPI, uvicorn, etc.)...
    pip install -r requirements.txt
) else (
    echo Backend dependencies verified.
)

echo.
echo [1/2] Starting Backend Server (FastAPI on Port 8000)...
start "Clip Cutter - Backend" cmd /k "cd /d %~dp0backend && python run.py"

timeout /t 4 /nobreak >nul

echo [2/2] Starting Frontend App (React on Port 5173)...
start "Clip Cutter - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ====================================================
echo Clip Cutter is now RUNNING!
echo Admin Login: test@test.com / test@123
echo ====================================================
pause
