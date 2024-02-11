// routes/manager.js

const express = require('express');
const router = express.Router();

// Manager Dashboard - Display tasks and projects
router.get('/dashboard', (req, res) => {
  const { username, userType } = req.session.user;
  // Fetch tasks and projects assigned by the manager from the database
  // Pass the data to the manager-dashboard view
  res.render('manager-dashboard', { username, userType, tasks, projects });
});

// Assign tasks to users
router.post('/assign-task', (req, res) => {
  const { email, description } = req.body;
  // Validate and assign the task to the user with the given email
  // Update the tasks table in the database
  res.redirect('/manager/dashboard');
});

module.exports = router;
