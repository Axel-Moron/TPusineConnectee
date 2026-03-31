# 🏭 TP2 — Maintenance Connectée — Zone 3

> **UniLaSalle Amiens — I5PAUC 2025/2026**
> **Groupe Z4 : MORON Axel & RAHARINJATOVO Lucien**

Application web de **supervision de température en temps réel** pour la Zone 3 de la mini-usine connectée. Elle communique avec un automate **Schneider M580** via **Modbus TCP** et historise les données dans une base **MariaDB**.

---

## 📋 Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Lancement](#-lancement)
- [Utilisation avec Docker](#-utilisation-avec-docker)
- [Configuration](#-configuration)
- [Structure du projet](#-structure-du-projet)

---

## ✨ Fonctionnalités

- 📡 **Lecture Modbus TCP** — Acquisition automatique de la température depuis le capteur Banner (via l'API M580)
- 📊 **Dashboard temps réel** — Affichage de la température avec jauge visuelle et courbe Chart.js
- ⚙️ **Seuils réglables** — 4 niveaux configurables (Très Bas, Bas, Haut, Très Haut)
- 🚨 **Gestion d'alarmes** — Colonne lumineuse virtuelle (vert / orange / rouge, fixe ou clignotant)
- 🔮 **Maintenance prédictive** — Estimation du temps avant dépassement de seuil (calcul de pente)
- 🔄 **Cycle automatique** — Lecture de l'état du cycle auto Zone 3 depuis l'automate
- 📁 **Export CSV** — Traçabilité des mesures et des alarmes
- 📈 **Historique** — Consultation des mesures et des seuils passés avec graphique
- 🌗 **Mode jour / nuit** — Interface avec thème clair et sombre
- 🎮 **Mode simulation** — Test de l'application sans connexion à l'automate
- 💡 **Recopie colonne lumineuse** — Écriture des voyants vers la colonne physique de l'armoire API (via coils Modbus)

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTP      ┌───────────────────────┐    Modbus TCP    ┌──────────────┐
│   Navigateur    │◄────────────►│   Backend Node.js     │◄──────────────►│  API M580     │
│   (HTML/CSS/JS) │               │   (Express + API)     │                  │  172.16.1.23  │
└─────────────────┘               └───────────┬───────────┘                  └──────┬───────┘
                                              │                                     │
                                              │ Sequelize ORM                       │ Modbus DTM
                                              ▼                                     ▼
                                     ┌─────────────────┐                   ┌────────────────┐
                                     │    MariaDB       │                   │ Passerelle     │
                                     │ (PC hôte)       │                   │ Banner         │
                                     └─────────────────┘                   │ 172.16.1.65    │
                                                                           └────────────────┘
```

---

## 🛠️ Technologies

| Composant   | Technologie                     |
|------------|----------------------------------|
| Backend    | Node.js 18+, Express, Sequelize |
| Frontend   | HTML5, CSS3, JavaScript, Chart.js |
| BDD        | MariaDB                         |
| Protocole  | Modbus TCP (modbus-serial)       |
| Conteneur  | Docker & Docker Compose          |
| Automate   | Schneider Modicon M580           |

---

## 📦 Prérequis

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **MariaDB** installé et démarré sur le PC hôte
- Connexion au **réseau wifi API** de la mini-usine (pour le mode réel)

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Axel-Moron/TPusineConnectee.git
cd TPusineConnectee
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Éditez le fichier `.env` si nécessaire (mot de passe MariaDB, IP automate, etc.).

### 3. Configurer la base de données

Exécutez le script de configuration :

```bash
# Sous Windows :
SETUP_BDD.bat
```

Ou manuellement dans MariaDB :

```sql
CREATE DATABASE IF NOT EXISTS tp2_maintenance_z4;
```

### 4. Installer les dépendances

```bash
cd backend
npm install
```

---

## ▶️ Lancement

### Option 1 : Script automatique (Windows)

Double-cliquez sur **`LANCER.bat`** à la racine du projet. Il :
1. Vérifie la présence de Node.js
2. Installe les dépendances (`npm install`)
3. Démarre le serveur

### Option 2 : Ligne de commande

```bash
cd backend
npm start
```

Puis ouvrez votre navigateur sur **http://localhost:3000**

---

## 🐳 Utilisation avec Docker

```bash
docker compose up --build
```

L'application sera disponible sur **http://localhost:3000**

> **Note :** L'application Docker utilise `host.docker.internal` pour accéder au MariaDB installé sur le PC hôte.

---

## ⚙️ Configuration

Toute la configuration se fait via le fichier `.env` à la racine :

| Variable               | Description                                  | Valeur par défaut |
|------------------------|----------------------------------------------|-------------------|
| `PORT`                 | Port du serveur web                          | `3000`            |
| `DB_HOST`              | Hôte MariaDB                                 | `127.0.0.1`       |
| `DB_PORT`              | Port MariaDB                                 | `3306`            |
| `DB_USER`              | Utilisateur MariaDB                          | `root`            |
| `DB_PASSWORD`          | Mot de passe MariaDB                         | *(vide)*          |
| `DB_NAME`              | Nom de la base de données                    | `tp2_maintenance_z4` |
| `MODBUS_IP`            | IP de l'automate M580                        | `172.16.1.23`     |
| `MODBUS_PORT`          | Port Modbus TCP                              | `502`             |
| `REGISTRE_TEMPERATURE` | Adresse registre température                 | `180`             |
| `DIVISEUR_TEMPERATURE` | Diviseur pour conversion température         | `20`              |
| `REGISTRE_CYCLE_AUTO`  | Adresse bit cycle auto                       | `640`             |
| `FREQUENCE_LECTURE`    | Intervalle de lecture Modbus (en secondes)    | `3`               |

---

## 📂 Structure du projet

```
TPusineConnectee/
├── .env.example             # Modèle de configuration
├── .gitignore               # Fichiers ignorés par Git
├── docker-compose.yml       # Configuration Docker Compose
├── LANCER.bat               # Script de lancement rapide (Windows)
├── SETUP_BDD.bat            # Script de configuration MariaDB
├── setup.sql                # Script SQL de création de la BDD
├── README.md                # Ce fichier
│
├── backend/                 # Serveur Node.js
│   ├── server.js            # Point d'entrée du serveur Express
│   ├── package.json         # Dépendances npm
│   ├── Dockerfile           # Image Docker du backend
│   ├── .dockerignore        # Fichiers ignorés par Docker
│   ├── config/
│   │   └── db.js            # Configuration Sequelize (connexion MariaDB)
│   ├── models/
│   │   ├── Mesure.js        # Modèle Sequelize — mesures de température
│   │   ├── Seuil.js         # Modèle Sequelize — seuils d'alarme
│   │   └── Alarme.js        # Modèle Sequelize — journal des alarmes
│   ├── routes/
│   │   └── api.js           # Routes REST (/api/status, /api/seuils, etc.)
│   └── services/
│       ├── modbusService.js  # Communication Modbus TCP avec l'automate
│       ├── alarmService.js   # Logique de gestion des alarmes
│       ├── csvService.js     # Export CSV des mesures et alarmes
│       ├── predictiveService.js  # Calculs de maintenance prédictive
│       └── scheduler.js      # Planificateur de lectures périodiques
│
├── frontend/                # Interface web
│   ├── index.html           # Page principale (dashboard, historique, alarmes)
│   └── style.css            # Feuille de styles
│
└── csv/                     # Dossier CSV pour traçabilité (monté en volume Docker)
```

---

## 👥 Auteurs

- **MORON Axel**
- **RAHARINJATOVO Lucien**

Projet réalisé dans le cadre du TP2 de Maintenance Connectée — UniLaSalle Amiens, promotion I5PAUC 2025/2026.
