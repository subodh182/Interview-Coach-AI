// routes/leaderboard.js
const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');

router.get('/', async (req, res) => {
  try {
    const { role, limit: lim = 50 } = req.query;
    let q = db.collection('users').orderBy('avgScore', 'desc').limit(parseInt(lim));
    const snap = await q.get();
    const users = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (!role || d.role === role) {
        users.push({ id: doc.id, displayName: d.displayName || d.firstName, role: d.role, avgScore: d.avgScore || 0, totalInterviews: d.totalInterviews || 0 });
      }
    });
    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', leaderboard: [] });
  }
});

module.exports = router;
