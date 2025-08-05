const { pool } = require('./database');

const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL Server!',
    
    users: async () => {
      try {
        const [rows] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');
        return rows;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error('Failed to fetch users');
      }
    },
    
    user: async (_, { id }) => {
      try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error('Failed to fetch user');
      }
    }
  },
  
  Mutation: {
    createUser: async (_, { name, email }) => {
      try {
        const [result] = await pool.execute(
          'INSERT INTO users (name, email, created_at) VALUES (?, ?, NOW())',
          [name, email]
        );
        
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
        return rows[0];
      } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user');
      }
    },
    
    updateUser: async (_, { id, name, email }) => {
      try {
        const updates = [];
        const values = [];
        
        if (name !== undefined) {
          updates.push('name = ?');
          values.push(name);
        }
        
        if (email !== undefined) {
          updates.push('email = ?');
          values.push(email);
        }
        
        if (updates.length === 0) {
          throw new Error('No fields to update');
        }
        
        values.push(id);
        
        await pool.execute(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
        
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Failed to update user');
      }
    },
    
    deleteUser: async (_, { id }) => {
      try {
        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
      } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Failed to delete user');
      }
    }
  },
  
  User: {
    createdAt: (user) => {
      return user.created_at ? user.created_at.toISOString() : null;
    }
  }
};

module.exports = resolvers;