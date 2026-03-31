# 🏭 TP2 - Maintenance Connectée - Zone 3
**Projet de supervision industrielle pour la Mini-Usine (Zone 3)**

**Auteurs :** MORON Axel & RAHARINJATOVO Lucien (Groupe Z4)
**Client :** M. Olivier BOUZY (UniLaSalle Amiens)

---

## 📋 Contexte & Objectifs du Cahier des Charges

Ce projet met en œuvre une carte de contrôle liée à un capteur de température sans fil (Banner QM42VT1 + passerelle DX80N2Q45VT) pour détecter un échauffement anormal dans la Zone 3 de la Mini-Usine.

### Fonctionnalités complètes réalisées selon le cahier des charges :
1. **Lecture Modbus TCP** : Récupération des données depuis l'automate M580 (IP `172.16.1.24`).
   - Température sur `%MF706` (Lecture Float 32 bits, 2 registres).
   - "Cycle auto Zone 3 lancé" sur `%M640` (**Logique inversée : `0` = LANCÉ** selon l'énoncé).
2. **Historisation (Base de données locale MariaDB + CSV)** :
   - Historisation des températures et état du cycle (`Mesures`).
   - Historisation des changements de seuils dans la BDD et dans `seuils.csv`.
   - Historisation des déclenchements d'alarmes dans la BDD et dans `alarmes.csv`.
3. **Interface Web temps réel** :
   - Visualisation de l'état du cycle auto.
   - Courbe dynamique de la température (Highcharts/Chart.js) et affichage numérique.
   - Configuration dynamique des 4 seuils de détection (Très Haut, Haut, Bas, Très Bas).
4. **Maintenance Conditionnelle & Alarmes Process** :
   - Alarme **Niveau critique** : `> Seuil très haut` ➔ Voyant rouge clignotant (`%M702`).
   - Alarme **Attention** : `> Seuil haut` ➔ Voyant rouge fixe (`%M702`).
   - Alarme **Attention** : `< Seuil bas` ➔ Voyant vert fixe (`%M703`).
   - Alarme **Niveau critique** : `< Seuil très bas` ➔ Voyant vert clignotant (`%M703`).
   - **Plage normale** : Entre Bas et Haut ➔ Aucun message, voyant orange fixe (`%M701`).
5. **Indicateurs de Maintenance Prédictive** :
   Calcul en direct de la pente (régression linéaire) pour générer des messages d'alerte anticipés lorsque le cycle auto est lancé :
   - Risque d'atteinte du seuil (très haut ou très bas) dans X secondes.
   - Sortie du seuil (haut ou bas) dans X secondes.
6. **Fichier PowerBI** :
   Liaison PowerBI configurée sur la base de données `tp2_maintenance_z4` (fichier `.pbix` fourni séparément).

---

## 🛠️ Architecture Technique

- **Backend** : Node.js avec le framework Express.
- **Protocole Industriel** : `modbus-serial` (Modbus TCP).
- **Frontend** : HTML5, CSS3, JavaScript Vanilla + API REST.
- **Base de données** : MariaDB (gérée par `Sequelize` ORM).

---

## 🚀 Installation & Lancement Rapide

1. **Prérequis** :
   - Disposer d'une base de données MariaDB (WAMP/XAMPP ou Docker).
   - Avoir Node.js installé.
   - Le PC doit être connecté au **réseau WiFi de l'API**.

2. **Configuration** :
   Copiez le fichier de configuration :
   ```bash
   cp .env.example .env
   ```
   Répétez vos identifiants SQL si nécessaire (par défaut : `root` sans mot de passe, DB `tp2_maintenance_z4`).

3. **Démarrage** :
   - Installez les dépendances : `npm install`
   - Démarrez l'application :
   ```bash
   LANCER.bat
   ```
   *(Ou manuellement : `node backend/server.js`)*

4. **Accès** :
   - Dashboard de supervision : [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration Automate M580 (Paramètres modifiables via le dashboard)

| Description | Type Modbus | Adresse | Remarque |
|---|---|---|---|
| **IP de l'automate** | Réseau TCP | `172.16.1.24` | Port 502 |
| **Température** | Holding Register | `%MF706` | Décodage Little Endian Word Swap |
| **Cycle Auto Zone 3** | Coil / Bit | `%M640` | `0` = Vrai / Lancé, `1` = Arrêté |
| **Voyant Rouge** | Coil / Bit | `%M702` | |
| **Voyant Orange** | Coil / Bit | `%M701` | |
| **Voyant Vert** | Coil / Bit | `%M703` | |
| **Heartbeat (optionnel)**| Holding Register | `%MW700` | Signale à l'API que la supervision est active à 1Hz |

---

## 📂 Organisation du code

```text
/
├── backend/
│   ├── config/       # Connexion à la base de données
│   ├── models/       # Tables BDD (Mesures, Seuils, Alarmes)
│   ├── routes/       # API REST pour le Frontend
│   └── services/     # Logiques Modbus, Prédictif, Alarmes, CSV
│
├── frontend/         # Dashboard Web (index.html, styles.css)
│
├── .env.example      # Template des variables d'environnement
├── README.md         # Ce document !
└── setup.sql         # Script optionnel de création de compte SQL
```
