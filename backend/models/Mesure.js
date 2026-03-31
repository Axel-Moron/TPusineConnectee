// =============================================================================
// Modèle Mesure - Stockage des mesures par cycle de lecture
//
// Chaque enregistrement correspond à UN cycle de lecture Modbus complet :
//   - temperature  : valeur °C lue sur le capteur Banner (float %MF706)
//   - cycle_auto   : état TOR du cycle automatique Zone 3 (%MW704)
//   - timestamp    : horodatage de la lecture
//
// Structure : 1 ligne = 1 cycle (température + état cycle auto ensemble)
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Mesure = sequelize.define("Mesure", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Température mesurée en °C (null si lecture Modbus échouée ce cycle)
    temperature: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: "Température mesurée en °C (capteur Banner via %MF706)"
    },
    // État TOR du cycle automatique Zone 3 : 1=LANCÉ, 0=ARRÊTÉ (null si erreur)
    cycle_auto: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: "État TOR cycle auto Zone 3 : 1=LANCÉ, 0=ARRÊTÉ (%MW704)"
    },
    // Horodatage de la lecture
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Date et heure de la lecture Modbus"
    }
}, {
    tableName: "mesures",
    timestamps: false
});

export default Mesure;
