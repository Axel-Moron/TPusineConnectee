// =============================================================================
// Service Scheduler - Planification des lectures Modbus périodiques
//
// Ce service utilise node-cron pour exécuter des lectures périodiques :
//   1. Lecture de la température du capteur Banner (holding register 180)
//   2. Lecture de l'état du cycle auto Zone 3 (coil %M640)
//   3. Historisation des mesures en BDD
//   4. Évaluation des alarmes et des indicateurs prédictifs
//
// La fréquence de lecture est configurable via la variable FREQUENCE_LECTURE
// =============================================================================
import cron from "node-cron";
import Mesure from "../models/Mesure.js";
import { readTemperature, readCycleAuto, writeColonneLumineuse } from "./modbusService.js";
import { traiterAlarme } from "./alarmService.js";
import { ajouterMesure, calculerPrediction } from "./predictiveService.js";

// --- État global partagé avec les routes API ---
// Ces variables stockent les dernières valeurs lues pour l'affichage en temps réel
let derniereTemperature = null;
let dernierCycleAuto = null;
let derniereAlarme = null;
let dernierePrediction = null;
let dernierTimestamp = null;

// --- Seuils par défaut (modifiables via l'interface web) ---
let seuilsActuels = {
    tres_haut: 40,   // °C - Niveau critique supérieur
    haut: 35,        // °C - Attention supérieure
    bas: 18,         // °C - Attention inférieure
    tres_bas: 10     // °C - Niveau critique inférieur
};

// Référence vers la tâche cron active
let tacheCron = null;
let frequenceActuelle = parseInt(process.env.FREQUENCE_LECTURE) || 3;

/**
 * Retourne la fréquence de lecture actuelle (en secondes)
 */
export const getFrequence = () => frequenceActuelle;

/**
 * Change la fréquence de lecture et redémarre le scheduler
 * @param {number} nouvelleFrequence - Nouvelle fréquence en secondes
 */
export const setFrequence = (nouvelleFrequence) => {
    const freq = parseInt(nouvelleFrequence);
    if (freq >= 1 && freq <= 60) {
        frequenceActuelle = freq;
        // Redémarrer le cron avec la nouvelle fréquence
        if (tacheCron) {
            tacheCron.stop();
            const cronExpression = `*/${freq} * * * * *`;
            tacheCron = cron.schedule(cronExpression, executerCycleLecture);
            console.log(`⏰ Fréquence de lecture modifiée : toutes les ${freq} secondes`);
        }
    }
};

/**
 * Getters pour accéder aux données depuis les routes API
 * Permettent à l'interface web de récupérer l'état en temps réel
 */
export const getDerniereTemperature = () => derniereTemperature;
export const getDernierCycleAuto = () => dernierCycleAuto;
export const getDerniereAlarme = () => derniereAlarme;
export const getDernierePrediction = () => dernierePrediction;
export const getDernierTimestamp = () => dernierTimestamp;
export const getSeuilsActuels = () => ({ ...seuilsActuels });

/**
 * Met à jour les seuils de température
 * Appelée depuis la route API quand l'opérateur modifie les seuils
 * @param {Object} nouveauxSeuils - {tres_haut, haut, bas, tres_bas}
 */
export const setSeuilsActuels = (nouveauxSeuils) => {
    seuilsActuels = { ...nouveauxSeuils };
    console.log(`📊 Seuils mis à jour : TH=${seuilsActuels.tres_haut} H=${seuilsActuels.haut} B=${seuilsActuels.bas} TB=${seuilsActuels.tres_bas}`);
};

/**
 * Réinitialise les valeurs temps réel (utilisé lors du passage simulation → réel)
 * Affiche "Non disponible" jusqu'à la prochaine lecture réelle
 */
export const resetValeurs = () => {
    derniereTemperature = null;
    dernierCycleAuto = null;
    derniereAlarme = null;
    dernierePrediction = null;
    dernierTimestamp = null;
    console.log(`🔄 Valeurs réinitialisées - en attente de la prochaine lecture`);
};

/**
 * Fonction principale exécutée à chaque cycle de lecture
 * Enchaîne : lecture Modbus → historisation BDD → évaluation alarmes → prédiction
 */
const executerCycleLecture = async () => {
    const now = new Date();

    try {
        // --- 1. Lecture de la température via Modbus TCP ---
        const temperature = await readTemperature();

        // --- 2. Lecture de l'état du cycle automatique Zone 3 ---
        const cycleAuto = await readCycleAuto();

        // --- 3. Historisation en base de données ---
        if (temperature !== null) {
            // Enregistrement de la mesure de température
            await Mesure.create({
                type: 'temperature',
                valeur: temperature,
                timestamp: now
            });

            // Mise à jour de l'état global
            derniereTemperature = temperature;
            dernierTimestamp = now;

            // Ajout au buffer du service prédictif
            ajouterMesure(temperature, now);
        }

        if (cycleAuto !== null) {
            // Enregistrement de l'état du cycle auto
            await Mesure.create({
                type: 'cycle_auto',
                valeur: cycleAuto ? 1 : 0,
                timestamp: now
            });
            dernierCycleAuto = cycleAuto;
        }

        // --- 4. Évaluation des alarmes si la température est disponible ---
        if (temperature !== null) {
            derniereAlarme = await traiterAlarme(temperature, seuilsActuels);
            // Piloter la colonne lumineuse physique via Modbus (si activé)
            if (derniereAlarme && derniereAlarme.voyant) {
                await writeColonneLumineuse(derniereAlarme.voyant);
            }
        }

        // --- 5. Calcul des indicateurs prédictifs ---
        if (temperature !== null) {
            dernierePrediction = calculerPrediction(
                temperature,
                seuilsActuels,
                dernierCycleAuto === true
            );
        }

    } catch (error) {
        console.error("❌ Erreur dans le cycle de lecture :", error.message);
    }
};

/**
 * Initialise le scheduler et démarre les lectures périodiques
 * La fréquence est définie par la variable d'environnement FREQUENCE_LECTURE
 */
export const initScheduler = async () => {
    const cronExpression = `*/${frequenceActuelle} * * * * *`;  // Toutes les N secondes

    console.log(`⏰ Scheduler démarré - Lecture toutes les ${frequenceActuelle} secondes`);
    console.log(`📊 Seuils initiaux : TH=${seuilsActuels.tres_haut}°C H=${seuilsActuels.haut}°C B=${seuilsActuels.bas}°C TB=${seuilsActuels.tres_bas}°C`);

    // Arrêt de la tâche précédente si elle existe
    if (tacheCron) {
        tacheCron.stop();
    }

    // Première exécution immédiate
    await executerCycleLecture();

    // Planification des lectures périodiques avec node-cron
    tacheCron = cron.schedule(cronExpression, executerCycleLecture);
};
