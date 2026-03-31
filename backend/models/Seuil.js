// =============================================================================
// Modèle Seuil - Historisation des valeurs de seuils de température
// Chaque modification de seuil est enregistrée pour traçabilité (BDD + CSV)
// Les 4 seuils : très haut (TH), haut (H), bas (B), très bas (TB)
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Seuil = sequelize.define("Seuil", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Seuil très haut - Niveau critique supérieur
    tres_haut: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil très haut (°C) - Intervention nécessaire si dépassé"
    },
    // Seuil haut - Niveau d'attention supérieur
    haut: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil haut (°C) - Attention si dépassé"
    },
    // Seuil bas - Niveau d'attention inférieur
    bas: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil bas (°C) - Attention si en dessous"
    },
    // Seuil très bas - Niveau critique inférieur
    tres_bas: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil très bas (°C) - Intervention nécessaire si en dessous"
    },
    // Horodatage de la modification
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Date et heure de la modification des seuils"
    }
}, {
    tableName: "seuils",       // Nom de la table en BDD
    timestamps: false           // Pas de colonnes automatiques
});

export default Seuil;
