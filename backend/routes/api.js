// =============================================================================
// Routes API - Endpoints REST pour l'interface web
//
// Routes disponibles :
//   GET  /api/status      → État temps réel (température, alarme, prédiction)
//   GET  /api/seuils      → Récupérer les seuils actuels
//   POST /api/seuils      → Modifier les seuils (avec historisation)
//   GET  /api/historique   → Historique des mesures (avec filtres date)
//   GET  /api/alarmes     → Historique des alarmes
//   GET  /api/mode        → État du mode (simulation/réel)
//   POST /api/mode        → Changer le mode simulation/réel
//   GET  /api/export/mesures  → Export CSV des mesures
//   GET  /api/export/alarmes  → Export CSV des alarmes
// =============================================================================
import express from "express";
import { Op } from "sequelize";
import Capteur from "../models/Capteur.js";
import Mesure from "../models/Mesure.js";
import Seuil from "../models/Seuil.js";
import Alarme from "../models/Alarme.js";
import Config from "../models/Config.js";
import { appendSeuilCSV, appendAlarmeCSV } from "../services/csvService.js";
import { setSimulationMode, getSimulationMode, getModbusConfig, setModbusConfig } from "../services/modbusService.js";
import {
    getDerniereTemperature,
    getDernierCycleAuto,
    getDerniereAlarme,
    getDernierePrediction,
    getDernierTimestamp,
    getSeuilsActuels,
    setSeuilsActuels,
    getFrequence,
    setFrequence,
    resetValeurs
} from "../services/scheduler.js";

const router = express.Router();

// =============================================================================
// GET /api/status - Données temps réel pour le dashboard
// Retourne la température, l'état du cycle auto, les alarmes et les prédictions
// Cette route est appelée toutes les 2 secondes par le frontend
// =============================================================================
router.get("/status", (req, res) => {
    try {
        res.json({
            temperature: getDerniereTemperature(),        // Dernière température lue (°C)
            cycle_auto: getDernierCycleAuto(),             // État du cycle auto Zone 3
            alarme: getDerniereAlarme(),                   // Résultat de l'évaluation d'alarme
            prediction: getDernierePrediction(),           // Indicateurs prédictifs
            seuils: getSeuilsActuels(),                    // Seuils actuels
            timestamp: getDernierTimestamp(),               // Horodatage de la dernière lecture
            mode_simulation: getSimulationMode()           // Mode actuel
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/seuils - Récupérer les seuils de température actuels
// =============================================================================
router.get("/seuils", (req, res) => {
    res.json(getSeuilsActuels());
});

// =============================================================================
// POST /api/seuils - Modifier les seuils de température
// Corps attendu : { tres_haut: number, haut: number, bas: number, tres_bas: number }
//
// Vérifications de cohérence :
//   tres_bas < bas < haut < tres_haut
//
// Actions effectuées :
//   1. Validation des valeurs
//   2. Mise à jour des seuils en mémoire
//   3. Historisation en BDD (table seuils)
//   4. Écriture dans le fichier seuils.csv
// =============================================================================
router.post("/seuils", async (req, res) => {
    try {
        const { tres_haut, haut, bas, tres_bas } = req.body;

        // Conversion en nombres flottants
        const th = parseFloat(tres_haut);
        const h = parseFloat(haut);
        const b = parseFloat(bas);
        const tb = parseFloat(tres_bas);

        // Vérification que les valeurs sont des nombres valides
        if (isNaN(th) || isNaN(h) || isNaN(b) || isNaN(tb)) {
            return res.status(400).json({ error: "Toutes les valeurs doivent être des nombres" });
        }

        // Vérification de la cohérence : TB < B < H < TH
        if (tb >= b || b >= h || h >= th) {
            return res.status(400).json({
                error: "Les seuils doivent respecter l'ordre : Très Bas < Bas < Haut < Très Haut"
            });
        }

        const nouveauxSeuils = { tres_haut: th, haut: h, bas: b, tres_bas: tb };

        // 1. Mise à jour des seuils en mémoire (utilisés par le scheduler)
        setSeuilsActuels(nouveauxSeuils);

        // 2. Historisation en base de données
        await Seuil.create({ ...nouveauxSeuils, id_capteur: 1 });

        // 3. Écriture dans le fichier seuils.csv
        appendSeuilCSV(nouveauxSeuils);

        // 4. Historisation dans les alarmes pour la traçabilité demandée
        const alarmeData = {
            type_evenement: 'declenchement',
            niveau: 'info',
            message: `Modification des seuils : TH=${th} H=${h} B=${b} TB=${tb}`,
            temperature: getDerniereTemperature() || 0
        };
        await Alarme.create(alarmeData);
        appendAlarmeCSV(alarmeData);

        console.log(`✅ Seuils modifiés : TH=${th} H=${h} B=${b} TB=${tb}`);
        res.json({ success: true, seuils: nouveauxSeuils });

    } catch (err) {
        console.error("Erreur modification seuils:", err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/historique - Historique des mesures de température
// Paramètres query : start (date début), end (date fin), limit (nb max)
// Utilisé pour le graphique d'historique sur le dashboard
// =============================================================================
router.get("/historique", async (req, res) => {
    try {
        const { start, end, limit } = req.query;
        const whereClause = { id_capteur: 1 };  // Uniquement les températures (capteur 1)

        if (start && end) {
            whereClause.temps = { [Op.between]: [new Date(start), new Date(end)] };
        }

        const mesures = await Mesure.findAll({
            where: whereClause,
            order: [["temps", "ASC"]],
            limit: parseInt(limit) || 2000,
            attributes: ['valeur', 'temps']
        });

        // Renommer pour compatibilité frontend (valeur → temperature, temps → timestamp)
        res.json(mesures.map(m => ({ temperature: m.valeur, timestamp: m.temps })));
    } catch (err) {
        console.error("Erreur historique:", err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/alarmes - Historique des alarmes (déclenchements et disparitions)
// Paramètres query : start, end, limit
// =============================================================================
router.get("/alarmes", async (req, res) => {
    try {
        const { start, end, limit, offset } = req.query;
        const whereClause = {};

        if (start && end) {
            whereClause.timestamp = { [Op.between]: [new Date(start), new Date(end)] };
        }

        const alarmes = await Alarme.findAll({
            where: whereClause,
            order: [["timestamp", "DESC"]],
            limit:  parseInt(limit)  || 20,
            offset: parseInt(offset) || 0
        });

        // Nombre total pour savoir s'il reste des alarmes à charger
        const total = await Alarme.count({ where: whereClause });

        res.json({ alarmes, total, offset: parseInt(offset) || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// DELETE /api/alarmes/:id - Supprimer une alarme par son id
// =============================================================================
router.delete("/alarmes/:id", async (req, res) => {
    try {
        const deleted = await Alarme.destroy({ where: { id: req.params.id } });
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Alarme introuvable" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/mode - Récupérer le mode actuel (simulation ou réel)
// =============================================================================
router.get("/mode", (req, res) => {
    res.json({ simulation: getSimulationMode() });
});

// =============================================================================
// POST /api/mode - Changer le mode simulation/réel
// Corps attendu : { simulation: boolean }
// =============================================================================
router.post("/mode", (req, res) => {
    const { simulation } = req.body;
    if (typeof simulation === 'boolean') {
        const ancienMode = getSimulationMode();
        setSimulationMode(simulation);
        // Si on passe de simulation à réel, réinitialiser les valeurs
        if (ancienMode === true && simulation === false) {
            resetValeurs();
        }
        res.json({ success: true, simulation: getSimulationMode() });
    } else {
        res.status(400).json({ error: "Valeur booléenne attendue pour 'simulation'" });
    }
});

// =============================================================================
// GET /api/seuils/historique - Historique des modifications de seuils
// =============================================================================
router.get("/seuils/historique", async (req, res) => {
    try {
        const historique = await Seuil.findAll({
            order: [["temps", "DESC"]],
            limit: 50
        });
        res.json(historique);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/export/mesures - Export CSV des mesures de température
// =============================================================================
router.get("/export/mesures", async (req, res) => {
    try {
        const { start, end } = req.query;
        const whereClause = { id_capteur: 1 };  // Températures uniquement

        if (start && end) {
            whereClause.temps = { [Op.between]: [new Date(start), new Date(end)] };
        }

        const mesures = await Mesure.findAll({
            where: whereClause,
            order: [["temps", "ASC"]],
            attributes: ['valeur', 'temps']
        });

        let csv = "Date;Heure;Temperature_C\r\n";
        mesures.forEach(m => {
            const d = new Date(m.temps);
            csv += `${d.toLocaleDateString('fr-FR')};${d.toLocaleTimeString('fr-FR')};${m.valeur}\r\n`;
        });

        res.header("Content-Type", "text/csv; charset=utf-8");
        res.attachment("export_mesures.csv");
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/export/alarmes - Export CSV de l'historique des alarmes
// =============================================================================
router.get("/export/alarmes", async (req, res) => {
    try {
        const { start, end } = req.query;
        const whereClause = {};

        if (start && end) {
            whereClause.timestamp = { [Op.between]: [new Date(start), new Date(end)] };
        }

        const alarmes = await Alarme.findAll({
            where: whereClause,
            order: [["timestamp", "ASC"]]
        });

        let csv = "Date;Heure;Type;Niveau;Message;Temperature\r\n";
        alarmes.forEach(a => {
            const d = new Date(a.timestamp);
            csv += `${d.toLocaleDateString('fr-FR')};${d.toLocaleTimeString('fr-FR')};${a.type_evenement};${a.niveau};${a.message};${a.temperature || ''}\r\n`;
        });

        res.header("Content-Type", "text/csv; charset=utf-8");
        res.attachment("export_alarmes.csv");
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/export/seuils - Export CSV de l'historique des seuils
// =============================================================================
router.get("/export/seuils", async (req, res) => {
    try {
        const { start, end } = req.query;
        const whereClause = {};

        if (start && end) {
            whereClause.temps = { [Op.between]: [new Date(start), new Date(end)] };
        }

        const seuils = await Seuil.findAll({
            where: whereClause,
            order: [["temps", "ASC"]]
        });

        let csv = "Date;Heure;Tres_Haut;Haut;Bas;Tres_Bas\r\n";
        seuils.forEach(s => {
            const d = new Date(s.temps);
            csv += `${d.toLocaleDateString('fr-FR')};${d.toLocaleTimeString('fr-FR')};${s.tres_haut};${s.haut};${s.bas};${s.tres_bas}\r\n`;
        });

        res.header("Content-Type", "text/csv; charset=utf-8");
        res.attachment("export_seuils.csv");
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GET /api/config - Récupérer la configuration Modbus et la fréquence
// Utilisé par la page Paramètres pour afficher la config actuelle
// =============================================================================
router.get("/config", (req, res) => {
    const modbusConfig = getModbusConfig();
    res.json({
        ...modbusConfig,
        frequenceLecture: getFrequence()
    });
});

// =============================================================================
// POST /api/config - Modifier la configuration Modbus et/ou la fréquence
// Corps attendu (tous optionnels) :
//   { modbusIp, modbusPort, registreTemperature,
//     registreCycleAuto, frequenceLecture, heartbeatEnabled, registreHeartbeat, heartbeatFreq }
// =============================================================================
router.post("/config", async (req, res) => {
    try {
        const {
            modbusIp, modbusPort,
            registreTemperature, registreCycleAuto,
            frequenceLecture,
            heartbeatEnabled, registreHeartbeat, heartbeatFreq
        } = req.body;

        // Mise à jour de la config Modbus globale
        setModbusConfig({
            modbusIp, modbusPort,
            registreTemperature, registreCycleAuto,
            heartbeatEnabled, registreHeartbeat, heartbeatFreq
        });

        // Mise à jour de la fréquence si fournie
        if (frequenceLecture !== undefined) {
            setFrequence(frequenceLecture);
        }

        // Sauvegarde persistante en BDD
        await Config.upsert({
            id: 1,
            modbusIp: modbusIp !== undefined ? modbusIp : getModbusConfig().modbusIp,
            modbusPort: modbusPort !== undefined ? modbusPort : getModbusConfig().modbusPort,
            registreTemperature: registreTemperature !== undefined ? registreTemperature : getModbusConfig().registreTemperature,
            registreCycleAuto: registreCycleAuto !== undefined ? registreCycleAuto : getModbusConfig().registreCycleAuto,
            frequenceLecture: frequenceLecture !== undefined ? frequenceLecture : getFrequence(),
            colonneEnabled: getModbusConfig().colonneEnabled,
            coilRouge: getModbusConfig().coilRouge,
            coilOrange: getModbusConfig().coilOrange,
            coilVert: getModbusConfig().coilVert,
            heartbeatEnabled: heartbeatEnabled !== undefined ? heartbeatEnabled : getModbusConfig().heartbeatEnabled,
            registreHeartbeat: registreHeartbeat !== undefined ? registreHeartbeat : getModbusConfig().registreHeartbeat,
            heartbeatFreq: heartbeatFreq !== undefined ? heartbeatFreq : getModbusConfig().heartbeatFreq
        });

        console.log(`⚙️ Configuration mise à jour via API et BDD`);
        res.json({
            success: true,
            config: {
                ...getModbusConfig(),
                frequenceLecture: getFrequence()
            }
        });
    } catch (err) {
        console.error("Erreur modification config:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
