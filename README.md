# GraphQL Basic Server

Un server GraphQL con Node.js che si collega a un database MySQL.

## Prerequisiti

- Node.js (versione 14 o superiore)
- Docker e Docker Compose
- MySQL client (opzionale, per eseguire script SQL)

## Configurazione

### 1. Avviare il database MySQL

Crea un file `docker-compose.yml` con il contenuto fornito e avvia il database:

```bash
docker-compose up -d
```

### 2. Installare le dipendenze

```bash
npm install
```

### 3. Avviare il server

#### Server con schema manuale:
```bash
# Modalità produzione
npm start

# Modalità sviluppo (con auto-reload)
npm run dev
```

#### Server con auto-discovery (NUOVO!):
```bash
# Modalità produzione con auto-discovery
npm run start:auto

# Modalità sviluppo con auto-discovery (con auto-reload)
npm run dev:auto
```

#### Utilizzo con Docker:
```bash
# Costruire l'immagine Docker
docker build -t graphql-autodiscovery .

# Eseguire il container (assicurati che il database MySQL sia in esecuzione)
docker run -p 4000:4000 --env-file .env graphql-autodiscovery

# Oppure, se usi docker-compose per il database, puoi collegare i container:
docker run -p 4000:4000 --network graph-ql-basic-server_default --env-file .env graphql-autodiscovery
```

#### Stack completo con Docker Compose:
```bash
# Avviare l'intero stack (database + applicazione GraphQL)
docker-compose -f docker-compose.full.yml up -d

# Visualizzare i log
docker-compose -f docker-compose.full.yml logs -f

# Fermare lo stack
docker-compose -f docker-compose.full.yml down
```

## Utilizzo

Il server GraphQL sarà disponibile su:
- **Endpoint GraphQL**: http://localhost:4000/graphql
- **GraphQL Playground**: http://localhost:4000/graphql

## Auto-Discovery delle Tabelle

La nuova funzionalità di auto-discovery permette di generare automaticamente lo schema GraphQL e i resolver basandosi sulla struttura del database MySQL.

### Come funziona:
1. **Scansione automatica**: Il sistema interroga `INFORMATION_SCHEMA` per scoprire tutte le tabelle nel database
2. **Generazione tipi**: Crea automaticamente i tipi GraphQL basati sui campi delle tabelle
3. **Mapping tipi**: Converte i tipi SQL in tipi GraphQL appropriati (INT → Int, VARCHAR → String, etc.)
4. **Resolver automatici**: Genera query e mutation CRUD per ogni tabella
5. **Convenzioni di naming**: Usa convenzioni standard (tabelle al plurale, singolare per query specifiche)

### Vantaggi:
- ✅ **Zero configurazione**: Non serve scrivere schema o resolver manualmente
- ✅ **Sincronizzazione automatica**: Lo schema si aggiorna automaticamente quando cambia il database
- ✅ **Supporto completo CRUD**: Query, create, update, delete per ogni tabella
- ✅ **Gestione relazioni**: Riconosce chiavi primarie e foreign key
- ✅ **Tipi corretti**: Mapping intelligente dei tipi SQL → GraphQL

### Limitazioni:
- Le relazioni tra tabelle non sono ancora supportate automaticamente
- I nomi delle query seguono convenzioni standard (potrebbero non essere ideali per tutti i casi)
- Non supporta logica di business complessa (per quella serve il server manuale)

### Query di esempio

```graphql
# Ottenere tutti gli utenti
query {
  users {
    id
    name
    email
    createdAt
  }
}

# Ottenere un utente specifico
query {
  user(id: "1") {
    id
    name
    email
    createdAt
  }
}

# Creare un nuovo utente
mutation {
  createUser(name: "Nuovo Utente", email: "nuovo@email.com") {
    id
    name
    email
    createdAt
  }
}

# Aggiornare un utente
mutation {
  updateUser(id: "1", name: "Nome Aggiornato") {
    id
    name
    email
    createdAt
  }
}

# Eliminare un utente
mutation {
  deleteUser(id: "1")
}
```

## Struttura del progetto

```
.
├── server.js                 # Server con schema manuale
├── server-autodiscovery.js   # Server con auto-discovery (NUOVO!)
├── schema.js                 # Schema GraphQL manuale
├── resolvers.js              # Resolver GraphQL manuali
├── autodiscovery.js          # Sistema di auto-discovery (NUOVO!)
├── database.js               # Configurazione database
├── init.sql                  # Script di inizializzazione database
├── Dockerfile                # Configurazione Docker (NUOVO!)
├── .dockerignore             # File da escludere da Docker (NUOVO!)
├── docker-compose.full.yml   # Stack completo Docker (NUOVO!)
├── .env                      # Variabili d'ambiente
├── .gitignore               # File da ignorare in Git
├── package.json             # Dipendenze e script
└── README.md                # Documentazione
```

## Configurazione ambiente

Il file `.env` contiene le configurazioni del database e del server. Modifica questi valori se necessario:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=test
DB_USER=user
DB_PASSWORD=password
PORT=4000
```