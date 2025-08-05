const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { testConnection } = require('./database');
require('dotenv').config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 4000;
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true
  });
  
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  
  await testConnection();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📊 GraphQL Playground available at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});