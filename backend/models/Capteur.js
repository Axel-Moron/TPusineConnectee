// =============================================================================
// Modèle Capteur - Table centrale de référence des capteurs du système
//
// Capteurs présents dans l'installation Zone 3 :
//   id=1  Température Zone 3  (capteur Banner QM42VT1 via %MF706)
//   id=2  Cycle Auto Zone 3   (info TOR automate M580 via %MW704)
//
// Cette table sert de clé étrangère pour MESURES et SEUIL.
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Capteur = sequelize.define("Capteur", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Nom lisible du capteur (ex: "Température Zone 3")
    designation: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "Nom du capteur ou de la grandeur mesurée"
    }
}, {
    tableName: "capteurs",
    timestamps: false
});

export default Capteur;
