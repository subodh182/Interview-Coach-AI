// routes/leaderboard.js
const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');

router.get('/', async (req, res) => {
  try {
    const { role, limit: lim = 50 } = req.query;

    const snap = await db.ref('users')
      .orderByChild('avgScore')
      .limitToLast(parseInt(lim))
      .get();

    const users = [];
    snap.forEach(child => {
      const d = child.val();
      if (!role || d.role === role) {
        users.push({
          id: child.key,
          displayName: d.displayName || d.firstName,
          role: d.role,
          avgScore: d.avgScore || 0,
          totalInterviews: d.totalInterviews || 0
        });
      }
    });

    users.reverse(); // limitToLast ascending deta hai, reverse karo

    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', leaderboard: [] });
  }
});

module.exports = router;