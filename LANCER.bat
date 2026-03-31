@echo off
echo ============================================================
echo   TP2 - Maintenance Connectee - Zone 3
echo   Groupe Z4 : MORON ^& RAHARINJATOVO
echo ============================================================
echo.
echo [1] Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR : Node.js n'est pas installe !
    echo Telechargez-le sur https://nodejs.org
    pause
    exit /b
)
echo     Node.js OK

echo [2] Installation des dependances...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (
    echo ERREUR : npm install a echoue
    pause
    exit /b
)
echo     Dependances OK

echo [3] Demarrage du serveur...
echo.
echo ============================================================
echo   Ouvrez votre navigateur sur : http://localhost:3000
echo   Appuyez sur Ctrl+C pour arreter le serveur
echo ============================================================
echo.
node server.js
pause
