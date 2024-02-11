// models/task.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ProjectManagementSystem',
  password: '2003',
  port: 5432,
});

class Task {
  static async createTask(description, userId, projectId, status = 'Not Started') {
    try {
      const result = await pool.query(
        'INSERT INTO tasks (description, user_id, project_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [description, userId, projectId, status]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  static async getTasksByUserId(userId) {
    try {
      const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);

      return result.rows;
    } catch (error) {
      console.error('Error retrieving tasks by user ID:', error);
      throw error;
    }
  }
}

module.exports = Task;
