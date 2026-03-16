// ================================================
//  InterviewAI Backend Server
//  Node.js + Express + Gemini API + Firebase Admin
// ================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ─────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true);
    else cb(new Error('CORS blocked'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Rate Limiting ───────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI request limit reached. Please wait a minute.' },
});

app.use('/api/', apiLimiter);
app.use('/api/interview/generate', aiLimiter);
app.use('/api/interview/evaluate', aiLimiter);

// ─── Routes ─────────────────────────────────────
app.use('/api/interview', require('./routes/interview'));
app.use('/api/user', require('./routes/user'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// ─── Health Check ────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Fallback → serve index.html for SPA routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// ─── Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 InterviewAI Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✓ Connected' : '✗ Missing API Key'}\n`);
});

module.exports = app;
