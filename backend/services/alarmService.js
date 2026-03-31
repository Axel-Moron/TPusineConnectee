// =============================================================================
// Service Alarmes - Gestion des alarmes basées sur les seuils de température
//
// Logique des alarmes selon le cahier des charges :
//   T > Seuil Très Haut → "Niveau critique" + Voyant rouge clignotant
//   T > Seuil Haut      → "Attention : seuil haut dépassé" + Voyant rouge fixe
//   Seuil Bas ≤ T ≤ Seuil Haut → Pas de message, voyant orange fixe
//   T < Seuil Bas        → "Attention : en dessous du seuil bas" + Voyant vert fixe
//   T < Seuil Très Bas   → "Niveau critique" + Voyant vert clignotant
//
// Chaque changement d'état est historisé en BDD et dans alarmes.csv
// =============================================================================
import Alarme from "../models/Alarme.js";
import { appendAlarmeCSV } from "./csvService.js";

// --- État courant de l'alarme (pour détecter les changements) ---
let niveauActuel = "normal";  // Niveau initial au démarrage

/**
 * Détermine le niveau d'alarme en fonction de la température et des seuils
 * @param {number} temperature - Température actuelle en °C
 * @param {Object} seuils - Les 4 seuils {tres_haut, haut, bas, tres_bas}
 * @returns {Object} Objet contenant le niveau, le message et la couleur du voyant
 */
export const evaluerAlarme = (temperature, seuils) => {
    // Cas 1 : Température au-dessus du seuil très haut
    if (temperature > seuils.tres_haut) {
        return {
            niveau: "tres_haut",
            message: "Niveau critique : seuil très haut atteint - Intervention nécessaire",
            voyant: "rouge_clignotant",      // Voyant rouge clignotant sur colonne lumineuse
            couleur: "#ff0000",
            icone: "🔴",
            critique: true
        };
    }
    // Cas 2 : Température au-dessus du seuil haut (mais sous très haut)
    if (temperature > seuils.haut) {
        return {
            niveau: "haut",
            message: "Attention : seuil haut dépassé",
            voyant: "rouge_fixe",            // Voyant rouge fixe
            couleur: "#ff4444",
            icone: "🟠",
            critique: false
        };
    }
    // Cas 3 : Température en dessous du seuil très bas
    if (temperature < seuils.tres_bas) {
        return {
            niveau: "tres_bas",
            message: "Niveau critique : en dessous du seuil très bas - Intervention nécessaire",
            voyant: "vert_clignotant",       // Voyant vert clignotant
            couleur: "#00cc00",
            icone: "🔵",
            critique: true
        };
    }
    // Cas 4 : Température en dessous du seuil bas (mais au-dessus de très bas)
    if (temperature < seuils.bas) {
        return {
            niveau: "bas",
            message: "Attention : en dessous du seuil bas",
            voyant: "vert_fixe",             // Voyant vert fixe
            couleur: "#44cc44",
            icone: "🟢",
            critique: false
        };
    }
    // Cas 5 : Température normale (entre seuil bas et seuil haut)
    return {
        niveau: "normal",
        message: "",                          // Aucun message lié aux seuils
        voyant: "orange_fixe",               // Voyant orange fixe (fonctionnement normal)
        couleur: "#ff9900",
        icone: "🟡",
        critique: false
    };
};

/**
 * Traite un changement de niveau d'alarme
 * Enregistre les déclenchements et disparitions en BDD et CSV
 * @param {number} temperature - Température actuelle
 * @param {Object} seuils - Les 4 seuils actifs
 * @returns {Object} Résultat de l'évaluation d'alarme
 */
export const traiterAlarme = async (temperature, seuils) => {
    const resultat = evaluerAlarme(temperature, seuils);
    const nouveauNiveau = resultat.niveau;

    // Détection d'un changement de niveau d'alarme
    if (nouveauNiveau !== niveauActuel) {
        const ancienNiveau = niveauActuel;

        // --- Enregistrement de la DISPARITION de l'ancienne alarme ---
        if (ancienNiveau !== "normal") {
            const alarmeDisparition = {
                type_evenement: "disparition",
                niveau: ancienNiveau,
                message: `Fin d'alarme ${ancienNiveau} - Retour vers ${nouveauNiveau}`,
                temperature: temperature
            };
            // Sauvegarde en BDD
            await Alarme.create(alarmeDisparition);
            // Sauvegarde dans le fichier CSV
            appendAlarmeCSV(alarmeDisparition);
        }

        // --- Enregistrement du DÉCLENCHEMENT de la nouvelle alarme ---
        if (nouveauNiveau !== "normal") {
            const alarmeDeclenchement = {
                type_evenement: "declenchement",
                niveau: nouveauNiveau,
                message: resultat.message,
                temperature: temperature
            };
            await Alarme.create(alarmeDeclenchement);
            appendAlarmeCSV(alarmeDeclenchement);
        }

        // Mise à jour du niveau courant
        niveauActuel = nouveauNiveau;
        console.log(`⚠️ Changement d'alarme : ${ancienNiveau} → ${nouveauNiveau} (T=${temperature}°C)`);
    }

    return resultat;
};

/**
 * Retourne le niveau d'alarme actuel
 * @returns {string} Niveau courant ('normal', 'haut', 'tres_haut', 'bas', 'tres_bas')
 */
export const getNiveauActuel = () => niveauActuel;
