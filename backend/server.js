// =============================================================================
// Serveur principal - TP2 Maintenance Connectée
// Groupe Z4 : MORON Axel & RAHARINJATOVO Lucien
//
// Ce serveur Node.js + Express gère :
//   - La communication Modbus TCP avec l'automate API M580 (172.16.1.23)
//   - L'historisation des mesures en base de données MariaDB
//   - L'API REST pour l'interface web de supervision
//   - La gestion des alarmes et des indicateurs prédictifs
//   - La génération de fichiers CSV pour la traçabilité
//
// Architecture :
//   Frontend (HTML/CSS/JS) ←→ Backend (Express API) ←→ MariaDB
//                                     ↕
//                           Modbus TCP (automate M580)
// =============================================================================
import 'dotenv/config';
import express from "express";
import cors from "cors";
import * as mariadb from "mariadb";
import sequelize from "./config/db.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Import des modèles Sequelize (créent les tables en BDD automatiquement)
import Mesure from "./models/Mesure.js";
import Seuil from "./models/Seuil.js";
import Alarme from "./models/Alarme.js";

// Import des routes API
import apiRoutes from "./routes/api.js";

// Import des services
import { initScheduler } from "./services/scheduler.js";
import { initCSVFiles } from "./services/csvService.js";
import { startHeartbeat } from "./services/modbusService.js";

// --- Configuration Express ---
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Crée automatiquement la base de données si elle n'existe pas
 * Se connecte en tant que root pour exécuter le CREATE DATABASE
 */
async function autoConfigDB() {
    let conn;
    try {
        // Connexion directe à MariaDB (sans préciser de base de données)
        conn = await mariadb.createConnection({
            host: process.env.DB_HOST || "127.0.0.1",
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "",
            allowPublicKeyRetrieval: true,
            restrictedAuth: 'mysql_native_password,client_ed25519,caching_sha2_password'
        });

        // Création de la base de données si elle n'existe pas
        const dbName = process.env.DB_NAME || "tp2_maintenance_z4";
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Base de données '${dbName}' prête`);

    } catch (err) {
        console.error("❌ Erreur configuration BDD :", err.message);
    } finally {
        if (conn) conn.end();
    }
}

// --- Middlewares Express ---
app.use(cors({ origin: true, credentials: true }));   // Autorise les requêtes cross-origin
app.use(express.json());                                // Parse le JSON dans les requêtes

// --- Serveur de fichiers statiques (Frontend) ---
// En Docker : le dossier frontend est monté dans /app/frontend
// En local : le dossier frontend est à ../frontend (un niveau au-dessus du backend)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// --- Routes API ---
app.use("/api", apiRoutes);

// --- Route par défaut : redirige vers le frontend ---
app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// =============================================================================
// Démarrage du serveur
// =============================================================================
const startServer = async () => {
    console.log("=".repeat(60));
    console.log("  TP2 - Maintenance Connectée - Zone 3");
    console.log("  Groupe Z4 : MORON & RAHARINJATOVO");
    console.log("=".repeat(60));

    // 1. Configuration automatique de la base de données
    await autoConfigDB();

    // 2. Synchronisation des modèles Sequelize (crée/met à jour les tables)
    await sequelize.sync({ alter: true });
    console.log("✅ Tables BDD synchronisées (mesures, seuils, alarmes)");

    // 3. Initialisation des fichiers CSV
    initCSVFiles();

    // 4. Chargement des derniers seuils depuis la BDD (s'ils existent)
    const dernierSeuil = await Seuil.findOne({ order: [["timestamp", "DESC"]] });
    if (dernierSeuil) {
        const { setSeuilsActuels } = await import("./services/scheduler.js");
        setSeuilsActuels({
            tres_haut: dernierSeuil.tres_haut,
            haut: dernierSeuil.haut,
            bas: dernierSeuil.bas,
            tres_bas: dernierSeuil.tres_bas
        });
        console.log(`📊 Seuils chargés depuis BDD : TH=${dernierSeuil.tres_haut} H=${dernierSeuil.haut} B=${dernierSeuil.bas} TB=${dernierSeuil.tres_bas}`);
    }

    // 5. Démarrage du scheduler et du heartbeat
    await initScheduler();
    startHeartbeat();

    // 6. Lancement du serveur HTTP
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
        console.log(`📡 Automate Modbus : ${process.env.MODBUS_IP || "172.16.1.24"}:${process.env.MODBUS_PORT || 502}`);
        console.log(`🗄️  Base de données : ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || "tp2_maintenance_z4"}`);
        console.log("=".repeat(60));
    });
};

// Gestion des erreurs non capturées (évite les crashs silencieux)
process.on('uncaughtException', (err) => {
    console.error("❌ Exception non capturée :", err.message);
});
process.on('unhandledRejection', (err) => {
    console.error("❌ Promesse rejetée non gérée :", err?.message || err);
});

// Lancement
startServer().catch(err => {
    console.error("❌ Erreur fatale au démarrage :", err);
    process.exit(1);
});
