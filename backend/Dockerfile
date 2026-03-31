# Dockerfile pour le backend Node.js - TP2 Maintenance Connectée
FROM node:18-alpine

# Création du dossier app
WORKDIR /app

# Installation des dépendances (cache Docker optimisé)
COPY package*.json ./
RUN npm install --omit=dev

# Copie du code source backend
COPY . .

# Exposition du port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
