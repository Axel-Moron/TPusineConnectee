@echo off
echo ============================================================
echo   TP2 - Maintenance Connectee - Zone 3 (DOCKER MODE)
echo   Groupe Z4 : MORON ^& RAHARINJATOVO
echo ============================================================
echo.

echo [1] Verification de Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR : Docker n'est pas installe ou pas demarre !
    echo Lancez Docker Desktop avant de continuer.
    pause
    exit /b
)
echo     Docker OK

echo [2] Arret des conteneurs existants...
docker-compose down

echo [3] Construction et demarrage des conteneurs...
echo.
docker-compose up --build -d

if errorlevel 1 (
    echo ERREUR : Le demarrage Docker a echoue.
    pause
    exit /b
)

echo.
echo ============================================================
echo   L'application est en cours de demarrage...
echo   Base de donnees (MariaDB) : localhost:3307
echo   Interface Web : http://localhost:3000
echo ============================================================
echo.
echo [INFO] Pour voir les logs du backend : docker logs -f tp2-app
echo [INFO] Pour arreter : docker-compose down
echo.
pause
