// =============================================================================
// Modèle Mesure - Stockage des mesures par capteur et par cycle de lecture
//
// Chaque enregistrement = 1 valeur lue pour 1 capteur à 1 instant donné.
//   id_capteur=1 → Température Zone 3 (°C, float)
//   id_capteur=2 → Cycle Auto Zone 3  (TOR : 1=LANCÉ, 0=ARRÊTÉ)
//
// Relation : MESURES N→1 CAPTEURS
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Capteur from "./Capteur.js";

const Mesure = sequelize.define("Mesure", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Valeur mesurée : °C pour température, 0/1 pour cycle auto
    valeur: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Valeur mesurée (°C pour température, 0/1 pour TOR cycle auto)"
    },
    // Clé étrangère vers la table capteurs
    id_capteur: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'capteurs', key: 'id' },
        comment: "Capteur source de la mesure (FK → capteurs.id)"
    },
    // Horodatage de la lecture Modbus
    temps: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Date et heure de la lecture Modbus"
    }
}, {
    tableName: "mesures",
    timestamps: false
});

// Association N→1 : une mesure appartient à un capteur
Mesure.belongsTo(Capteur, { foreignKey: 'id_capteur', as: 'capteur' });
Capteur.hasMany(Mesure,   { foreignKey: 'id_capteur', as: 'mesures' });

export default Mesure;
