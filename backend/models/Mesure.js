// =============================================================================
// Modèle Mesure - Stockage des mesures de température et état cycle auto
// Chaque enregistrement correspond à une lecture Modbus horodatée
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Mesure = sequelize.define("Mesure", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Type de mesure : 'temperature' ou 'cycle_auto'
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "Type de donnée : 'temperature' ou 'cycle_auto'"
    },
    // Valeur numérique de la mesure (°C pour température, 0/1 pour cycle auto)
    valeur: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Valeur mesurée (°C ou booléen 0/1)"
    },
    // Horodatage de la mesure
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Date et heure de la mesure"
    }
}, {
    tableName: "mesures",      // Nom de la table en BDD
    timestamps: false           // Pas de colonnes createdAt/updatedAt automatiques
});

export default Mesure;
