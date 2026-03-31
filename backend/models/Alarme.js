// =============================================================================
// Modèle Alarme - Historisation des déclenchements et disparitions d'alarmes
// Chaque changement d'état d'alarme est enregistré pour traçabilité (BDD + CSV)
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Alarme = sequelize.define("Alarme", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Type d'événement : 'declenchement' ou 'disparition'
    type_evenement: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "Type : 'declenchement' (apparition) ou 'disparition' (retour normal)"
    },
    // Niveau de l'alarme : 'tres_haut', 'haut', 'normal', 'bas', 'tres_bas'
    niveau: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "Niveau d'alarme associé"
    },
    // Message descriptif de l'alarme
    message: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Message affiché à l'opérateur"
    },
    // Température au moment de l'événement
    temperature: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: "Température mesurée au moment de l'alarme (°C)"
    },
    // Horodatage de l'événement
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Date et heure de l'événement"
    }
}, {
    tableName: "alarmes",      // Nom de la table en BDD
    timestamps: false           // Pas de colonnes automatiques
});

export default Alarme;
