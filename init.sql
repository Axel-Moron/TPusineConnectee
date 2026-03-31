-- =============================================================================
-- init.sql - Initialisation de la base de données TP2 Maintenance Connectée
-- Groupe : MORON Axel & RAHARINJATOVO Lucien (Z4)
-- Description : Création des tables au premier démarrage du conteneur MariaDB
--               Exécuté automatiquement via /docker-entrypoint-initdb.d/
--
-- Schéma :
--   mesures   → 1 ligne par cycle de lecture (température + état TOR cycle auto)
--   seuils    → historique de chaque modification des seuils (traçabilité)
--   alarmes   → historique des déclenchements et disparitions d'alarmes
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tp2_maintenance_z4;

-- -----------------------------------------------------------------------------
-- Table : mesures
--
-- 1 ligne = 1 cycle de lecture Modbus complet
--   temperature  : valeur °C du capteur Banner (float 32 bits %MF706)
--   cycle_auto   : état TOR du cycle automatique Zone 3 (%MW704) — 1=LANCÉ, 0=ARRÊTÉ
--   timestamp    : horodatage de la lecture
--
-- NULL autorisé sur temperature et cycle_auto en cas d'erreur de communication
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesures (
    id          INT           NOT NULL AUTO_INCREMENT,
    temperature FLOAT         NULL     COMMENT 'Température °C — capteur Banner via %MF706',
    cycle_auto  TINYINT(1)    NULL     COMMENT 'TOR cycle auto Zone 3 : 1=LANCÉ, 0=ARRÊTÉ (%MW704)',
    timestamp   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Horodatage de la lecture Modbus',
    PRIMARY KEY (id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_temperature (temperature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mesures Modbus : 1 ligne par cycle de lecture (température + état cycle auto)';

-- -----------------------------------------------------------------------------
-- Table : seuils
--
-- Historisation de chaque modification des 4 seuils de température.
-- Utilisée pour la traçabilité et le rechargement des seuils au démarrage.
-- Les 4 seuils respectent toujours : tres_bas < bas < haut < tres_haut
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seuils (
    id        INT      NOT NULL AUTO_INCREMENT,
    tres_haut FLOAT    NOT NULL COMMENT 'Seuil critique supérieur (°C) — alarme niveau 4',
    haut      FLOAT    NOT NULL COMMENT 'Seuil d'attention supérieur (°C) — alarme niveau 3',
    bas       FLOAT    NOT NULL COMMENT 'Seuil d'attention inférieur (°C) — alarme niveau 2',
    tres_bas  FLOAT    NOT NULL COMMENT 'Seuil critique inférieur (°C) — alarme niveau 1',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date et heure de la modification',
    PRIMARY KEY (id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique des modifications des seuils de température';

-- -----------------------------------------------------------------------------
-- Table : alarmes
--
-- Historisation de tous les événements d'alarme (déclenchements et disparitions).
-- type_evenement : 'declenchement' = seuil franchi, 'disparition' = retour normal
-- niveau         : tres_haut | haut | normal | bas | tres_bas | info
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alarmes (
    id             INT          NOT NULL AUTO_INCREMENT,
    type_evenement VARCHAR(20)  NOT NULL COMMENT '''declenchement'' ou ''disparition''',
    niveau         VARCHAR(20)  NOT NULL COMMENT 'tres_haut | haut | normal | bas | tres_bas | info',
    message        VARCHAR(255) NOT NULL COMMENT 'Message affiché à l''opérateur',
    temperature    FLOAT        NULL     COMMENT 'Température au moment de l''événement (°C)',
    timestamp      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Horodatage de l''événement',
    PRIMARY KEY (id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_niveau (niveau),
    INDEX idx_type_evenement (type_evenement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique des événements d''alarme (déclenchements et disparitions)';

-- -----------------------------------------------------------------------------
-- Seuils par défaut — insérés uniquement si la table est vide (premier démarrage)
-- -----------------------------------------------------------------------------
INSERT INTO seuils (tres_haut, haut, bas, tres_bas)
SELECT 40, 35, 18, 10
WHERE NOT EXISTS (SELECT 1 FROM seuils LIMIT 1);
