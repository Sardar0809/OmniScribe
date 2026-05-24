@echo off
setlocal enabledelayedexpansion
title OmniScribe Premium Desktop Server

echo =======================================================================
echo          OMNISCRIBE ADVANCED WRITING CORE - LOCAL DESKTOP NODE
echo =======================================================================
echo.

:: 1. Verify Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your system PATH!
    echo.
    echo Please install Node.js (LTS version recommended) to run OmniScribe offline:
    echo -- Download URL: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Search for package.json in current or adjacent subdirectory
if not exist "package.json" (
    if exist "server\package.json" (
        cd server
    ) else (
        echo [ERROR] package.json not found in current directory or "server" folder!
        echo Please make sure to place this BAT script in the root folder of OmniScribe.
        echo.
        pause
        exit /b 1
    )
)

:: 3. Check for dependencies (node_modules)
if not exist "node_modules\" (
    echo [INFO] Third-party dependencies not found. Bootstrapping, please wait...
    echo Running: npm install
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed. Please verify your internet connection and try again.
        pause
        exit /b 1
    )
)

:: 4. Check if bundled output server.cjs exists
if not exist "dist\server.cjs" (
    echo [INFO] Compiled production server bundle not found in dist.
    echo Running local client and server compilation: npm run build
    call npm run build
    if !errorlevel! neq 0 (
        echo [ERROR] Build sequence failed! Please check code issues or missing keys.
        pause
        exit /b 1
    )
)

:: 5. Launch local offline application
echo.
echo =======================================================================
echo  [SUCCESS] OmniScribe core is compiled and ready!
echo  Booting local engine on http://localhost:3000
echo =======================================================================
echo.

:: Briefly wait and open default browser
timeout /t 2 >nul
start "" "http://localhost:3000"

:: Set production environment and run CJS server bundle
set NODE_ENV=production
node dist/server.cjs

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] CJS runner exited or failed. Attempting regular developer live runner...
    call npm run dev
)

pause
