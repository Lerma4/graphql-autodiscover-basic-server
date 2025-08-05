# Usa l'immagine ufficiale di Node.js come base
FROM node:18-alpine

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia i file package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm ci --only=production

# Copia tutto il codice sorgente
COPY . .

# Esponi la porta 4000
EXPOSE 4000

# Comando per avviare l'applicazione con auto-discovery
CMD ["npm", "run", "start:auto"]