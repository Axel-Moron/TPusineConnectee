// =============================================================================
// Configuration de la connexion à la base de données MariaDB
// Utilise Sequelize comme ORM pour faciliter les opérations CRUD
// =============================================================================
import { Sequelize } from 'sequelize';
import 'dotenv/config';

// Création de l'instance Sequelize avec les paramètres du fichier .env
const sequelize = new Sequelize({
    dialect: 'mysql',                                      // mysql2 driver, compatible MariaDB
    host: process.env.DB_HOST || "127.0.0.1",             // Adresse du serveur MariaDB
    port: parseInt(process.env.DB_PORT) || 3306,          // Port MariaDB (3306 par défaut)
    username: process.env.DB_USER || "root",              // Utilisateur MariaDB
    password: process.env.DB_PASSWORD || "",               // Mot de passe MariaDB
    database: process.env.DB_NAME || "tp2_maintenance_z4", // Nom de la base de données
    logging: false,                                        // Désactive les logs SQL en console
    dialectOptions: {
        connectTimeout: 10000                              // Timeout de connexion : 10 secondes
    }
});

export default sequelize;
