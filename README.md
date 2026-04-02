# 🏭 TP2 - Maintenance Connectée - Zone 3
**Projet de supervision industrielle pour la Mini-Usine (Zone 3)**

**Auteurs :** MORON Axel & RAHARINJATOVO Lucien (Groupe Z4)
**Client :** M. Olivier BOUZY (UniLaSalle Amiens)

---

## 📋 Contexte & Objectifs

Ce projet met en œuvre une application de supervision temps réel liée à un capteur de température sans fil (Banner QM42VT1 + passerelle DX80N2Q45VT) pour détecter un échauffement anormal dans la Zone 3 de la Mini-Usine.

### Fonctionnalités réalisées

1. **Lecture Modbus TCP** depuis l'automate M580 (`172.16.1.24`) :
   - Température sur `%MF706` (float 32 bits, 2 registres holding FC03).
   - Cycle auto Zone 3 sur `%MW704` (holding register FC03 — `0` = ARRÊTÉ, non nul = LANCÉ).

2. **Historisation en base de données MariaDB** (schéma relationnel) :
   - Table `capteurs` : référentiel des capteurs (température, cycle auto).
   - Table `mesures` : toutes les valeurs lues, liées à leur capteur (`id_capteur` FK).
   - Table `seuil` : historique de chaque modification des 4 seuils, liée au capteur température.
   - Table `alarmes` : journal de tous les déclenchements et disparitions d'alarmes.
   - Export CSV de traçabilité (`seuils.csv`, `alarmes.csv`).

3. **Interface Web temps réel** (`http://localhost:6777`) :
   - Affichage numérique et courbe de température (Chart.js).
   - État du cycle automatique Zone 3.
   - Colonne lumineuse virtuelle (rouge/orange/vert).
   - Configuration dynamique des 4 seuils (Très Haut, Haut, Bas, Très Bas).
   - Journal des alarmes : 20 par page, pagination, suppression individuelle.

4. **Alarmes Process** (4 niveaux) :
   - `> Seuil très haut` → Voyant rouge clignotant (`%M702`)
   - `> Seuil haut` → Voyant rouge fixe (`%M702`)
   - Plage normale → Voyant orange fixe (`%M701`)
   - `< Seuil bas` → Voyant vert fixe (`%M703`)
   - `< Seuil très bas` → Voyant vert clignotant (`%M703`)

5. **Maintenance Prédictive** (régression linéaire) :
   - Estimation du temps avant franchissement d'un seuil critique.
   - Alerte active si le seuil est déjà dépassé (message + indicateur visuel).
   - Actif uniquement si le cycle auto est lancé.

6. **Connexion Power BI** :
   - Connecteur MySQL sur `localhost:6778`, base `tp2_maintenance_z4`.
   - Tables importables : `capteurs`, `mesures`, `seuil`, `alarmes`.
   - Relations : `mesures[id_capteur]` → `capteurs[id]`, `seuil[id_capteur]` → `capteurs[id]`.

---

## 🛠️ Architecture Technique

| Couche | Technologie |
|---|---|
| Backend | Node.js 18 + Express |
| ORM | Sequelize 6 (driver `mysql2`) |
| Base de données | MariaDB 10.6 (conteneur Docker) |
| Protocole industriel | Modbus TCP (`modbus-serial`) |
| Frontend | HTML5 / CSS3 / JavaScript Vanilla + Chart.js |
| Conteneurisation | Docker + Docker Compose |

---

## 🚀 Lancement avec Docker (méthode recommandée)

**Prérequis :** Docker Desktop installé et démarré.

```bash
# Premier lancement (ou après modification du code)
docker compose down -v
docker compose build --no-cache
docker compose up

# Relance normale (sans changement de code)
docker compose up
```

**Accès :**
- Application web : [http://localhost:6777](http://localhost:6777)
- MariaDB (Power BI / DBeaver) : `localhost:6778`

> ⚠️ Le `-v` au premier lancement supprime l'ancien volume pour recréer les tables proprement à partir de `init.sql`.

---

## ⚙️ Configuration Modbus (automate M580)

| Description | Type | Adresse | Remarque |
|---|---|---|---|
| IP de l'automate | TCP | `172.16.1.24:502` | Réseau WiFi API |
| Température | Holding Register FC03 | `%MF706` (MW706+MW707) | Float 32 bits, Little Endian Word Swap |
| Cycle Auto Zone 3 | Holding Register FC03 | `%MW704` | 0 = ARRÊTÉ, ≠0 = LANCÉ |
| Voyant Rouge | Coil FC05 | `%M702` | Clignotant = très haut, fixe = haut |
| Voyant Orange | Coil FC05 | `%M701` | Fixe = plage normale |
| Voyant Vert | Coil FC05 | `%M703` | Clignotant = très bas, fixe = bas |
| Heartbeat | Coil FC05 | `%M700` | Bascule 1 Hz — signale la présence de la supervision |

---

## 🗄️ Schéma de la base de données

```
capteurs (id, designation)
    │                  │
    ▼                  ▼
mesures              seuil
(id,                 (id,
 valeur,              tres_haut, haut,
 id_capteur FK,       bas, tres_bas,
 temps)               id_capteur FK,
                      temps)

alarmes  [indépendante]
(id, type_evenement, niveau, message, temperature, timestamp)
```

**Capteurs seedés au démarrage :**
- `id=1` → Température Zone 3
- `id=2` → Cycle Auto Zone 3

---

## 📂 Organisation du code

```
tp2-moron-axel/
├── backend/
│   ├── config/
│   │   └── db.js               # Connexion Sequelize (mysql2)
│   ├── models/
│   │   ├── Capteur.js           # Table capteurs
│   │   ├── Mesure.js            # Table mesures (FK → capteurs)
│   │   ├── Seuil.js             # Table seuil   (FK → capteurs)
│   │   └── Alarme.js            # Table alarmes
│   ├── routes/
│   │   └── api.js               # Endpoints REST (GET, POST, DELETE)
│   ├── services/
│   │   ├── modbusService.js     # Lecture/écriture Modbus TCP
│   │   ├── scheduler.js         # Cycle de lecture périodique (cron)
│   │   ├── alarmService.js      # Évaluation des alarmes
│   │   ├── predictiveService.js # Régression linéaire prédictive
│   │   └── csvService.js        # Export CSV traçabilité
│   ├── Dockerfile
│   ├── server.js                # Point d'entrée Express
│   └── package.json
├── frontend/
│   ├── index.html               # Dashboard web complet
│   └── style.css
├── init.sql                     # Initialisation BDD au premier démarrage
├── docker-compose.yml           # Orchestration des conteneurs
├── .env                         # Variables d'environnement (ne pas commiter)
├── .env.example                 # Template des variables
└── README.md
```

---

## 🔌 Variables d'environnement (`.env`)

| Variable | Valeur par défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port interne du serveur Node.js |
| `DB_HOST` | `db` | Hôte MariaDB (nom du service Docker) |
| `DB_PORT` | `3306` | Port interne MariaDB |
| `DB_USER` | `root` | Utilisateur MariaDB |
| `DB_PASSWORD` | `root` | Mot de passe MariaDB |
| `DB_NAME` | `tp2_maintenance_z4` | Nom de la base de données |
| `MODBUS_IP` | `172.16.1.24` | IP de l'automate M580 |
| `MODBUS_PORT` | `502` | Port Modbus TCP |
| `REGISTRE_TEMPERATURE` | `706` | Registre holding %MF706 |
| `REGISTRE_CYCLE_AUTO` | `704` | Registre holding %MW704 |
| `FREQUENCE_LECTURE` | `3` | Fréquence de lecture en secondes |
