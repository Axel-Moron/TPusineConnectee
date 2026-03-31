-- =============================================================================
-- init.sql - Initialisation de la base de données TP2 Maintenance Connectée
-- Groupe : MORON Axel & RAHARINJATOVO Lucien (Z4)
-- Description : Création des tables au premier démarrage du conteneur MariaDB
--               Exécuté automatiquement via /docker-entrypoint-initdb.d/
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tp2_maintenance_z4;

-- -----------------------------------------------------------------------------
-- Table : mesures
-- Stockage de toutes les mesures Modbus (température °C et état cycle auto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesures (
    id        INT           NOT NULL AUTO_INCREMENT,
    type      VARCHAR(20)   NOT NULL COMMENT 'Type de donnée : ''temperature'' ou ''cycle_auto''',
    valeur    FLOAT         NOT NULL COMMENT 'Valeur mesurée (°C ou booléen 0/1)',
    timestamp DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date et heure de la mesure',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table : seuils
-- Historisation de chaque modification des seuils de température
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seuils (
    id        INT   NOT NULL AUTO_INCREMENT,
    tres_haut FLOAT NOT NULL COMMENT 'Seuil très haut (°C) - Intervention nécessaire si dépassé',
    haut      FLOAT NOT NULL COMMENT 'Seuil haut (°C) - Attention si dépassé',
    bas       FLOAT NOT NULL COMMENT 'Seuil bas (°C) - Attention si en dessous',
    tres_bas  FLOAT NOT NULL COMMENT 'Seuil très bas (°C) - Intervention nécessaire si en dessous',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date et heure de la modification des seuils',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table : alarmes
-- Historisation des déclenchements et disparitions d'alarmes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alarmes (
    id             INT          NOT NULL AUTO_INCREMENT,
    type_evenement VARCHAR(20)  NOT NULL COMMENT 'Type : ''declenchement'' (apparition) ou ''disparition'' (retour normal)',
    niveau         VARCHAR(20)  NOT NULL COMMENT 'Niveau d''alarme : tres_haut, haut, normal, bas, tres_bas, info',
    message        VARCHAR(255) NOT NULL COMMENT 'Message affiché à l''opérateur',
    temperature    FLOAT        NULL     COMMENT 'Température mesurée au moment de l''alarme (°C)',
    timestamp      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date et heure de l''événement',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Seuils par défaut (valeurs initiales au premier démarrage)
-- -----------------------------------------------------------------------------
INSERT INTO seuils (tres_haut, haut, bas, tres_bas)
SELECT 40, 35, 18, 10
WHERE NOT EXISTS (SELECT 1 FROM seuils LIMIT 1);
