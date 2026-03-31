# Dockerfile pour le backend Node.js - TP2 Maintenance Connectée
FROM node:18-alpine

WORKDIR /app

# Copie des fichiers de dépendances et installation
COPY package*.json ./
RUN npm install

# Copie du code source backend
COPY . .

EXPOSE 3000

# Démarrage du serveur
CMD ["npm", "start"]
