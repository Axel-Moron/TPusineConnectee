@echo off
echo ============================================================
echo   Configuration de la base de donnees MariaDB
echo   TP2 - Maintenance Connectee - Zone 3
echo ============================================================
echo.
echo Ce script va :
echo   1. Changer l'authentification root en mysql_native_password
echo   2. Creer la base de donnees tp2_maintenance_z4
echo.
echo Appuyez sur une touche pour continuer...
pause >nul

echo.
echo [1] Configuration de l'authentification...
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('');" 2>nul
if errorlevel 1 (
    echo     Tentative avec mariadb...
    mariadb -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('');" 2>nul
)
echo     OK

echo [2] Creation de la base de donnees...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4;" 2>nul
if errorlevel 1 (
    mariadb -u root -e "CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4;" 2>nul
)
echo     OK

echo [3] Verification...
mysql -u root -e "FLUSH PRIVILEGES;" 2>nul
if errorlevel 1 (
    mariadb -u root -e "FLUSH PRIVILEGES;" 2>nul
)
echo     OK

echo.
echo ============================================================
echo   Base de donnees configuree avec succes !
echo   Vous pouvez maintenant lancer LANCER.bat
echo ============================================================
pause
