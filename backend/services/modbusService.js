// =============================================================================
// Service Modbus TCP - Communication avec l'automate API M580 Schneider
//
// Ce service gère la communication via le protocole Modbus TCP/IP :
//   - Lecture de la température (float 32 bits %MF706, 2 registres MW)
//   - Lecture de l'état du cycle automatique Zone 3 (%M640, coil)
//   - Écriture de la colonne lumineuse vers l'armoire API (coils FC05)
//   - Heartbeat : écriture périodique sur %MW700 pour signaler la présence
//
// Architecture :
//   PC (Node.js) ←→ Modbus TCP ←→ API M580 (172.16.1.24:502)
// =============================================================================
import ModbusRTU from "modbus-serial";

// --- Configuration Modbus (modifiable dynamiquement via l'API /api/config) ---
let MODBUS_IP = process.env.MODBUS_IP || "172.16.1.24";
let MODBUS_PORT = parseInt(process.env.MODBUS_PORT) || 502;
let REG_TEMPERATURE = parseInt(process.env.REGISTRE_TEMPERATURE) || 706;
let REG_CYCLE_AUTO = parseInt(process.env.REGISTRE_CYCLE_AUTO) || 640;

// --- Configuration colonne lumineuse (écriture coils vers l'automate) ---
let COLONNE_ENABLED = true;
let COIL_ROUGE = parseInt(process.env.COIL_ROUGE) || 702;
let COIL_ORANGE = parseInt(process.env.COIL_ORANGE) || 701;
let COIL_VERT = parseInt(process.env.COIL_VERT) || 703;

// --- Configuration heartbeat ---
let HEARTBEAT_ENABLED = true;
let REG_HEARTBEAT = parseInt(process.env.REGISTRE_HEARTBEAT) || 700;
let HEARTBEAT_FREQ = parseInt(process.env.HEARTBEAT_FREQ) || 1000; // en ms (1Hz = 1000ms)
let heartbeatInterval = null;
let heartbeatState = false; // bascule 0/1 à chaque tick

/**
 * Retourne la configuration Modbus actuelle
 */
export const getModbusConfig = () => ({
    modbusIp: MODBUS_IP,
    modbusPort: MODBUS_PORT,
    registreTemperature: REG_TEMPERATURE,
    registreCycleAuto: REG_CYCLE_AUTO,
    colonneEnabled: COLONNE_ENABLED,
    coilRouge: COIL_ROUGE,
    coilOrange: COIL_ORANGE,
    coilVert: COIL_VERT,
    heartbeatEnabled: HEARTBEAT_ENABLED,
    registreHeartbeat: REG_HEARTBEAT,
    heartbeatFreq: HEARTBEAT_FREQ
});

/**
 * Met à jour la configuration Modbus à chaud
 * @param {Object} config - Nouvelles valeurs de configuration
 */
export const setModbusConfig = (config) => {
    if (config.modbusIp) MODBUS_IP = config.modbusIp;
    if (config.modbusPort) MODBUS_PORT = parseInt(config.modbusPort);
    if (config.registreTemperature !== undefined) REG_TEMPERATURE = parseInt(config.registreTemperature);
    if (config.registreCycleAuto !== undefined) REG_CYCLE_AUTO = parseInt(config.registreCycleAuto);
    if (config.colonneEnabled !== undefined) COLONNE_ENABLED = config.colonneEnabled;
    if (config.coilRouge !== undefined) COIL_ROUGE = parseInt(config.coilRouge);
    if (config.coilOrange !== undefined) COIL_ORANGE = parseInt(config.coilOrange);
    if (config.coilVert !== undefined) COIL_VERT = parseInt(config.coilVert);
    if (config.heartbeatEnabled !== undefined) {
        HEARTBEAT_ENABLED = config.heartbeatEnabled;
        if (HEARTBEAT_ENABLED) startHeartbeat();
        else stopHeartbeat();
    }
    if (config.registreHeartbeat !== undefined) REG_HEARTBEAT = parseInt(config.registreHeartbeat);
    if (config.heartbeatFreq !== undefined) {
        HEARTBEAT_FREQ = parseInt(config.heartbeatFreq);
        if (HEARTBEAT_ENABLED) { stopHeartbeat(); startHeartbeat(); }
    }
    console.log(`⚙️ Configuration Modbus mise à jour : IP=${MODBUS_IP}:${MODBUS_PORT}, Colonne=${COLONNE_ENABLED ? 'ON' : 'OFF'}, Heartbeat=${HEARTBEAT_ENABLED ? 'ON' : 'OFF'}`);
};

// --- Mode simulation (pour tester sans automate) ---
let MODE_SIMULATION = false;
let simulatedTemp = 25.0;
let simulatedTrend = 0.3;

/**
 * Active ou désactive le mode simulation
 */
export const setSimulationMode = (isSimu) => {
    MODE_SIMULATION = isSimu;
    console.log(`🔄 Mode changé : ${MODE_SIMULATION ? "SIMULATION" : "RÉEL (Modbus TCP)"}`);
    // Arrêter/démarrer le heartbeat selon le mode
    if (MODE_SIMULATION) stopHeartbeat();
    else if (HEARTBEAT_ENABLED) startHeartbeat();
};

export const getSimulationMode = () => MODE_SIMULATION;

/**
 * Helper : exécute une opération Modbus avec timeout global
 */
const withTimeout = (promise, ms = 5000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout global Modbus')), ms))
    ]);
};

/**
 * Lecture de la température via Modbus TCP
 * Lit 2 registres consécutifs (%MW706 + %MW707) = float 32 bits (%MF706)
 * Schneider M580 : Little Endian Word Swap (CDAB)
 */
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

        // Lecture de 2 registres consécutifs (%MW706 + %MW707) = float 32 bits (%MF706)
        const data = await client.readHoldingRegisters(REG_TEMPERATURE, 2);
        const raw0 = data.data[0]; // MW706 (poids faible)
        const raw1 = data.data[1]; // MW707 (poids fort)

        // Conversion de 2 x 16 bits → float IEEE 754
        // Schneider M580 : Little Endian Word Swap (CDAB) → MW707 en premier
        const buf = Buffer.alloc(4);
        buf.writeUInt16BE(raw1, 0); // poids fort en premier
        buf.writeUInt16BE(raw0, 2); // poids faible ensuite
        const temperature = parseFloat(buf.readFloatBE(0).toFixed(1));

        console.log(`✅ Température lue : ${temperature}°C (registres bruts: ${raw0}, ${raw1})`);
        return temperature;

    } catch (error) {
        if (error.code !== 'ETIMEDOUT' && error.message !== 'Timeout global Modbus') {
            console.error(`❌ Erreur Modbus lecture température :`, error.message);
        }
        return null;
    } finally {
        try { client.close(() => { }); } catch (e) { }
    }
};

/**
 * Lecture de l'état du cycle automatique Zone 3 via Modbus TCP
 * Lit le coil %M640 (FC01)
 */
export const readCycleAuto = async () => {
    if (MODE_SIMULATION) return true;

    const client = new ModbusRTU();
    try {
        await withTimeout(client.connectTCP(MODBUS_IP, { port: MODBUS_PORT }));
        client.setID(1);
        client.setTimeout(3000);

        const data = await client.readCoils(REG_CYCLE_AUTO, 1);
        // Le sujet indique : "cycle auto lancé sur la zone 3 correspond au bit %M640=0"
        const cycleActif = (data.data[0] === false);

        console.log(`✅ Cycle auto Zone 3 : ${cycleActif ? "LANCÉ" : "ARRÊTÉ"}`);
        return cycleActif;

    } catch (error) {
        if (error.code !== 'ETIMEDOUT' && error.message !== 'Timeout global Modbus') {
            console.error(`❌ Erreur Modbus lecture cycle auto :`, error.message);
        }
        return null;
    } finally {
        try { client.close(() => { }); } catch (e) { }
    }
};

/**
 * Écriture des voyants de la colonne lumineuse vers l'automate via Modbus TCP
 * Utilise la fonction Modbus 05 (Write Single Coil) pour chaque voyant
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
        try { client.close(() => { }); } catch (e) { }
    }
};

// =============================================================================
// Heartbeat — Écriture périodique sur %MW700
// Bascule la valeur entre 0 et 1 à la fréquence configurée (1Hz par défaut)
// Permet à l'automate de détecter que le PC de supervision est actif
// =============================================================================
const writeHeartbeat = async () => {
    const client = new ModbusRTU();
    try {
        await withTimeout(client.connectTCP(MODBUS_IP, { port: MODBUS_PORT }), 2000);
        client.setID(1);
        client.setTimeout(2000);

        heartbeatState = !heartbeatState;
        await client.writeRegister(REG_HEARTBEAT, heartbeatState ? 1 : 0);

    } catch (error) {
        // Silencieux pour ne pas spammer les logs
    } finally {
        try { client.close(() => { }); } catch (e) { }
    }
};

/**
 * Démarre le heartbeat à la fréquence configurée
 */
export const startHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (MODE_SIMULATION || !HEARTBEAT_ENABLED) return;
    heartbeatInterval = setInterval(writeHeartbeat, HEARTBEAT_FREQ);
    console.log(`💓 Heartbeat démarré sur %MW${REG_HEARTBEAT} à ${HEARTBEAT_FREQ}ms`);
};

/**
 * Arrête le heartbeat
 */
export const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log(`💓 Heartbeat arrêté`);
    }
};
