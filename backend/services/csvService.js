// =============================================================================
// Service CSV - Génération de fichiers CSV pour la traçabilité
//
// Deux fichiers CSV sont générés conformément au cahier des charges :
//   1. seuils.csv   → Historique des modifications de seuils
//   2. alarmes.csv  → Historique des déclenchements/disparitions d'alarmes
//
// Ces fichiers assurent la traçabilité des événements pour la maintenance
// =============================================================================
import fs from 'fs';
import path from 'path';

// Chemin du dossier CSV (monté en volume Docker)
const CSV_DIR = path.join(process.cwd(), 'csv');

/**
 * Initialise les fichiers CSV avec leurs en-têtes s'ils n'existent pas
 * Appelée au démarrage du serveur
 */
export const initCSVFiles = () => {
    // Création du dossier CSV s'il n'existe pas
    if (!fs.existsSync(CSV_DIR)) {
        fs.mkdirSync(CSV_DIR, { recursive: true });
    }

    // Fichier seuils.csv : en-tête avec les 4 niveaux de seuils
    const seuilsFile = path.join(CSV_DIR, 'seuils.csv');
    if (!fs.existsSync(seuilsFile)) {
        fs.writeFileSync(seuilsFile,
            'Date;Heure;Tres_Haut;Haut;Bas;Tres_Bas\r\n',
            'utf-8'
        );
        console.log('📄 Fichier seuils.csv créé');
    }

    // Fichier alarmes.csv : en-tête avec les informations d'alarme
    const alarmesFile = path.join(CSV_DIR, 'alarmes.csv');
    if (!fs.existsSync(alarmesFile)) {
        fs.writeFileSync(alarmesFile,
            'Date;Heure;Type_Evenement;Niveau;Message;Temperature\r\n',
            'utf-8'
        );
        console.log('📄 Fichier alarmes.csv créé');
    }
};

/**
 * Ajoute une ligne au fichier seuils.csv lors d'un changement de seuil
 * @param {Object} seuils - Objet contenant les 4 seuils {tres_haut, haut, bas, tres_bas}
 */
export const appendSeuilCSV = (seuils) => {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');   // Format DD/MM/YYYY
    const heure = now.toLocaleTimeString('fr-FR');  // Format HH:MM:SS

    // Formatage de la ligne CSV avec séparateur point-virgule
    const ligne = `${date};${heure};${seuils.tres_haut};${seuils.haut};${seuils.bas};${seuils.tres_bas}\r\n`;

    const filePath = path.join(CSV_DIR, 'seuils.csv');
    fs.appendFileSync(filePath, ligne, 'utf-8');
    console.log(`📝 Seuil enregistré dans CSV : TH=${seuils.tres_haut} H=${seuils.haut} B=${seuils.bas} TB=${seuils.tres_bas}`);
};

/**
 * Ajoute une ligne au fichier alarmes.csv lors d'un événement d'alarme
 * @param {Object} alarme - Objet décrivant l'alarme
 * @param {string} alarme.type_evenement - 'declenchement' ou 'disparition'
 * @param {string} alarme.niveau - Niveau d'alarme ('tres_haut', 'haut', 'bas', 'tres_bas')
 * @param {string} alarme.message - Message descriptif
 * @param {number} alarme.temperature - Température au moment de l'événement
 */
export const appendAlarmeCSV = (alarme) => {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const heure = now.toLocaleTimeString('fr-FR');

    const ligne = `${date};${heure};${alarme.type_evenement};${alarme.niveau};${alarme.message};${alarme.temperature}\r\n`;

    const filePath = path.join(CSV_DIR, 'alarmes.csv');
    fs.appendFileSync(filePath, ligne, 'utf-8');
    console.log(`📝 Alarme enregistrée dans CSV : [${alarme.type_evenement}] ${alarme.niveau} - ${alarme.message}`);
};
