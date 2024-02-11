// models/project.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ProjectManagementSystem',
  password: '2003',
  port: 5432,
});

class Project {
  static async createProject(name, managerId, status = 'Not Started') {
    try {
      const result = await pool.query(
        'INSERT INTO projects (name, manager_id, status) VALUES ($1, $2, $3) RETURNING id',
        [name, managerId, status]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  static async getProjects() {
    try {
      const result = await pool.query('SELECT * FROM projects');

      return result.rows;
    } catch (error) {
      console.error('Error retrieving projects:', error);
      throw error;
    }
  }
}

module.exports = Project;
