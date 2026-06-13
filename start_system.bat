@echo off
title Tailor Shop Management System Launcher
cd /d "%~dp0"

echo ====================================================
echo   TAILOR SHOP MANAGEMENT SYSTEM (MVP) - LAUNCHER
echo ====================================================
echo.

echo [1/4] Terminating any existing servers on ports 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5000 " /c:":5173 "') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [2/4] Ensuring required directories exist...
if not exist "backend\data" (
    mkdir "backend\data"
    echo   Created backend\data directory
)
if not exist "backend\uploads" (
    mkdir "backend\uploads"
    echo   Created backend\uploads directory
)

echo [3/4] Starting MongoDB database in the background...
start "Tailor Shop - MongoDB Database" /min "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "%~dp0backend\data"

echo [4/4] Launching Backend Express API and Frontend React...
start "Tailor Shop - Express API (Port 5000)" cmd /k "cd backend && node server.js"
rem Added '-- --host' so the frontend dev server is exposed on your local Wi-Fi network
start "Tailor Shop - Vite React Server (Port 5173)" cmd /k "cd frontend && npm run dev -- --host"

echo.
echo Services are initializing...
echo Waiting 4 seconds for servers to start, then opening web app...
ping 127.0.0.1 -n 5 > nul

echo.
echo Opening Tailor Shop Management System in browser...
start http://localhost:5173

echo.
echo All services launched! Feel free to close this window.
ping 127.0.0.1 -n 4 > nul
