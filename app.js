// app.js

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ProjectManagementSystem',
  password: process.env.DB_PASSWORD || '2003',
  port: process.env.DB_PORT || 5432,
});

async function isEmailExists(email, userType) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND user_type = $2', [email, userType]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
}

async function initializeDatabase() {
  try {
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        UNIQUE(email, user_type)
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        manager_id INTEGER REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'Not Started'
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        manager_id INTEGER REFERENCES users(id),
        project_id INTEGER REFERENCES projects(id),
        completion_status VARCHAR(50) NOT NULL DEFAULT 'Not Started'
      );
    `);

    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase();

app.use(session({
  secret: process.env.SESSION_SECRET || uuidv4(),
  resave: false,
  saveUninitialized: true,
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', { title: 'Project Management System' });
});

app.get('/signup', (req, res) => {
  res.render('signup', { userType: req.query.type });
});

app.post('/signup', async (req, res) => {
  const { username, email, password, userType } = req.body;

  if (!userType) {
    return res.status(400).send('User type is required');
  }

  const emailExists = await isEmailExists(email, userType);

  if (emailExists) {
    return res.status(400).send('Email is already in use for the specified user type');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password, user_type) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email, hashedPassword, userType]
    );

    console.log('User created with ID:', result.rows[0].id);
    res.redirect('/login');
  } catch (error) {
    console.error('Error creating user:', error);
    res.send('Error creating user');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND user_type = $2', [email, userType]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (isPasswordMatch) {
        req.session.user = {
          id: user.id,
          username: user.username,
          userType: user.user_type,
        };

        if (user.user_type === 'manager') {
          res.redirect('/manager-dashboard');
        } else {
          res.redirect('/user-dashboard');
        }
      } else {
        res.send('Invalid password');
      }
    } else {
      res.send('User not found');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.send('Error during login');
  }
});

app.get('/manager-dashboard', async (req, res) => {
  try {
    const tasks = await pool.query(`
      SELECT tasks.*, users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.project_id IS NULL
    `);

    const completedTasks = await pool.query(`
      SELECT tasks.*, users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.completion_status = 'Completed'
    `);

    const pendingTasks = await pool.query(`
      SELECT tasks.*, users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.completion_status = 'Pending'
    `);

    res.render('manager-dashboard', {
      username: req.session.user.username,
      tasks: tasks.rows,
      completedTasks: completedTasks.rows,
      pendingTasks: pendingTasks.rows,
      userType: req.session.user.userType,
    });
  } catch (error) {
    console.error('Error retrieving data for manager dashboard:', error);
    res.send('Error retrieving data');
  }
});

app.post('/manager/assign-task', async (req, res) => {
  const { taskDescription, userEmail } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [userEmail]);

    if (user.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    await pool.query(
      'INSERT INTO tasks (description, user_id, manager_id) VALUES ($1, $2, $3)',
      [taskDescription, user.rows[0].id, req.session.user.id]
    );

    res.redirect('/manager-dashboard');
  } catch (error) {
    console.error('Error assigning task:', error);
    res.send('Error assigning task');
  }
});

app.get('/user-dashboard', async (req, res) => {
  try {
    const tasks = await pool.query(`
      SELECT tasks.*, users.email as user_email, managers.username as manager_name
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      LEFT JOIN users AS managers ON tasks.manager_id = managers.id
      WHERE tasks.user_id = $1
      ORDER BY CASE 
        WHEN tasks.completion_status = 'New' THEN 1
        WHEN tasks.completion_status = 'Pending' THEN 2
        WHEN tasks.completion_status = 'Completed' THEN 3
        ELSE 4
      END
    `, [req.session.user.id]);

    res.render('user-dashboard', { username: req.session.user.username, tasks: tasks.rows });
  } catch (error) {
    console.error('Error retrieving tasks for user dashboard:', error);
    res.send('Error retrieving tasks');
  }
});

// Route to handle user updating task status
app.post('/user/update-status', async (req, res) => {
  const { taskId, completionStatus } = req.body;

  try {
    // Update the task status in the tasks table
    await pool.query('UPDATE tasks SET completion_status = $1 WHERE id = $2', [completionStatus, taskId]);

    // Redirect back to the user dashboard
    res.redirect('/user-dashboard');
  } catch (error) {
    console.error('Error updating task status:', error);
    res.send('Error updating task status');
  }
});

// ... (existing code)

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
