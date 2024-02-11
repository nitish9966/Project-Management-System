// routes/user.js

const express = require('express');
const router = express.Router();

// User Dashboard - Display assigned tasks
router.get('/dashboard', (req, res) => {
  const { username, userType } = req.session.user;
  // Fetch tasks assigned to the user from the database
  // Pass the data to the user-dashboard view
  res.render('user-dashboard', { username, userType, tasks });
});

module.exports = router;
