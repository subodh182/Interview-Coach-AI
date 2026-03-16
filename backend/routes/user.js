// routes/user.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { db } = require('../utils/firebase');

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('users').doc(req.user.uid).get();
    if (!snap.exists()) return res.status(404).json({ error: 'User not found' });
    const { uid, firstName, lastName, displayName, email, role, totalInterviews, avgScore, streak, createdAt } = snap.data();
    res.json({ uid, firstName, lastName, displayName, email, role, totalInterviews, avgScore, streak, createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, role } = req.body;
    await db.collection('users').doc(req.user.uid).update({ firstName, lastName, role, updatedAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('users').doc(req.user.uid).get();
    if (!snap.exists()) return res.status(404).json({ error: 'User not found' });
    const { totalInterviews = 0, avgScore = 0, streak = 0 } = snap.data();
    res.json({ totalInterviews, avgScore, streak });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
