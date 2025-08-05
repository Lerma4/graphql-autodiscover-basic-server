# GraphQL Basic Server

A GraphQL server with Node.js that connects to a MySQL database.

## Prerequisites

- Node.js (version 14 or higher)
- Docker and Docker Compose
- MySQL client (optional, for running SQL scripts)

## Setup

### 1. Database Configuration

Ensure you have a MySQL database configured and running.

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

#### Manual Schema Server:
```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

#### Auto-Discovery Server (NEW!):
```bash
# Production mode with auto-discovery
npm run start:auto

# Development mode with auto-discovery (with auto-reload)
npm run dev:auto
```

#### Using Docker:
```bash
# Build the Docker image
docker build -t graphql-autodiscovery .

# Run the container (ensure MySQL database is running)
docker run -p 4000:4000 --env-file .env graphql-autodiscovery

# Or, if using docker-compose for database, connect containers:
docker run -p 4000:4000 --network graph-ql-basic-server_default --env-file .env graphql-autodiscovery
```

#### Complete Stack with Docker Compose:
```bash
# Start the entire stack (database + GraphQL application)
docker-compose -f docker-compose.full.yml up -d

# View logs
docker-compose -f docker-compose.full.yml logs -f

# Stop the stack
docker-compose -f docker-compose.full.yml down
```

## Usage

The GraphQL server will be available at:
- **GraphQL Endpoint**: http://localhost:4000/graphql
- **GraphQL Playground**: http://localhost:4000/graphql

## Table Auto-Discovery

The new auto-discovery feature automatically generates GraphQL schema and resolvers based on the MySQL database structure.

### How it works:
1. **Automatic scanning**: The system queries `INFORMATION_SCHEMA` to discover all tables in the database
2. **Type generation**: Automatically creates GraphQL types based on table fields
3. **Type mapping**: Converts SQL types to appropriate GraphQL types (INT → Int, VARCHAR → String, etc.)
4. **Automatic resolvers**: Generates CRUD queries and mutations for each table
5. **Naming conventions**: Uses standard conventions (plural tables, singular for specific queries)

### Advantages:
- ✅ **Zero configuration**: No need to manually write schema or resolvers
- ✅ **Automatic synchronization**: Schema updates automatically when database changes
- ✅ **Complete CRUD support**: Query, create, update, delete for every table
- ✅ **Relationship management**: Recognizes primary and foreign keys
- ✅ **Correct types**: Intelligent SQL → GraphQL type mapping

### Limitations:
- Relationships between tables are not yet automatically supported
- Query names follow standard conventions (might not be ideal for all cases)
- Does not support complex business logic (use manual server for that)

### Example Queries

```graphql
# Get all users
query {
  users {
    id
    name
    email
    createdAt
  }
}

# Get a specific user
query {
  user(id: "1") {
    id
    name
    email
    createdAt
  }
}

# Create a new user
mutation {
  createUser(name: "New User", email: "new@email.com") {
    id
    name
    email
    createdAt
  }
}

# Update a user
mutation {
  updateUser(id: "1", name: "Updated Name") {
    id
    name
    email
    createdAt
  }
}

# Delete a user
mutation {
  deleteUser(id: "1")
}
```

## Project Structure

```
.
├── server.js                 # Manual schema server
├── server-autodiscovery.js   # Auto-discovery server (NEW!)
├── schema.js                 # Manual GraphQL schema
├── resolvers.js              # Manual GraphQL resolvers
├── autodiscovery.js          # Auto-discovery system (NEW!)
├── database.js               # Database configuration
├── init.sql                  # Database initialization script
├── Dockerfile                # Docker configuration (NEW!)
├── .dockerignore             # Files to exclude from Docker (NEW!)
├── docker-compose.full.yml   # Complete Docker stack (NEW!)
├── .env                      # Environment variables
├── .env.example              # Environment variables template (NEW!)
├── .gitignore               # Files to ignore in Git
├── package.json             # Dependencies and scripts
└── README.md                # Documentation
```

## Environment Configuration

The `.env` file contains database and server configurations. Copy `.env.example` to `.env` and modify these values as needed:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=test
DB_USER=user
DB_PASSWORD=password
PORT=4000
```