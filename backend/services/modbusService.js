// =============================================================================
// Service Modbus TCP - Communication avec l'automate API M580 Schneider
//
// Ce service gère la lecture des données via le protocole Modbus TCP/IP :
//   - Lecture de la température du capteur Banner (Zone 3) via holding register
//   - Lecture de l'état du cycle automatique Zone 3 via coil (%M640)
//
// L'automate (IP: 172.16.1.23) communique avec la passerelle Banner (172.16.1.65)
// qui récupère les données du capteur sans fil QM42VT1 (température + vibrations)
//
// Registres Modbus du capteur Banner (Node# = 11, base = 11 × 16 = 176) :
//   - Registre 180 = Température en °C (valeur brute / 20)
//   - Coil 640 = Bit %M640 : état du cycle auto Zone 3
// =============================================================================
import ModbusRTU from "modbus-serial";

// --- Configuration Modbus (modifiable dynamiquement via l'API /api/config) ---
let MODBUS_IP = process.env.MODBUS_IP || "172.16.1.23";
let MODBUS_PORT = parseInt(process.env.MODBUS_PORT) || 502;
let REG_TEMPERATURE = parseInt(process.env.REGISTRE_TEMPERATURE) || 180;
let DIV_TEMPERATURE = parseInt(process.env.DIVISEUR_TEMPERATURE) || 20;
let REG_CYCLE_AUTO = parseInt(process.env.REGISTRE_CYCLE_AUTO) || 640;
let PASSERELLE_IP = process.env.PASSERELLE_IP || "172.16.1.65";

// --- Configuration colonne lumineuse (écriture coils vers l'automate) ---
let COLONNE_ENABLED = true;
let COIL_ROUGE = parseInt(process.env.COIL_ROUGE) || 100;
let COIL_ORANGE = parseInt(process.env.COIL_ORANGE) || 101;
let COIL_VERT = parseInt(process.env.COIL_VERT) || 102;

/**
 * Retourne la configuration Modbus actuelle
 */
export const getModbusConfig = () => ({
    modbusIp: MODBUS_IP,
    modbusPort: MODBUS_PORT,
    passerelleIp: PASSERELLE_IP,
    registreTemperature: REG_TEMPERATURE,
    diviseurTemperature: DIV_TEMPERATURE,
    registreCycleAuto: REG_CYCLE_AUTO,
    colonneEnabled: COLONNE_ENABLED,
    coilRouge: COIL_ROUGE,
    coilOrange: COIL_ORANGE,
    coilVert: COIL_VERT
});

/**
 * Met à jour la configuration Modbus à chaud
 * @param {Object} config - Nouvelles valeurs de configuration
 */
export const setModbusConfig = (config) => {
    if (config.modbusIp) MODBUS_IP = config.modbusIp;
    if (config.modbusPort) MODBUS_PORT = parseInt(config.modbusPort);
    if (config.passerelleIp) PASSERELLE_IP = config.passerelleIp;
    if (config.registreTemperature !== undefined) REG_TEMPERATURE = parseInt(config.registreTemperature);
    if (config.diviseurTemperature !== undefined) DIV_TEMPERATURE = parseInt(config.diviseurTemperature);
    if (config.registreCycleAuto !== undefined) REG_CYCLE_AUTO = parseInt(config.registreCycleAuto);
    if (config.colonneEnabled !== undefined) COLONNE_ENABLED = config.colonneEnabled;
    if (config.coilRouge !== undefined) COIL_ROUGE = parseInt(config.coilRouge);
    if (config.coilOrange !== undefined) COIL_ORANGE = parseInt(config.coilOrange);
    if (config.coilVert !== undefined) COIL_VERT = parseInt(config.coilVert);
    console.log(`⚙️ Configuration Modbus mise à jour : IP=${MODBUS_IP}:${MODBUS_PORT}, Colonne=${COLONNE_ENABLED ? 'ON' : 'OFF'}`);
};

// --- Mode simulation (pour tester sans automate) ---
let MODE_SIMULATION = false;  // false par défaut → mode réel (Modbus TCP)
let simulatedTemp = 25.0;     // Température simulée initiale
let simulatedTrend = 0.3;     // Tendance de variation simulée

/**
 * Active ou désactive le mode simulation
 * En mode simulation, les valeurs sont générées aléatoirement
 * En mode réel, les valeurs sont lues depuis l'automate via Modbus TCP
 * @param {boolean} isSimu - true pour simulation, false pour mode réel
 */
export const setSimulationMode = (isSimu) => {
    MODE_SIMULATION = isSimu;
    console.log(`🔄 Mode changé : ${MODE_SIMULATION ? "SIMULATION" : "RÉEL (Modbus TCP)"}`);
};

/**
 * Retourne l'état actuel du mode (simulation ou réel)
 * @returns {boolean} true si en mode simulation
 */
export const getSimulationMode = () => MODE_SIMULATION;

/**
 * Lecture de la température du capteur Banner via Modbus TCP
 *
 * En mode RÉEL :
 *   - Connexion TCP à l'automate M580 (172.16.1.23:502)
 *   - Lecture du holding register 180 (fonction Modbus 03)
 *   - Conversion : température_°C = valeur_registre / 20
 *
 * En mode SIMULATION :
 *   - Génère une température réaliste avec variation progressive
 *   - Utile pour tester l'interface sans connexion à l'automate
 *
 * @returns {number|null} Température en °C ou null en cas d'erreur
 */
/**
 * Helper : exécute une opération Modbus avec timeout global
 * Évite les blocages si l'automate ne répond pas du tout
 */
const withTimeout = (promise, ms = 5000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout global Modbus')), ms))
    ]);
};

export const readTemperature = async () => {
    if (MODE_SIMULATION) {
        simulatedTemp += simulatedTrend + (Math.random() - 0.5) * 0.5;
        if (simulatedTemp > 45) simulatedTrend = -0.3;
        if (simulatedTemp < 15) simulatedTrend = 0.3;
        return parseFloat(simulatedTemp.toFixed(1));
    }

    const client = new ModbusRTU();
    try {
        await withTimeout(client.connectTCP(MODBUS_IP, { port: MODBUS_PORT }));
        client.setID(1);
        client.setTimeout(3000);

        const data = await client.readHoldingRegisters(REG_TEMPERATURE, 1);
        const rawValue = data.data[0];
        const temperature = rawValue / DIV_TEMPERATURE;

        console.log(`✅ Température lue : ${temperature}°C (registre brut: ${rawValue})`);
        return temperature;

    } catch (error) {
        if (error.code !== 'ETIMEDOUT' && error.message !== 'Timeout global Modbus') {
            console.error(`❌ Erreur Modbus lecture température :`, error.message);
        }
        return null;
    } finally {
        try { client.close(() => {}); } catch (e) { }
    }
};

/**
 * Lecture de l'état du cycle automatique Zone 3 via Modbus TCP
 *
 * En mode RÉEL :
 *   - Lecture du coil %M640 (fonction Modbus 01 : Read Coils)
 *   - Si %M640 = 1 → cycle auto lancé
 *   - Si %M640 = 0 → cycle auto arrêté
 *
 * En mode SIMULATION :
 *   - Retourne toujours 1 (cycle auto actif) pour les tests
 *
 * @returns {boolean|null} true si cycle auto actif, false sinon, null en cas d'erreur
 */
export const readCycleAuto = async () => {
    if (MODE_SIMULATION) {
        return true;
    }

    const client = new ModbusRTU();
    try {
        await withTimeout(client.connectTCP(MODBUS_IP, { port: MODBUS_PORT }));
        client.setID(1);
        client.setTimeout(3000);

        const data = await client.readCoils(REG_CYCLE_AUTO, 1);
        const cycleActif = data.data[0];

        console.log(`✅ Cycle auto Zone 3 : ${cycleActif ? "LANCÉ" : "ARRÊTÉ"}`);
        return cycleActif;

    } catch (error) {
        if (error.code !== 'ETIMEDOUT' && error.message !== 'Timeout global Modbus') {
            console.error(`❌ Erreur Modbus lecture cycle auto :`, error.message);
        }
        return null;
    } finally {
        try { client.close(() => {}); } catch (e) { }
    }
};

/**
 * Écriture des voyants de la colonne lumineuse vers l'automate via Modbus TCP
 * Utilise la fonction Modbus 05 (Write Single Coil) pour chaque voyant
 *
 * @param {string} voyant - Type de voyant actif (rouge_clignotant, rouge_fixe, orange_fixe, vert_fixe, vert_clignotant)
 */
export const writeColonneLumineuse = async (voyant) => {
    if (!COLONNE_ENABLED || MODE_SIMULATION) return;

    const rouge = voyant === 'rouge_clignotant' || voyant === 'rouge_fixe';
    const orange = voyant === 'orange_fixe';
    const vert = voyant === 'vert_clignotant' || voyant === 'vert_fixe';

    const client = new ModbusRTU();
    try {
        await withTimeout(client.connectTCP(MODBUS_IP, { port: MODBUS_PORT }));
        client.setID(1);
        client.setTimeout(3000);

        await client.writeCoil(COIL_ROUGE, rouge);
        await client.writeCoil(COIL_ORANGE, orange);
        await client.writeCoil(COIL_VERT, vert);

        console.log(`💡 Colonne lumineuse : R=${rouge ? 1 : 0} O=${orange ? 1 : 0} V=${vert ? 1 : 0}`);
    } catch (error) {
        if (error.code !== 'ETIMEDOUT' && error.message !== 'Timeout global Modbus') {
            console.error(`❌ Erreur écriture colonne lumineuse :`, error.message);
        }
    } finally {
        try { client.close(() => {}); } catch (e) { }
    }
};
