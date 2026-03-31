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

Vous avez **deux méthodes** pour lancer le projet : avec Docker (recommandé et très simple) ou classiquement sur Windows.

### Méthode 1 : Lancement Automatique avec Docker (Recommandé)
C'est la méthode idéale si vous ne voulez rien installer à part Docker. La base de données MariaDB est gérée de manière invisible.

1. **Prérequis** : Avoir installé et démarré **Docker Desktop** sur votre machine.
2. Assurez-vous d'être connecté au **réseau WiFi de l'API** (pour que le logiciel puisse joindre l'automate sur `172.16.1.24`).
3. Double-cliquez simplement sur le fichier fourni :
   ▶️ **`LANCER_DOCKER.bat`**
4. Ouvrez votre navigateur sur : [http://localhost:3000](http://localhost:3000)

*(Détail caché : La base de données interne tourne sur le port 3307 au cas où vous auriez déjà une BDD locale sur le port 3306. Si vous utilisez un terminal Linux/Mac : `docker-compose up --build -d`).*

### Méthode 2 : Lancement Classique (Sans Docker)
Utile si vous préférez utiliser un MariaDB local (ex: XAMPP) et Node.js directement sur Windows :

1. **Prérequis** :
   - Disposer d'une base MariaDB locale active (port 3306).
   - Avoir **Node.js** installé.
   - Être connecté au **réseau WiFi de l'API**.

2. **Configuration BDD** :
   Modifiez si besoin le fichier `.env` à la racine (par défaut : BDD `tp2_maintenance_z4`, utilisateur `root`, pas de mot de passe).

3. **Démarrage** :
   Double-cliquez sur le fichier :
   ▶️ **`LANCER.bat`**
   *(Ou tapez dans un terminal : `cd backend && npm install && npm start`).*

4. **Accès** : [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration Automate M580 (Paramètres modifiables via le dashboard)

| Description | Type Modbus | Adresse | Remarque |
|---|---|---|---|
| **IP de l'automate** | Réseau TCP | `172.16.1.24` | Port 502 |
| **Température** | Holding Register | `%MW706` | Décodage Little Endian Word Swap (%MF706) |
| **Cycle Auto Zone 3** | Holding Register | `%MW704` | `0` = Arrêté, non nul / positif = Lancé |
| **Voyant Rouge** | Coil / Bit | `%M702` | Clignote si alarme très haute, fixe si alarme haute |
| **Voyant Orange** | Coil / Bit | `%M701` | Fixe si plage normale |
| **Voyant Vert** | Coil / Bit | `%M703` | Clignote si alarme très basse, fixe si alarme basse |
| **Heartbeat (optionnel)**| Coil / Bit | `%M700` | Bascule à 1Hz pour signaler à l'API que la supervision est active |

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
