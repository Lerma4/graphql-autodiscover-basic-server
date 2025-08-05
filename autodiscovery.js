const { pool } = require('./database');
const { gql } = require('apollo-server-express');

class GraphQLAutoDiscovery {
  constructor(schemaName = 'test') {
    this.schemaName = schemaName;
    this.tables = new Map();
  }

  async discoverTables() {
    try {
      const [tables] = await pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
        [this.schemaName]
      );

      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        const columns = await this.getTableColumns(tableName);
        this.tables.set(tableName, columns);
      }

      return this.tables;
    } catch (error) {
      console.error('Error discovering tables:', error);
      throw error;
    }
  }

  async getTableColumns(tableName) {
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [this.schemaName, tableName]
    );

    return columns.map(col => ({
      name: col.COLUMN_NAME,
      type: this.mapSqlTypeToGraphQL(col.DATA_TYPE),
      nullable: col.IS_NULLABLE === 'YES',
      isPrimaryKey: col.COLUMN_KEY === 'PRI',
      isAutoIncrement: col.EXTRA === 'auto_increment'
    }));
  }

  mapSqlTypeToGraphQL(sqlType) {
    const typeMap = {
      'int': 'Int',
      'bigint': 'Int',
      'smallint': 'Int',
      'tinyint': 'Int',
      'varchar': 'String',
      'char': 'String',
      'text': 'String',
      'longtext': 'String',
      'mediumtext': 'String',
      'tinytext': 'String',
      'decimal': 'Float',
      'float': 'Float',
      'double': 'Float',
      'boolean': 'Boolean',
      'bool': 'Boolean',
      'date': 'String',
      'datetime': 'String',
      'timestamp': 'String',
      'time': 'String',
      'year': 'Int',
      'json': 'String'
    };

    return typeMap[sqlType.toLowerCase()] || 'String';
  }

  generateTypeDefs() {
    let typeDefs = '';
    const queryFields = [];
    const mutationFields = [];

    for (const [tableName, columns] of this.tables) {
      const typeName = this.toPascalCase(tableName);
      const singularName = this.toSingular(tableName);
      
      typeDefs += `\n  type ${typeName} {\n`;
      
      columns.forEach(col => {
        const nullable = col.nullable && !col.isPrimaryKey ? '' : '!';
        typeDefs += `    ${col.name}: ${col.type}${nullable}\n`;
      });
      
      typeDefs += `  }\n`;

      queryFields.push(`    ${tableName}: [${typeName}!]!`);
      
      const primaryKey = columns.find(col => col.isPrimaryKey);
      if (primaryKey) {
        queryFields.push(`    ${singularName}(${primaryKey.name}: ${primaryKey.type}!): ${typeName}`);
      }

      // Aggiungi query LIKE per campi String
      columns.forEach(col => {
        if (col.type === 'String' && !col.isPrimaryKey) {
          const fieldName = this.toPascalCase(col.name);
          queryFields.push(`    ${tableName}By${fieldName}(${col.name}Pattern: String!): [${typeName}!]!`);
        }
      });

      const insertFields = columns
        .filter(col => !col.isAutoIncrement)
        .map(col => {
          const required = !col.nullable ? '!' : '';
          return `${col.name}: ${col.type}${required}`;
        })
        .join(', ');
      
      if (insertFields) {
        mutationFields.push(`    create${typeName}(${insertFields}): ${typeName}!`);
      }

      if (primaryKey) {
        const updateFields = columns
          .filter(col => !col.isPrimaryKey && !col.isAutoIncrement)
          .map(col => `${col.name}: ${col.type}`)
          .join(', ');
        
        if (updateFields) {
          mutationFields.push(`    update${typeName}(${primaryKey.name}: ${primaryKey.type}!, ${updateFields}): ${typeName}!`);
        }
        
        mutationFields.push(`    delete${typeName}(${primaryKey.name}: ${primaryKey.type}!): Boolean!`);
      }
    }

    const schema = `
  type Query {
    hello: String!
${queryFields.join('\n')}
  }

  type Mutation {
${mutationFields.join('\n')}
  }
${typeDefs}
`;

    return gql(schema);
  }

  generateResolvers() {
    const resolvers = {
      Query: {
        hello: () => 'Hello from Auto-Generated GraphQL Server!'
      },
      Mutation: {}
    };

    for (const [tableName, columns] of this.tables) {
      const typeName = this.toPascalCase(tableName);
      const singularName = this.toSingular(tableName);
      const primaryKey = columns.find(col => col.isPrimaryKey);

      resolvers.Query[tableName] = async () => {
        try {
          const [rows] = await pool.execute(`SELECT * FROM ${tableName}`);
          return rows;
        } catch (error) {
          console.error(`Error fetching ${tableName}:`, error);
          throw new Error(`Failed to fetch ${tableName}`);
        }
      };

      if (primaryKey) {
        resolvers.Query[singularName] = async (_, args) => {
          try {
            const [rows] = await pool.execute(
              `SELECT * FROM ${tableName} WHERE ${primaryKey.name} = ?`,
              [args[primaryKey.name]]
            );
            return rows[0] || null;
          } catch (error) {
            console.error(`Error fetching ${singularName}:`, error);
            throw new Error(`Failed to fetch ${singularName}`);
          }
        };
      }

      // Aggiungi resolver per query LIKE sui campi String
      columns.forEach(col => {
        if (col.type === 'String' && !col.isPrimaryKey) {
          const fieldName = this.toPascalCase(col.name);
          const queryName = `${tableName}By${fieldName}`;
          
          resolvers.Query[queryName] = async (_, args) => {
            try {
              const [rows] = await pool.execute(
                `SELECT * FROM ${tableName} WHERE ${col.name} LIKE ?`,
                [args[`${col.name}Pattern`]]
              );
              return rows;
            } catch (error) {
              console.error(`Error fetching ${tableName} by ${col.name}:`, error);
              throw new Error(`Failed to fetch ${tableName} by ${col.name}`);
            }
          };
        }
      });

      const insertColumns = columns.filter(col => !col.isAutoIncrement);
      if (insertColumns.length > 0) {
        resolvers.Mutation[`create${typeName}`] = async (_, args) => {
          try {
            const columnNames = insertColumns.map(col => col.name);
            const values = columnNames.map(name => args[name]);
            const placeholders = columnNames.map(() => '?').join(', ');
            
            const [result] = await pool.execute(
              `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`,
              values
            );
            
            if (primaryKey) {
              const [rows] = await pool.execute(
                `SELECT * FROM ${tableName} WHERE ${primaryKey.name} = ?`,
                [result.insertId || args[primaryKey.name]]
              );
              return rows[0];
            }
            
            return args;
          } catch (error) {
            console.error(`Error creating ${singularName}:`, error);
            throw new Error(`Failed to create ${singularName}`);
          }
        };
      }

      if (primaryKey) {
        const updateColumns = columns.filter(col => !col.isPrimaryKey && !col.isAutoIncrement);
        if (updateColumns.length > 0) {
          resolvers.Mutation[`update${typeName}`] = async (_, args) => {
            try {
              const updates = [];
              const values = [];
              
              updateColumns.forEach(col => {
                if (args[col.name] !== undefined) {
                  updates.push(`${col.name} = ?`);
                  values.push(args[col.name]);
                }
              });
              
              if (updates.length === 0) {
                throw new Error('No fields to update');
              }
              
              values.push(args[primaryKey.name]);
              
              await pool.execute(
                `UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${primaryKey.name} = ?`,
                values
              );
              
              const [rows] = await pool.execute(
                `SELECT * FROM ${tableName} WHERE ${primaryKey.name} = ?`,
                [args[primaryKey.name]]
              );
              return rows[0];
            } catch (error) {
              console.error(`Error updating ${singularName}:`, error);
              throw new Error(`Failed to update ${singularName}`);
            }
          };
        }

        resolvers.Mutation[`delete${typeName}`] = async (_, args) => {
          try {
            const [result] = await pool.execute(
              `DELETE FROM ${tableName} WHERE ${primaryKey.name} = ?`,
              [args[primaryKey.name]]
            );
            return result.affectedRows > 0;
          } catch (error) {
            console.error(`Error deleting ${singularName}:`, error);
            throw new Error(`Failed to delete ${singularName}`);
          }
        };
      }

      resolvers[typeName] = {};
      columns.forEach(col => {
        if (col.type === 'String' && (col.name.includes('_at') || col.name.includes('date'))) {
          resolvers[typeName][col.name] = (parent) => {
            return parent[col.name] ? parent[col.name].toISOString() : null;
          };
        }
      });
    }

    return resolvers;
  }

  toPascalCase(str) {
    return str.replace(/(^|_)([a-z])/g, (_, __, letter) => letter.toUpperCase());
  }

  toSingular(str) {
    if (str.endsWith('s') && str.length > 1) {
      return str.slice(0, -1);
    }
    return str;
  }

  async generateSchema() {
    await this.discoverTables();
    return {
      typeDefs: this.generateTypeDefs(),
      resolvers: this.generateResolvers()
    };
  }
}

module.exports = GraphQLAutoDiscovery;