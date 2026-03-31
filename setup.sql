ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('');
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4;
SELECT 'OK - Base configuree avec succes !' AS Resultat;
