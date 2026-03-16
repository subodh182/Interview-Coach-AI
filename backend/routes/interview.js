// routes/interview.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { generateInterviewQuestions, evaluateAnswer, generateImprovementTips } = require('../utils/gemini');
const { db } = require('../utils/firebase');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── POST /api/interview/generate-questions ────────
router.post('/generate-questions', optionalAuth, async (req, res) => {
  try {
    const config = req.body;
    const { role, difficulty, mode } = config;

    if (!role) return res.status(400).json({ error: 'Role is required' });

    const questions = await generateInterviewQuestions(config);
    const interviewId = uuidv4();

    if (req.user?.uid) {
      await db.ref(`interviews/${interviewId}`).set({
        id: interviewId,
        userId: req.user.uid,
        role,
        difficulty,
        mode,
        company: config.company || 'none',
        questions,
        answers: [],
        scores: [],
        score: 0,
        status: 'in_progress',
        createdAt: Date.now(),
        jdProvided: !!config.jd,
        resumeProvided: !!config.resumeText,
      });
    }

    res.json({ interviewId, questions, total: questions.length });
  } catch (err) {
    console.error('generate-questions error:', err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// ─── POST /api/interview/evaluate-answer ──────────
router.post('/evaluate-answer', optionalAuth, async (req, res) => {
  try {
    const { interviewId, questionIndex, question, answer, role, difficulty } = req.body;
    if (!question || answer === undefined) return res.status(400).json({ error: 'Question and answer required' });

    const evaluation = await evaluateAnswer({ question, answer, role, difficulty });

    if (req.user?.uid && interviewId) {
      await db.ref(`interviews/${interviewId}/answers/${questionIndex}`).set({
        question,
        answer,
        evaluation,
        answeredAt: Date.now()
      });
    }

    res.json(evaluation);
  } catch (err) {
    console.error('evaluate-answer error:', err);
    res.status(500).json({ error: 'Evaluation failed' });
  }
});

// ─── POST /api/interview/save-results ─────────────
router.post('/save-results', optionalAuth, async (req, res) => {
  try {
    const { interviewId, answers, scores, config } = req.body;

    const validScores = scores.filter(s => !s.skipped && s.score > 0);
    const avgScore = validScores.length
      ? Math.round(validScores.reduce((s, e) => s + e.score, 0) / validScores.length)
      : 0;

    const avgCategories = validScores.reduce((acc, s) => {
      acc.correctness += s.categories?.correctness || 0;
      acc.communication += s.categories?.communication || 0;
      acc.confidence += s.categories?.confidence || 0;
      return acc;
    }, { correctness: 0, communication: 0, confidence: 0 });

    const n = validScores.length || 1;

    const resultData = {
      answers,
      scores,
      score: avgScore,
      avgCategories: {
        correctness: Math.round(avgCategories.correctness / n),
        communication: Math.round(avgCategories.communication / n),
        confidence: Math.round(avgCategories.confidence / n),
      },
      config,
      status: 'completed',
      completedAt: Date.now(),
      duration: null,
    };

    if (req.user?.uid && interviewId) {
      await db.ref(`interviews/${interviewId}`).update(resultData);

      const userSnap = await db.ref(`users/${req.user.uid}`).get();
      const userData = userSnap.val() || {};

      const prevTotal = userData.totalInterviews || 0;
      const prevAvg = userData.avgScore || 0;
      const newAvg = Math.round((prevAvg * prevTotal + avgScore) / (prevTotal + 1));

      await db.ref(`users/${req.user.uid}`).update({
        totalInterviews: prevTotal + 1,
        avgScore: newAvg,
        lastInterviewAt: Date.now(),
      });
    }

    res.json({ success: true, interviewId, avgScore, resultData });
  } catch (err) {
    console.error('save-results error:', err);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// ─── GET /api/interview/:id ────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const snap = await db.ref(`interviews/${req.params.id}`).get();
    if (!snap.exists()) return res.status(404).json({ error: 'Interview not found' });

    const data = snap.val();

    if (req.user && data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ id: req.params.id, ...data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

// ─── GET /api/interview/history ───────────────────
router.get('/history/list', verifyToken, async (req, res) => {
  try {
    const snap = await db.ref(`userInterviews/${req.user.uid}`).get();
    if (!snap.exists()) return res.json({ interviews: [] });

    const interviews = [];
    snap.forEach(child => interviews.push({ id: child.key, ...child.val() }));

    interviews.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ interviews: interviews.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── POST /api/interview/upload-resume ────────────
router.post('/upload-resume', upload.single('resume'), optionalAuth, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let text = '';

    if (req.file.mimetype === 'text/plain') {
      text = req.file.buffer.toString('utf-8').slice(0, 2000);
    } else if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(req.file.buffer);
        text = data.text.slice(0, 2000);
      } catch {
        text = '';
      }
    }

    res.json({ success: true, text, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: 'Resume upload failed' });
  }
});

module.exports = router;