const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { testConnection } = require('./database');
const GraphQLAutoDiscovery = require('./autodiscovery');
require('dotenv').config();

async function startAutoDiscoveryServer() {
  const app = express();
  const PORT = process.env.PORT || 4000;
  
  try {
    await testConnection();
    
    console.log('🔍 Discovering database schema...');
    const autoDiscovery = new GraphQLAutoDiscovery(process.env.DB_NAME || 'test');
    const { typeDefs, resolvers } = await autoDiscovery.generateSchema();
    
    console.log('📋 Discovered tables:', Array.from(autoDiscovery.tables.keys()).join(', '));
    
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: true,
      playground: true
    });
    
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });
    
    app.listen(PORT, () => {
      console.log(`🚀 Auto-Discovery Server ready at http://localhost:${PORT}${server.graphqlPath}`);
      console.log(`📊 GraphQL Playground available at http://localhost:${PORT}${server.graphqlPath}`);
      console.log('\n✨ Schema and resolvers generated automatically from database!');
    });
    
  } catch (error) {
    console.error('❌ Error starting auto-discovery server:', error);
    process.exit(1);
  }
}

startAutoDiscoveryServer();