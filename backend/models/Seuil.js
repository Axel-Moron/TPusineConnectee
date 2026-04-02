// =============================================================================
// Modèle Seuil - Historisation des seuils de température par capteur
//
// Chaque modification des seuils est enregistrée (traçabilité).
// Les 4 niveaux de seuil permettent une gestion fine des alarmes :
//   tres_haut (Max critique) > haut (Max attention) > bas (Min attention) > tres_bas (Min critique)
//
// Relation : SEUIL N→1 CAPTEURS (seulement le capteur température, id=1)
// =============================================================================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Capteur from "./Capteur.js";

const Seuil = sequelize.define("Seuil", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Seuil critique supérieur (Max)
    tres_haut: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil très haut / Max critique (°C) — alarme niveau rouge"
    },
    // Seuil d'attention supérieur
    haut: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil haut / Max attention (°C) — alarme niveau orange"
    },
    // Seuil d'attention inférieur
    bas: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil bas / Min attention (°C) — alarme niveau vert"
    },
    // Seuil critique inférieur (Min)
    tres_bas: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Seuil très bas / Min critique (°C) — alarme niveau rouge"
    },
    // Clé étrangère vers capteurs (toujours id=1 : capteur température)
    id_capteur: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: { model: 'capteurs', key: 'id' },
        comment: "Capteur concerné par ces seuils (FK → capteurs.id)"
    },
    // Horodatage de la modification
    temps: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Date et heure de la modification des seuils"
    }
}, {
    tableName: "seuil",
    timestamps: false
});

// Association N→1 : un seuil appartient à un capteur
Seuil.belongsTo(Capteur, { foreignKey: 'id_capteur', as: 'capteur' });
Capteur.hasMany(Seuil,   { foreignKey: 'id_capteur', as: 'seuils' });

export default Seuil;
