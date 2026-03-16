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

    // Save interview session to Firestore
    if (req.user?.uid) {
      await db.collection('interviews').doc(interviewId).set({
        id: interviewId,
        userId: req.user.uid,
        role, difficulty, mode,
        company: config.company || 'none',
        questions,
        answers: [],
        scores: [],
        score: 0,
        status: 'in_progress',
        createdAt: new Date(),
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

    // Save answer to Firestore
    if (req.user?.uid && interviewId) {
      const ref = db.collection('interviews').doc(interviewId);
      const snap = await ref.get();
      if (snap.exists()) {
        const data = snap.data();
        const answers = data.answers || [];
        answers[questionIndex] = { question, answer, evaluation, answeredAt: new Date() };
        await ref.update({ answers });
      }
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
      completedAt: new Date(),
      duration: null,
    };

    // Save to Firestore
    if (req.user?.uid && interviewId && interviewId !== 'demo_' + interviewId.split('demo_')[1]) {
      const ref = db.collection('interviews').doc(interviewId);
      await ref.update(resultData);

      // Update user stats
      const userRef = db.collection('users').doc(req.user.uid);
      const userSnap = await userRef.get();
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const prevTotal = userData.totalInterviews || 0;
        const prevAvg = userData.avgScore || 0;
        const newAvg = Math.round((prevAvg * prevTotal + avgScore) / (prevTotal + 1));
        await userRef.update({
          totalInterviews: prevTotal + 1,
          avgScore: newAvg,
          lastInterviewAt: new Date(),
        });
      }
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
    const snap = await db.collection('interviews').doc(req.params.id).get();
    if (!snap.exists()) return res.status(404).json({ error: 'Interview not found' });
    const data = snap.data();
    // Only return if belongs to user
    if (req.user && data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ id: snap.id, ...data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

// ─── GET /api/interview/history ───────────────────
router.get('/history/list', verifyToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const q = await db.collection('interviews')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const interviews = [];
    q.forEach(doc => {
      const d = doc.data();
      interviews.push({ id: doc.id, role: d.role, mode: d.mode, difficulty: d.difficulty, score: d.score, status: d.status, createdAt: d.createdAt });
    });
    res.json({ interviews });
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
      } catch { text = ''; }
    }
    res.json({ success: true, text, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: 'Resume upload failed' });
  }
});

module.exports = router;
