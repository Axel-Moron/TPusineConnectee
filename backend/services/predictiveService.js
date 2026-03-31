// =============================================================================
// Service Prédictif - Calcul d'indicateurs de maintenance prédictive
//
// Ce service analyse la tendance de la température pour prédire :
//   - Le temps avant d'atteindre un seuil critique (très haut ou très bas)
//   - Le temps avant de sortir d'une zone d'alarme
//
// Méthode : régression linéaire sur les N dernières mesures
// La pente (dérivée) permet d'estimer quand un seuil sera franchi
//
// Logique selon le cahier des charges :
//   - Entre H et TH, pente positive  → "Risque d'atteinte du seuil très haut dans x sec"
//   - Entre H et TH, pente négative  → "Sortie du seuil haut dans x secondes"
//   - Entre TB et B, pente négative   → "Risque d'atteinte du seuil très bas dans x sec"
//   - Entre TB et B, pente positive   → "Sortie du seuil bas dans x secondes"
//   - Entre B et H (normal)           → juste la valeur courante
// =============================================================================

// Nombre de mesures utilisées pour le calcul de la pente
const NB_POINTS_REGRESSION = 10;

// Stockage des dernières mesures pour le calcul de tendance
let historiqueRecent = [];

/**
 * Ajoute une mesure à l'historique récent et maintient la taille du buffer
 * @param {number} temperature - Température mesurée en °C
 * @param {Date} timestamp - Horodatage de la mesure
 */
export const ajouterMesure = (temperature, timestamp) => {
    historiqueRecent.push({
        valeur: temperature,
        temps: timestamp.getTime() / 1000  // Conversion en secondes (timestamp Unix)
    });

    // Limitation de la taille du buffer (garder les N dernières mesures)
    if (historiqueRecent.length > NB_POINTS_REGRESSION * 2) {
        historiqueRecent = historiqueRecent.slice(-NB_POINTS_REGRESSION);
    }
};

/**
 * Calcule la pente (tendance) de la température par régression linéaire
 *
 * Formule de régression linéaire (méthode des moindres carrés) :
 *   pente = (N × Σ(xi×yi) - Σxi × Σyi) / (N × Σ(xi²) - (Σxi)²)
 *
 * Où xi = temps en secondes, yi = température en °C
 * La pente est exprimée en °C/seconde
 *
 * @returns {number|null} Pente en °C/seconde ou null si pas assez de données
 */
export const calculerPente = () => {
    // Il faut au minimum 3 points pour une régression fiable
    if (historiqueRecent.length < 3) return null;

    // Utiliser les N dernières mesures
    const points = historiqueRecent.slice(-NB_POINTS_REGRESSION);
    const n = points.length;

    // Normalisation des temps (relatifs au premier point pour éviter les grands nombres)
    const t0 = points[0].temps;

    // Calcul des sommes pour la régression linéaire
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
        const x = p.temps - t0;  // Temps relatif en secondes
        const y = p.valeur;       // Température en °C
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    // Calcul de la pente (formule des moindres carrés)
    const denominateur = n * sumX2 - sumX * sumX;
    if (denominateur === 0) return 0;  // Pas de variation temporelle

    const pente = (n * sumXY - sumX * sumY) / denominateur;
    return pente;  // En °C/seconde
};

/**
 * Calcule les indicateurs prédictifs en fonction de la température, des seuils et de la pente
 *
 * @param {number} temperature - Température actuelle en °C
 * @param {Object} seuils - Les 4 seuils {tres_haut, haut, bas, tres_bas}
 * @param {boolean} cycleAutoActif - true si le cycle auto Zone 3 est lancé
 * @returns {Object} Indicateurs prédictifs {message, tempsEstime, direction, actif}
 */
export const calculerPrediction = (temperature, seuils, cycleAutoActif) => {
    // Les indicateurs prédictifs ne sont actifs que si le cycle auto est lancé
    if (!cycleAutoActif) {
        return {
            message: "Cycle auto arrêté - Prédiction inactive",
            tempsEstime: null,
            direction: "neutre",
            actif: false
        };
    }

    const pente = calculerPente();

    // Pas assez de données pour prédire
    if (pente === null) {
        return {
            message: "Calcul en cours... (accumulation des mesures)",
            tempsEstime: null,
            direction: "neutre",
            actif: false
        };
    }

    // --- Seuil très haut déjà dépassé ---
    if (temperature > seuils.tres_haut) {
        if (pente > 0.001) {
            return {
                message: `⚠️ Seuil très haut dépassé - Température en hausse`,
                tempsEstime: null,
                direction: "monte",
                actif: true,
                pente: pente
            };
        } else if (pente < -0.001) {
            const delta = temperature - seuils.tres_haut;
            const tempsSecondes = Math.round(delta / Math.abs(pente));
            return {
                message: `Retour sous seuil très haut dans ${formatTemps(tempsSecondes)}`,
                tempsEstime: tempsSecondes,
                direction: "descend",
                actif: true,
                pente: pente
            };
        } else {
            return {
                message: `⚠️ Seuil très haut dépassé - Température stable`,
                tempsEstime: null,
                direction: "stable",
                actif: true,
                pente: pente
            };
        }
    }

    // --- Seuil très bas déjà dépassé ---
    if (temperature < seuils.tres_bas) {
        if (pente < -0.001) {
            return {
                message: `⚠️ Seuil très bas dépassé - Température en baisse`,
                tempsEstime: null,
                direction: "descend",
                actif: true,
                pente: pente
            };
        } else if (pente > 0.001) {
            const delta = seuils.tres_bas - temperature;
            const tempsSecondes = Math.round(delta / pente);
            return {
                message: `Retour au-dessus du seuil très bas dans ${formatTemps(tempsSecondes)}`,
                tempsEstime: tempsSecondes,
                direction: "monte",
                actif: true,
                pente: pente
            };
        } else {
            return {
                message: `⚠️ Seuil très bas dépassé - Température stable`,
                tempsEstime: null,
                direction: "stable",
                actif: true,
                pente: pente
            };
        }
    }

    // --- Zone entre seuil haut et seuil très haut ---
    if (temperature > seuils.haut && temperature <= seuils.tres_haut) {
        if (pente > 0.001) {
            // Pente positive → risque d'atteindre le seuil très haut
            const delta = seuils.tres_haut - temperature;
            const tempsSecondes = Math.round(delta / pente);
            return {
                message: `Risque d'atteinte du seuil très haut dans ${formatTemps(tempsSecondes)}`,
                tempsEstime: tempsSecondes,
                direction: "monte",
                actif: true,
                pente: pente
            };
        } else if (pente < -0.001) {
            // Pente négative → sortie du seuil haut
            const delta = temperature - seuils.haut;
            const tempsSecondes = Math.round(delta / Math.abs(pente));
            return {
                message: `Sortie du seuil haut dans ${formatTemps(tempsSecondes)}`,
                tempsEstime: tempsSecondes,
                direction: "descend",
                actif: true,
                pente: pente
            };
        }
    }

    // --- Zone entre seuil très bas et seuil bas ---
    if (temperature < seuils.bas && temperature >= seuils.tres_bas) {
        if (pente < -0.001) {
            // Pente négative → risque d'atteindre le seuil très bas
            const delta = temperature - seuils.tres_bas;
            const tempsSecondes = Math.round(delta / Math.abs(pente));
            return {
                message: `Risque d'atteinte du seuil très bas dans ${formatTemps(tempsSecondes)}`,
                tempsEstime: tempsSecondes,
                direction: "descend",
                actif: true,
                pente: pente
            };
        } else if (pente > 0.001) {
            // Pente positive → sortie du seuil bas
            const delta = seuils.bas - temperature;
            const tempsSecondes = Math.round(delta / pente);
            return {
                message: `Sortie du seuil bas dans ${formatTemps(tempsSecondes)}`,
                tempsEstime: tempsSecondes,
                direction: "monte",
                actif: true,
                pente: pente
            };
        }
    }

    // --- Zone normale (entre seuil bas et seuil haut) ou pente quasi nulle ---
    return {
        message: "Température stable - Aucune alerte prédictive",
        tempsEstime: null,
        direction: pente > 0.001 ? "monte" : pente < -0.001 ? "descend" : "stable",
        actif: false,
        pente: pente
    };
};

/**
 * Formate un nombre de secondes en texte lisible
 * @param {number} secondes - Nombre de secondes
 * @returns {string} Texte formaté (ex: "2 min 30 sec", "45 sec")
 */
function formatTemps(secondes) {
    if (secondes < 0) return "N/A";
    if (secondes > 3600) {
        const heures = Math.floor(secondes / 3600);
        const minutes = Math.floor((secondes % 3600) / 60);
        return `${heures}h ${minutes}min`;
    }
    if (secondes > 60) {
        const minutes = Math.floor(secondes / 60);
        const sec = secondes % 60;
        return `${minutes} min ${sec} sec`;
    }
    return `${secondes} sec`;
}
