@echo off
setlocal
title Villa Reservation App - Setup
color 0A
cd /d "%~dp0"

echo.
echo  =============================================
echo        Villa Reservation App - Setup
echo  =============================================
echo.

:: ─── Step 1: Check for Node.js ────────────────────────────────
echo  [1/3] Checking for Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [!] Node.js is NOT installed on this computer.
    echo.
    echo  ─────────────────────────────────────────────
    echo   Node.js is required to run this application.
    echo   Choose an installation method:
    echo  ─────────────────────────────────────────────
    echo.
    echo   [A] Automatic install via winget
    echo   [M] Manual download from nodejs.org
    echo.
    choice /c AM /n /m "  Press [A] or [M]: "
    if %errorlevel%==2 goto MANUAL_INSTALL
    if %errorlevel%==1 goto AUTO_INSTALL
    goto END_FAIL
)
goto NODE_OK

:AUTO_INSTALL
echo.
echo  [*] Attempting automatic install via winget...
echo.
where winget >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] winget is not available on this system.
    echo      Please install Node.js manually from https://nodejs.org/
    echo.
    start "" "https://nodejs.org/"
    goto END_FAIL
)
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    echo.
    echo  [!] Automatic install failed. Please install manually.
    start "" "https://nodejs.org/"
    goto END_FAIL
)
echo.
echo  [OK] Node.js installed successfully!
echo.
echo  =============================================
echo   IMPORTANT: You must CLOSE this window and
echo   run setup.bat again so the system PATH
echo   picks up the new Node.js installation.
echo  =============================================
echo.
pause
goto END_OK

:MANUAL_INSTALL
echo.
echo  Opening https://nodejs.org/ ...
start "" "https://nodejs.org/"
echo.
echo  After installing Node.js, CLOSE this window
echo  and run setup.bat again.
echo.
pause
goto END_OK

:NODE_OK
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found.

:: ─── Step 2: Check for npm ────────────────────────────────────
echo  [2/3] Checking for npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [!] npm is NOT found. It usually comes with Node.js.
    echo      Please reinstall Node.js from https://nodejs.org/
    echo.
    goto END_FAIL
)
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo  [OK] npm v%NPM_VER% found.

:: ─── Step 3: Install dependencies ─────────────────────────────
echo  [3/3] Installing dependencies...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [!] npm install failed.
    echo      Try deleting the node_modules folder and
    echo      package-lock.json, then run setup.bat again.
    echo.
    goto END_FAIL
)
echo.
echo  =============================================
echo   Setup complete! All dependencies installed.
echo.
echo   To start the app, run:  start.bat
echo  =============================================
echo.
pause
goto END_OK

:END_FAIL
echo.
echo  Setup did not complete. See messages above.
echo.
pause
exit /b 1

:END_OK
exit /b 0
