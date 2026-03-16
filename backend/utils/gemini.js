// utils/gemini.js – Google Gemini AI Integration
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI, model;

function getModel() {
  if (model) return model;
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠ GEMINI_API_KEY not set – using fallback responses');
    return null;
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  return model;
}

// ─── Generate Interview Questions ─────────────────
async function generateInterviewQuestions(config) {
  const m = getModel();
  if (!m) return getFallbackQuestions(config);

  const { role, difficulty, mode, company, jd, resumeText } = config;
  const count = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 12 : 9;

  const companyContext = company && company !== 'none'
    ? `Style your questions like ${company.charAt(0).toUpperCase() + company.slice(1)}'s actual interview process.`
    : '';

  const jdContext = jd
    ? `\nJob Description provided:\n"""\n${jd.slice(0, 800)}\n"""\nInclude 2-3 questions specifically based on this JD.`
    : '';

  const resumeContext = resumeText
    ? `\nCandidate Resume:\n"""\n${resumeText.slice(0, 600)}\n"""\nInclude 1-2 questions based on the candidate's specific experience.`
    : '';

  const prompt = `You are an expert technical interviewer at a top tech company. Generate ${count} interview questions for a ${role} developer position.

Difficulty: ${difficulty}
Interview Mode: ${mode} (${mode === 'technical' ? 'Focus on technical concepts and coding' : mode === 'hr' ? 'Focus on behavioral and soft skills' : mode === 'mixed' ? 'Mix technical and behavioral' : 'Focus on DSA and problem solving'})
${companyContext}
${jdContext}
${resumeContext}

Return ONLY a valid JSON array in this exact format:
[
  {
    "id": 1,
    "text": "Full question text here",
    "category": "JavaScript/React/OOP/Behavioral/etc",
    "difficulty": "${difficulty}",
    "hint": "Brief hint to guide the answer (1 sentence)",
    "expectedKeywords": ["keyword1", "keyword2", "keyword3"],
    "type": "technical/behavioral/coding"
  }
]

Rules:
- Questions must be relevant to ${role} role
- Mix conceptual, practical, and scenario-based questions
- For 'hard' difficulty, include at least 2 system design or advanced questions
- Make questions realistic, not trick questions
- Hints should be helpful but not give away the answer
- Return ONLY the JSON array, no markdown, no extra text`;

  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const questions = JSON.parse(cleaned);
    return Array.isArray(questions) ? questions : getFallbackQuestions(config);
  } catch (err) {
    console.error('Gemini question gen error:', err.message);
    return getFallbackQuestions(config);
  }
}

// ─── Evaluate Answer ───────────────────────────────
async function evaluateAnswer(data) {
  const m = getModel();
  const { question, answer, role, difficulty } = data;

  if (!m || !answer || answer === '[Skipped]') {
    return { score: 0, skipped: !answer, feedback: 'Question skipped.', categories: { correctness: 0, communication: 0, confidence: 0 } };
  }

  // Basic validation
  if (answer.trim().length < 10) {
    return {
      score: 15, feedback: 'Your answer was too short. Try to elaborate more.',
      categories: { correctness: 10, communication: 15, confidence: 20 },
      idealAnswer: null,
    };
  }

  const prompt = `You are an expert interviewer evaluating a candidate's answer for a ${role} developer interview (${difficulty} difficulty).

Question: "${question}"
Candidate's Answer: "${answer}"

Evaluate this answer and return ONLY a valid JSON object in this exact format:
{
  "score": <0-100 overall score>,
  "categories": {
    "correctness": <0-100 technical correctness>,
    "communication": <0-100 clarity and communication>,
    "confidence": <0-100 confidence and delivery>
  },
  "feedback": "<2-3 sentences of specific, constructive feedback mentioning what was good and what to improve>",
  "idealAnswer": "<A concise ideal answer in 3-5 sentences covering the key points>",
  "followup": "<null OR a relevant follow-up question if the answer was incomplete, otherwise null>",
  "grammarIssues": ["<issue1 if any>"],
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<area1 to improve>"]
}

Scoring guide:
- 85-100: Excellent – comprehensive, accurate, great communication
- 70-84: Good – covers main points, minor gaps
- 50-69: Average – partial understanding, needs more depth
- 30-49: Below average – significant gaps
- 0-29: Poor – incorrect or very incomplete

Return ONLY the JSON object, no markdown, no extra text.`;

  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini evaluation error:', err.message);
    return generateLocalEvaluation(question, answer);
  }
}

// ─── Generate Improvement Tips ─────────────────────
async function generateImprovementTips(interviewData) {
  const m = getModel();
  if (!m) return null;

  const { answers, config, avgScore } = interviewData;
  const prompt = `Based on this mock interview performance, generate personalized improvement tips.

Role: ${config.role}
Average Score: ${avgScore}/100
Number of Questions: ${answers.length}

Return a JSON object:
{
  "overallFeedback": "<2 sentences overall assessment>",
  "topStrengths": ["<strength1>", "<strength2>"],
  "topWeaknesses": ["<weakness1>", "<weakness2>"],
  "studyTopics": ["<topic1 to study>", "<topic2>", "<topic3>"],
  "practiceAdvice": "<1 sentence specific advice for next interview>"
}

Return ONLY the JSON, no markdown.`;

  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

// ─── Fallback Questions ────────────────────────────
function getFallbackQuestions(config) {
  const { role, difficulty } = config;
  const qBank = {
    frontend: [
      { text: 'Explain the concept of closure in JavaScript with a practical example.', category: 'JavaScript', hint: 'Think about function scope and data encapsulation', expectedKeywords: ['scope', 'inner function', 'outer variable'] },
      { text: 'What is the Virtual DOM and how does React use it to optimize performance?', category: 'React', hint: 'Consider reconciliation and diffing algorithm', expectedKeywords: ['diffing', 'reconciliation', 'real DOM'] },
      { text: 'Explain CSS Flexbox vs CSS Grid. When would you use each?', category: 'CSS', hint: 'Think about 1D vs 2D layouts', expectedKeywords: ['1D', '2D', 'axis', 'layout'] },
      { text: 'What is event bubbling and event delegation in JavaScript?', category: 'DOM', hint: 'Think about propagation and performance', expectedKeywords: ['propagation', 'parent element', 'addEventListener'] },
      { text: 'How does async/await differ from Promises? Give examples.', category: 'JavaScript', hint: 'Think about syntax sugar and error handling', expectedKeywords: ['promise', 'then', 'catch', 'async'] },
      { text: 'Explain the critical rendering path in browsers.', category: 'Performance', hint: 'HTML → DOM → CSSOM → Render Tree', expectedKeywords: ['DOM', 'CSSOM', 'render tree', 'paint'] },
    ],
    backend: [
      { text: 'Explain REST API design principles and best practices.', category: 'API Design', hint: 'Think about HTTP methods, status codes, and statelessness', expectedKeywords: ['stateless', 'HTTP', 'resources', 'endpoints'] },
      { text: 'What is database indexing? When and how should you use it?', category: 'Database', hint: 'Think about query performance and trade-offs', expectedKeywords: ['query speed', 'B-tree', 'write overhead', 'composite'] },
      { text: 'Explain the difference between SQL and NoSQL databases.', category: 'Database', hint: 'Think about schema, scalability, and use cases', expectedKeywords: ['schema', 'ACID', 'scalability', 'flexible'] },
      { text: 'What is JWT? How does token-based authentication work?', category: 'Security', hint: 'Think about stateless auth and token structure', expectedKeywords: ['header', 'payload', 'signature', 'stateless'] },
      { text: 'Explain microservices architecture vs monolithic architecture.', category: 'Architecture', hint: 'Think about scalability and deployment complexity', expectedKeywords: ['independent', 'scalability', 'communication', 'deployment'] },
    ],
    java: [
      { text: 'Explain the four principles of OOP with examples in Java.', category: 'OOP', hint: 'SOLID, encapsulation, inheritance, polymorphism, abstraction', expectedKeywords: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'] },
      { text: 'What is the difference between ArrayList and LinkedList in Java?', category: 'Collections', hint: 'Think about time complexity for access vs insertion', expectedKeywords: ['random access', 'O(1)', 'O(n)', 'pointer'] },
      { text: 'Explain Java memory management and garbage collection.', category: 'JVM', hint: 'Heap, Stack, Eden, Survivor spaces', expectedKeywords: ['heap', 'stack', 'garbage collector', 'GC roots'] },
      { text: 'What is the difference between interface and abstract class?', category: 'OOP', hint: 'Think about multiple inheritance and default methods', expectedKeywords: ['multiple inheritance', 'default methods', 'abstract methods'] },
    ],
    hr: [
      { text: 'Tell me about yourself — your background, skills, and career goals.', category: 'Introduction', hint: 'Structure: past experience → current skills → future goals', expectedKeywords: ['experience', 'skills', 'goals', 'motivated'] },
      { text: 'Describe a time when you faced a major challenge at work. How did you handle it?', category: 'Behavioral', hint: 'Use STAR: Situation, Task, Action, Result', expectedKeywords: ['situation', 'action', 'result', 'learned'] },
      { text: 'Why do you want to join this company? What motivates you?', category: 'Motivation', hint: 'Research the company, align your values', expectedKeywords: ['company values', 'growth', 'opportunity', 'contribution'] },
      { text: 'What are your greatest strengths and one area for improvement?', category: 'Self-assessment', hint: 'Be specific with examples; frame weakness positively', expectedKeywords: ['specific skill', 'example', 'improvement', 'working on'] },
      { text: 'Where do you see yourself in 3-5 years?', category: 'Career Goals', hint: 'Show ambition aligned with company growth path', expectedKeywords: ['growth', 'leadership', 'skills', 'contribute'] },
    ],
  };

  const questions = qBank[config.role] || qBank.frontend;
  return questions.map((q, i) => ({ id: i + 1, ...q, difficulty, type: config.mode === 'hr' ? 'behavioral' : 'technical' }));
}

// ─── Local Evaluation Fallback ─────────────────────
function generateLocalEvaluation(question, answer) {
  const words = answer.trim().split(/\s+/).length;
  const FILLERS = ['um', 'uh', 'like', 'basically', 'literally'];
  const fillerCount = FILLERS.reduce((c, f) => c + (answer.toLowerCase().match(new RegExp(`\\b${f}\\b`, 'g')) || []).length, 0);
  const score = Math.min(85, Math.max(25, words * 0.9 - fillerCount * 4 + Math.random() * 15));

  return {
    score: Math.round(score),
    categories: {
      correctness: Math.round(score * (0.8 + Math.random() * 0.3)),
      communication: Math.round(Math.max(30, 80 - fillerCount * 5 + Math.random() * 20)),
      confidence: Math.round(Math.min(90, words * 0.8 + Math.random() * 20)),
    },
    feedback: `${score >= 70 ? 'Good attempt!' : 'Decent try.'} Your answer covered ${words > 50 ? 'several' : 'some'} relevant points. ${fillerCount > 3 ? 'Reduce filler words for better clarity.' : ''} ${score < 60 ? 'Try to provide more specific examples and deeper explanation.' : 'Keep up the structured approach!'}`,
    idealAnswer: 'A comprehensive answer would include: the core concept definition, a practical example, advantages/disadvantages, and when to use this in real-world scenarios.',
    followup: words < 40 ? 'Can you provide a specific code example or real-world scenario?' : null,
  };
}

module.exports = { generateInterviewQuestions, evaluateAnswer, generateImprovementTips };
