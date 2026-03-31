@echo off
setlocal
title Villa Reservation App
color 0A
cd /d "%~dp0"

echo.
echo  =============================================
echo        Villa Reservation App
echo  =============================================
echo.

:: ─── Check for Node.js ───────────────────────────────────────
echo  [1/3] Checking for Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [!] Node.js is NOT installed.
    echo      Download from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found.

:: ─── Check for node_modules ──────────────────────────────────
echo  [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo  [*] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [!] npm install failed.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed.
) else (
    echo  [OK] Dependencies found.
)

:: ─── Ensure data directory exists ────────────────────────────
echo  [3/3] Checking data directory...
if not exist "data\" mkdir data
echo  [OK] Data directory ready.

:: ─── Start development server ────────────────────────────────
echo.
echo  =============================================
echo    Backend API: http://localhost:3001
echo    Frontend:    http://localhost:5173
echo    Database:    data\villa.db
echo.
echo    Press Ctrl+C to stop the servers.
echo  =============================================
echo.

:: Open browser after a short delay (gives servers time to start)
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

:: Start both servers via concurrently (blocks until Ctrl+C)
call npx concurrently --names "API,WEB" --prefix-colors "cyan,green" "node server/index.js" "npx vite --host"

echo.
echo  Server stopped. Goodbye!
pause
