// models/user.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ProjectManagementSystem',
  password: '2003',
  port: 5432,
});

class User {
  static async createUser(username, email, password, userType) {
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const result = await pool.query(
        'INSERT INTO users (username, email, password, user_type) VALUES ($1, $2, $3, $4) RETURNING id',
        [username, email, hashedPassword, userType]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getUserByEmailAndType(email, userType) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1 AND user_type = $2', [email, userType]);

      return result.rows[0];
    } catch (error) {
      console.error('Error retrieving user by email and type:', error);
      throw error;
    }
  }
}

module.exports = User;
