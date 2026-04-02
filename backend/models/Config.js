import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Config = sequelize.define("Config", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: 1 // Single row pattern
    },
    modbusIp: {
        type: DataTypes.STRING,
        defaultValue: "172.16.1.24"
    },
    modbusPort: {
        type: DataTypes.INTEGER,
        defaultValue: 502
    },
    registreTemperature: {
        type: DataTypes.INTEGER,
        defaultValue: 706
    },
    registreCycleAuto: {
        type: DataTypes.INTEGER,
        defaultValue: 704
    },
    frequenceLecture: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    colonneEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    coilRouge: {
        type: DataTypes.INTEGER,
        defaultValue: 702
    },
    coilOrange: {
        type: DataTypes.INTEGER,
        defaultValue: 701
    },
    coilVert: {
        type: DataTypes.INTEGER,
        defaultValue: 703
    },
    heartbeatEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    registreHeartbeat: {
        type: DataTypes.INTEGER,
        defaultValue: 700
    },
    heartbeatFreq: {
        type: DataTypes.INTEGER,
        defaultValue: 1000
    }
}, {
    tableName: "configs",
    timestamps: true
});

export default Config;
