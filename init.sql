-- =============================================================================
-- init.sql - Initialisation de la base de données TP2 Maintenance Connectée
-- Groupe : MORON Axel & RAHARINJATOVO Lucien (Z4)
-- Exécuté automatiquement par MariaDB via /docker-entrypoint-initdb.d/
--
-- Schéma relationnel :
--
--   CAPTEURS ←── MESURES    (1 capteur → N mesures)
--   CAPTEURS ←── SEUIL      (1 capteur → N seuils historiques)
--   ALARMES                  (table indépendante, pas de FK capteur)
--
-- Capteurs fixes (seedés) :
--   id=1 : Température Zone 3  (float °C — %MF706)
--   id=2 : Cycle Auto Zone 3   (TOR 0/1  — %MW704)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tp2_maintenance_z4;

-- -----------------------------------------------------------------------------
-- Table : capteurs
-- Table de référence des capteurs/grandeurs du système.
-- Sert de clé étrangère pour MESURES et SEUIL.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capteurs (
    id          INT          NOT NULL AUTO_INCREMENT,
    designation VARCHAR(100) NOT NULL COMMENT 'Nom du capteur ou de la grandeur mesurée',
    PRIMARY KEY (id),
    UNIQUE KEY uk_designation (designation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Référentiel des capteurs de l''installation Zone 3';

-- -----------------------------------------------------------------------------
-- Table : mesures
-- Stockage de toutes les valeurs mesurées, une ligne par lecture et par capteur.
--   id_capteur=1 → température (°C, float)
--   id_capteur=2 → cycle auto  (TOR : 1=LANCÉ, 0=ARRÊTÉ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesures (
    id          INT      NOT NULL AUTO_INCREMENT,
    valeur      FLOAT    NOT NULL COMMENT 'Valeur mesurée (°C pour température, 0/1 pour TOR)',
    id_capteur  INT      NOT NULL COMMENT 'Capteur source (FK → capteurs.id)',
    temps       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Horodatage de la lecture',
    PRIMARY KEY (id),
    INDEX idx_capteur_temps (id_capteur, temps),
    CONSTRAINT fk_mesures_capteur FOREIGN KEY (id_capteur) REFERENCES capteurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mesures Modbus horodatées, une ligne par capteur par cycle de lecture';

-- -----------------------------------------------------------------------------
-- Table : seuil
-- Historique des modifications des seuils de température (traçabilité).
-- Les 4 niveaux : tres_haut (Max critique) > haut > bas > tres_bas (Min critique)
-- Lié au capteur température (id_capteur=1).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seuil (
    id          INT      NOT NULL AUTO_INCREMENT,
    tres_haut   FLOAT    NOT NULL COMMENT 'Max critique (°C) — alarme rouge',
    haut        FLOAT    NOT NULL COMMENT 'Max attention (°C) — alarme orange',
    bas         FLOAT    NOT NULL COMMENT 'Min attention (°C) — alarme vert',
    tres_bas    FLOAT    NOT NULL COMMENT 'Min critique (°C) — alarme rouge',
    id_capteur  INT      NOT NULL DEFAULT 1 COMMENT 'Capteur concerné (FK → capteurs.id)',
    temps       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de modification',
    PRIMARY KEY (id),
    INDEX idx_capteur_temps (id_capteur, temps),
    CONSTRAINT fk_seuil_capteur FOREIGN KEY (id_capteur) REFERENCES capteurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique des modifications des seuils de température (traçabilité)';

-- -----------------------------------------------------------------------------
-- Table : alarmes
-- Historique de tous les événements d'alarme (déclenchements et disparitions).
-- type_evenement : 'declenchement' | 'disparition'
-- niveau         : tres_haut | haut | normal | bas | tres_bas | info
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alarmes (
    id             INT          NOT NULL AUTO_INCREMENT,
    type_evenement VARCHAR(20)  NOT NULL COMMENT '''declenchement'' ou ''disparition''',
    niveau         VARCHAR(20)  NOT NULL COMMENT 'tres_haut | haut | normal | bas | tres_bas | info',
    message        VARCHAR(255) NOT NULL COMMENT 'Message opérateur',
    temperature    FLOAT        NULL     COMMENT 'Température au moment de l''événement (°C)',
    timestamp      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Horodatage',
    PRIMARY KEY (id),
    INDEX idx_timestamp    (timestamp),
    INDEX idx_niveau       (niveau),
    INDEX idx_type_evnmt   (type_evenement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Journal des événements d''alarme (déclenchements et disparitions)';

-- -----------------------------------------------------------------------------
-- Seed : capteurs par défaut
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO capteurs (id, designation) VALUES
    (1, 'Température Zone 3'),
    (2, 'Cycle Auto Zone 3');

-- -----------------------------------------------------------------------------
-- Seed : seuils par défaut (uniquement si la table est vide)
-- -----------------------------------------------------------------------------
INSERT INTO seuil (tres_haut, haut, bas, tres_bas, id_capteur)
SELECT 40, 35, 18, 10, 1
WHERE NOT EXISTS (SELECT 1 FROM seuil LIMIT 1);

-- -----------------------------------------------------------------------------
-- Table : configs
-- Configuration technique (IP, Ports, Registres, Fréquences).
-- Permet la persistance des paramètres au-delà du redémarrage Docker.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configs (
    id                   INT          NOT NULL DEFAULT 1,
    modbusIp             VARCHAR(100) DEFAULT '172.16.1.24',
    modbusPort           INT          DEFAULT 502,
    registreTemperature  INT          DEFAULT 706,
    registreCycleAuto    INT          DEFAULT 704,
    frequenceLecture     INT          DEFAULT 3,
    colonneEnabled       BOOLEAN      DEFAULT TRUE,
    coilRouge            INT          DEFAULT 702,
    coilOrange           INT          DEFAULT 701,
    coilVert             INT          DEFAULT 703,
    heartbeatEnabled     BOOLEAN      DEFAULT TRUE,
    registreHeartbeat    INT          DEFAULT 700,
    heartbeatFreq        INT          DEFAULT 5000,
    createdAt            DATETIME     NOT NULL,
    updatedAt            DATETIME     NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configuration dynamique du système de supervision';

-- Seed : configuration par défaut (uniquement si vide)
INSERT INTO configs (id, modbusIp, modbusPort, registreTemperature, registreCycleAuto, frequenceLecture, createdAt, updatedAt)
SELECT 1, '172.16.1.24', 502, 706, 704, 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM configs LIMIT 1);
