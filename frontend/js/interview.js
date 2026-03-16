/* ================================================
   interview.js – Core Interview Logic
================================================ */

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally',
  'actually', 'so', 'right', 'okay', 'kind of', 'sort of', 'i mean', 'well'];

let interviewState = {
  config: null,
  questions: [],
  currentQ: 0,
  answers: [],
  scores: [],
  timer: null,
  timeLeft: 120,
  recognition: null,
  isRecording: false,
  transcript: '',
  interviewId: null,
  isProcessing: false,
};

// ─── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const config = Session.getInterviewConfig();
  if (!config) {
    Toast.error('Interview config not found. Redirecting...');
    setTimeout(() => window.location.href = 'setup.html', 1500);
    return;
  }

  interviewState.config = config;
  interviewState.timeLeft = config.timeLimit || 120;

  setupUI(config);
  setupMicButton();
  setupActionButtons();
  setupEndInterview();

  await generateQuestions(config);
});

// ─── UI Setup ────────────────────────────────────
function setupUI(config) {
  const roleLabels = {
    frontend: 'Frontend Developer', backend: 'Backend Developer',
    fullstack: 'Full Stack Developer', java: 'Java Developer',
    python: 'Python Developer', devops: 'DevOps Engineer',
    datascience: 'Data Science', android: 'Android Developer', hr: 'HR Interview'
  };
  document.getElementById('headerRole').textContent = roleLabels[config.role] || config.role;
  document.getElementById('headerType').textContent = `${config.mode?.charAt(0).toUpperCase() + config.mode?.slice(1)} · ${config.difficulty?.charAt(0).toUpperCase() + config.difficulty?.slice(1)}`;
}

// ─── Question Generation ──────────────────────────
async function generateQuestions(config) {
  setAIStatus('thinking', 'Preparing your questions...');
  showQuestionLoading();

  try {
    const token = await API.getToken();
    const result = await API.post('/interview/generate-questions', config, token);
    interviewState.questions = result.questions;
    interviewState.interviewId = result.interviewId;
    Session.setCurrentInterview({ id: result.interviewId, ...config });

    document.getElementById('qTotalNum').textContent = interviewState.questions.length;
    displayQuestion(0);
  } catch (err) {
    console.error('Question generation error:', err);
    // Fallback questions for demo
    interviewState.questions = getFallbackQuestions(config);
    interviewState.interviewId = 'demo_' + Date.now();
    document.getElementById('qTotalNum').textContent = interviewState.questions.length;
    displayQuestion(0);
  }
}

function displayQuestion(index) {
  const q = interviewState.questions[index];
  if (!q) { endInterview(); return; }

  const total = interviewState.questions.length;
  document.getElementById('qCurrentNum').textContent = index + 1;
  document.getElementById('headerProgress').style.width = ((index + 1) / total * 100) + '%';
  document.getElementById('qBadgeNum').textContent = `Q${index + 1}`;
  document.getElementById('qCategory').textContent = q.category || 'Technical';
  document.getElementById('questionText').textContent = q.text;
  document.getElementById('hintText').textContent = q.hint || '';
  document.getElementById('questionHint').style.display = 'none';
  document.getElementById('followupBadge').classList.toggle('hidden', !q.isFollowup);

  resetAnswerUI();
  setAIStatus('listening', 'Waiting for your answer...');
  startTimer();
}

function showQuestionLoading() {
  document.getElementById('questionText').textContent = 'Loading your personalized questions...';
}

// ─── Timer ────────────────────────────────────────
function startTimer() {
  clearInterval(interviewState.timer);
  const limit = interviewState.config.timeLimit;
  if (!limit) { document.getElementById('timerDisplay').style.display = 'none'; return; }

  interviewState.timeLeft = limit;
  updateTimerDisplay();

  interviewState.timer = setInterval(() => {
    interviewState.timeLeft--;
    updateTimerDisplay();

    const td = document.getElementById('timerDisplay');
    if (interviewState.timeLeft <= 30) td.className = 'timer-display warning';
    if (interviewState.timeLeft <= 10) td.className = 'timer-display critical';
    if (interviewState.timeLeft <= 0) {
      clearInterval(interviewState.timer);
      if (!interviewState.isProcessing) autoSubmitAnswer();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(interviewState.timeLeft / 60);
  const s = interviewState.timeLeft % 60;
  document.getElementById('timerVal').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function autoSubmitAnswer() {
  Toast.info('⏱ Time\'s up! Submitting your answer...');
  setTimeout(() => submitAnswer(), 800);
}

// ─── Speech Recognition ───────────────────────────
function setupMicButton() {
  const btn = document.getElementById('micBtn');
  if (!btn) return;
  btn.addEventListener('click', toggleRecording);
}

function toggleRecording() {
  if (interviewState.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    Toast.error('Your browser doesn\'t support voice input. Please type your answer instead.');
    enableTextMode();
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  let finalTranscript = interviewState.transcript;

  recognition.onstart = () => {
    interviewState.isRecording = true;
    setMicState('recording');
    setAIStatus('speaking', 'Listening to your answer...');
    document.getElementById('vvStatus').textContent = '🎤 Recording...';
    animateWaveBars(true);
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += ' ' + transcript;
      } else {
        interim = transcript;
      }
    }
    interviewState.transcript = finalTranscript.trim();
    displayTranscript(interviewState.transcript + (interim ? ' ' + interim : ''));
    updateLiveAnalysis(finalTranscript + ' ' + interim);
  };

  recognition.onerror = (event) => {
    if (event.error !== 'aborted') {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        Toast.error('Microphone access denied. Please allow mic access.');
      }
    }
  };

  recognition.onend = () => {
    interviewState.isRecording = false;
    setMicState('idle');
    setAIStatus('listening', 'Answer recorded. Submit when ready.');
    animateWaveBars(false);
    document.getElementById('vvStatus').textContent = 'Recording stopped';
    if (interviewState.transcript.trim().length > 0) {
      document.getElementById('submitAnswerBtn').disabled = false;
    }
  };

  interviewState.recognition = recognition;
  recognition.start();
}

function stopRecording() {
  if (interviewState.recognition) {
    interviewState.recognition.stop();
    interviewState.recognition = null;
  }
}

function enableTextMode() {
  document.getElementById('transcriptBox').style.display = 'none';
  const editBox = document.getElementById('transcriptEditBox');
  editBox.classList.remove('hidden');
  const textarea = document.getElementById('transcriptEditArea');
  textarea.focus();
  textarea.addEventListener('input', () => {
    interviewState.transcript = textarea.value;
    updateLiveAnalysis(textarea.value);
    document.getElementById('submitAnswerBtn').disabled = textarea.value.trim().length === 0;
  });
}

// ─── Display & Analysis ───────────────────────────
function displayTranscript(text) {
  const box = document.getElementById('transcriptBox');
  let html = text;

  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b(${filler})\\b`, 'gi');
    html = html.replace(regex, `<span class="filler-word">$1</span>`);
  });

  box.innerHTML = html || '<span class="transcript-placeholder">Your spoken words will appear here automatically...</span>';
}

function updateLiveAnalysis(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  document.getElementById('wordCount').textContent = words.length;

  const fillers = FILLER_WORDS.filter(f => {
    const re = new RegExp(`\\b${f}\\b`, 'gi');
    return (text.match(re) || []).length > 0;
  });
  const fillerCount = fillers.reduce((count, f) => {
    const re = new RegExp(`\\b${f}\\b`, 'gi');
    return count + (text.match(re) || []).length;
  }, 0);
  const fillerEl = document.getElementById('fillerCount');
  fillerEl.textContent = fillerCount;
  fillerEl.className = 'la-val ' + (fillerCount > 5 ? 'bad' : fillerCount > 2 ? 'warn' : 'good');

  // Simple sentiment analysis
  const positiveWords = ['good', 'great', 'excellent', 'understand', 'know', 'experience', 'worked', 'implemented', 'built', 'designed', 'developed', 'achieved', 'solved'];
  const negativeWords = ["don't", "doesn't", "can't", "not sure", "never", 'difficult', 'hard', 'struggle'];
  const posCount = positiveWords.filter(w => text.toLowerCase().includes(w)).length;
  const negCount = negativeWords.filter(w => text.toLowerCase().includes(w)).length;
  const toneEl = document.getElementById('toneVal');
  if (posCount > negCount) { toneEl.textContent = 'Positive'; toneEl.className = 'la-val good'; }
  else if (negCount > posCount) { toneEl.textContent = 'Negative'; toneEl.className = 'la-val bad'; }
  else { toneEl.textContent = 'Neutral'; toneEl.className = 'la-val'; }

  // Simple confidence (based on word count and structure)
  const confScore = Math.min(100, Math.max(30, words.length * 2.5 - fillerCount * 5));
  const confEl = document.getElementById('confVal');
  confEl.textContent = Math.round(confScore) + '%';
  confEl.className = 'la-val ' + (confScore >= 70 ? 'good' : confScore >= 50 ? 'warn' : 'bad');
}

function animateWaveBars(active) {
  document.querySelectorAll('.vv-bar').forEach((bar, i) => {
    if (active) {
      bar.classList.add('active');
      bar.style.height = (Math.random() * 60 + 20) + '%';
    } else {
      bar.classList.remove('active');
      bar.style.height = 'var(--h)';
    }
  });

  if (active) {
    window._waveInterval = setInterval(() => {
      document.querySelectorAll('.vv-bar').forEach(bar => {
        bar.style.height = (Math.random() * 60 + 20) + '%';
      });
    }, 150);
  } else {
    clearInterval(window._waveInterval);
  }
}

// ─── Answer Submit ────────────────────────────────
function setupActionButtons() {
  document.getElementById('submitAnswerBtn')?.addEventListener('click', submitAnswer);
  document.getElementById('skipBtn')?.addEventListener('click', skipQuestion);
  document.getElementById('clearTranscript')?.addEventListener('click', () => {
    interviewState.transcript = '';
    displayTranscript('');
    document.getElementById('submitAnswerBtn').disabled = true;
  });
  document.getElementById('editTranscript')?.addEventListener('click', () => {
    const editBox = document.getElementById('transcriptEditBox');
    const transcriptBox = document.getElementById('transcriptBox');
    const isEditing = !editBox.classList.contains('hidden');
    editBox.classList.toggle('hidden', isEditing);
    transcriptBox.style.display = isEditing ? 'block' : 'none';
    if (!isEditing) {
      document.getElementById('transcriptEditArea').value = interviewState.transcript;
    }
  });
  document.getElementById('showHintBtn')?.addEventListener('click', () => {
    const hint = document.getElementById('questionHint');
    hint.style.display = hint.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('toggleIdeal')?.addEventListener('click', () => {
    const content = document.getElementById('idealContent');
    content.classList.toggle('hidden');
    document.getElementById('toggleIdeal').textContent = content.classList.contains('hidden') ? 'Show' : 'Hide';
  });
  document.getElementById('nextQuestionBtn')?.addEventListener('click', moveToNextQuestion);
}

async function submitAnswer() {
  const answer = interviewState.transcript;
  if (!answer.trim()) { Toast.warning('Please record or type your answer first'); return; }

  interviewState.isProcessing = true;
  clearInterval(interviewState.timer);
  stopRecording();
  openEvalModal();

  try {
    const token = await API.getToken();
    const q = interviewState.questions[interviewState.currentQ];

    const result = await API.post('/interview/evaluate-answer', {
      interviewId: interviewState.interviewId,
      questionIndex: interviewState.currentQ,
      question: q.text,
      answer,
      role: interviewState.config.role,
      difficulty: interviewState.config.difficulty,
    }, token);

    interviewState.scores.push(result);
    interviewState.answers.push({
      question: q.text,
      answer,
      evaluation: result,
      questionIndex: interviewState.currentQ
    });

    displayEvalResult(result);
  } catch (err) {
    console.error('Evaluation error:', err);
    // Fallback evaluation
    const fallback = generateFallbackEvaluation(answer, interviewState.questions[interviewState.currentQ]);
    interviewState.scores.push(fallback);
    interviewState.answers.push({
      question: interviewState.questions[interviewState.currentQ].text,
      answer,
      evaluation: fallback,
      questionIndex: interviewState.currentQ
    });
    displayEvalResult(fallback);
  }
}

function skipQuestion() {
  interviewState.answers.push({
    question: interviewState.questions[interviewState.currentQ].text,
    answer: '[Skipped]',
    evaluation: { score: 0, skipped: true }
  });
  moveToNextQuestion();
}

function moveToNextQuestion() {
  closeEvalModal();
  interviewState.isProcessing = false;
  interviewState.currentQ++;

  if (interviewState.currentQ >= interviewState.questions.length) {
    endInterview();
  } else {
    // Check if AI wants to ask a follow-up
    const lastScore = interviewState.scores[interviewState.scores.length - 1];
    if (lastScore?.followup && interviewState.scores.length < 3) {
      const followupQ = {
        text: lastScore.followup,
        category: interviewState.questions[interviewState.currentQ - 1].category,
        isFollowup: true,
        hint: ''
      };
      interviewState.questions.splice(interviewState.currentQ, 0, followupQ);
      document.getElementById('qTotalNum').textContent = interviewState.questions.length;
    }
    displayQuestion(interviewState.currentQ);
  }
}

// ─── Eval Modal ───────────────────────────────────
function openEvalModal() {
  const modal = document.getElementById('evalModal');
  modal.classList.add('open');
  document.getElementById('evalLoading').style.display = 'block';
  document.getElementById('evalResult').classList.add('hidden');
}

function closeEvalModal() {
  document.getElementById('evalModal').classList.remove('open');
}

function displayEvalResult(result) {
  document.getElementById('evalLoading').style.display = 'none';
  document.getElementById('evalResult').classList.remove('hidden');

  const score = result.score || 0;
  document.getElementById('scoreNum').textContent = score;

  // Animate ring
  const ring = document.getElementById('scoreRing');
  const dashoffset = 251 - (score / 100 * 251);
  setTimeout(() => { ring.style.strokeDashoffset = dashoffset; }, 100);

  // Set ring color based on score
  ring.style.stroke = score >= 75 ? '#34d399' : score >= 50 ? '#f59e0b' : '#f87171';

  // Category scores
  const cats = result.categories || {};
  animateProgress('correctnessBar', 'correctnessScore', cats.correctness || score);
  animateProgress('commBar', 'commScore', cats.communication || Math.max(0, score - 10));
  animateProgress('confBar', 'confScore', cats.confidence || Math.max(0, score - 5));

  // Feedback
  document.getElementById('aiFeedbackText').textContent = result.feedback || 'Good attempt! Keep practicing to improve your score.';

  // Ideal answer
  if (result.idealAnswer) {
    document.getElementById('evalIdeal').classList.remove('hidden');
    document.getElementById('idealAnswerText').textContent = result.idealAnswer;
  }
}

function animateProgress(barId, scoreId, value) {
  const bar = document.getElementById(barId);
  const score = document.getElementById(scoreId);
  if (!bar || !score) return;
  setTimeout(() => {
    bar.style.width = value + '%';
    score.textContent = value + '%';
  }, 300);
}

// ─── End Interview ────────────────────────────────
function setupEndInterview() {
  document.getElementById('endInterviewBtn')?.addEventListener('click', () => {
    document.getElementById('endModal').classList.remove('hidden');
  });
  document.getElementById('cancelEnd')?.addEventListener('click', () => {
    document.getElementById('endModal').classList.add('hidden');
  });
  document.getElementById('confirmEnd')?.addEventListener('click', endInterview);
}

async function endInterview() {
  document.getElementById('endModal').classList.add('hidden');
  clearInterval(interviewState.timer);
  stopRecording();

  Toast.info('Saving your results...');

  try {
    const token = await API.getToken();
    await API.post('/interview/save-results', {
      interviewId: interviewState.interviewId,
      answers: interviewState.answers,
      scores: interviewState.scores,
      config: interviewState.config,
    }, token);
  } catch (err) {
    console.warn('Save error (will show cached results):', err);
    sessionStorage.setItem('lastInterviewResults', JSON.stringify({
      answers: interviewState.answers,
      scores: interviewState.scores,
      config: interviewState.config,
    }));
  }

  setTimeout(() => {
    window.location.href = `report.html?id=${interviewState.interviewId}`;
  }, 800);
}

// ─── Reset UI ────────────────────────────────────
function resetAnswerUI() {
  interviewState.transcript = '';
  interviewState.isRecording = false;
  displayTranscript('');
  setMicState('idle');
  document.getElementById('submitAnswerBtn').disabled = true;
  document.getElementById('wordCount').textContent = '0';
  document.getElementById('fillerCount').textContent = '0';
  document.getElementById('toneVal').textContent = '--';
  document.getElementById('confVal').textContent = '--';
  document.getElementById('timerDisplay').className = 'timer-display';
  document.getElementById('transcriptEditBox').classList.add('hidden');
  document.getElementById('transcriptBox').style.display = 'block';
  animateWaveBars(false);
}

function setMicState(state) {
  const btn = document.getElementById('micBtn');
  const label = document.getElementById('micLabel');
  btn.className = `mic-btn ${state}`;
  if (state === 'recording') {
    label.textContent = 'Tap to Stop';
    btn.querySelector('.mic-icon').textContent = '⏹';
  } else {
    label.textContent = 'Start Answering';
    btn.querySelector('.mic-icon').textContent = '🎤';
  }
}

function setAIStatus(state, text) {
  const dot = document.querySelector('.status-dot');
  const textEl = document.getElementById('aiStatusText');
  if (dot) { dot.className = `status-dot ${state}`; }
  if (textEl) textEl.textContent = text;

  const waves = document.getElementById('speakingWaves');
  if (waves) waves.classList.toggle('active', state === 'speaking');
}

// ─── Fallbacks ────────────────────────────────────
function getFallbackQuestions(config) {
  const sets = {
    frontend: [
      { text: 'Explain the difference between var, let, and const in JavaScript.', category: 'JavaScript', hint: 'Think about scope and hoisting' },
      { text: 'What is the Virtual DOM in React and how does it improve performance?', category: 'React', hint: 'Consider reconciliation' },
      { text: 'Explain CSS Box Model and its components.', category: 'CSS', hint: 'Think about margin, border, padding, content' },
      { text: 'What are closures in JavaScript? Give a real-world example.', category: 'JavaScript', hint: 'Think about function scope' },
      { text: 'How does event delegation work in the DOM?', category: 'DOM', hint: 'Think about event bubbling' },
    ],
    backend: [
      { text: 'What is the difference between REST and GraphQL?', category: 'API Design', hint: 'Think about data fetching' },
      { text: 'Explain database indexing and when to use it.', category: 'Database', hint: 'Think about query performance' },
      { text: 'What are middleware functions in Express.js?', category: 'Node.js', hint: 'Think about request pipeline' },
      { text: 'Explain JWT authentication and its flow.', category: 'Security', hint: 'Think about stateless auth' },
      { text: 'What is N+1 query problem and how to solve it?', category: 'Database', hint: 'Think about eager loading' },
    ],
    java: [
      { text: 'Explain OOP principles with examples.', category: 'OOP', hint: 'SOLID principles' },
      { text: 'What is the difference between HashMap and TreeMap?', category: 'Collections', hint: 'Think about ordering' },
      { text: 'Explain Java Memory Model and garbage collection.', category: 'JVM', hint: 'Heap, Stack, GC roots' },
      { text: 'What are design patterns? Explain Singleton.', category: 'Design Patterns', hint: 'Think about instance control' },
      { text: 'Explain Spring Boot auto-configuration.', category: 'Spring', hint: 'Think about @SpringBootApplication' },
    ],
    hr: [
      { text: 'Tell me about yourself and your background.', category: 'Introduction', hint: 'Use STAR method: past, present, future' },
      { text: 'What are your greatest strengths and weaknesses?', category: 'Self-assessment', hint: 'Be honest and show self-awareness' },
      { text: 'Where do you see yourself in 5 years?', category: 'Goals', hint: 'Align with company growth' },
      { text: 'Describe a challenging situation you faced and how you handled it.', category: 'Behavioral', hint: 'Use STAR: Situation, Task, Action, Result' },
      { text: 'Why do you want to work for our company?', category: 'Motivation', hint: 'Research the company beforehand' },
    ],
  };

  return (sets[config.role] || sets.frontend).map((q, i) => ({ ...q, id: i + 1 }));
}

function generateFallbackEvaluation(answer, question) {
  const wordCount = answer.trim().split(/\s+/).length;
  const fillerCount = FILLER_WORDS.filter(f => answer.toLowerCase().includes(f)).length;
  const hasKeywords = (question.hint || '').toLowerCase().split(',').filter(k => answer.toLowerCase().includes(k.trim().toLowerCase())).length;

  const base = Math.min(95, Math.max(30,
    wordCount * 0.8 - fillerCount * 3 + hasKeywords * 10 + Math.random() * 10
  ));
  const score = Math.round(base);

  return {
    score,
    categories: {
      correctness: Math.round(score * (0.8 + Math.random() * 0.4)),
      communication: Math.round(Math.max(30, 80 - fillerCount * 5 + Math.random() * 20)),
      confidence: Math.round(Math.min(95, wordCount * 0.7 + Math.random() * 20)),
    },
    feedback: score >= 75
      ? `Good answer! You covered the key concepts well. ${fillerCount > 2 ? 'Try to reduce filler words for better clarity.' : 'Your communication was clear.'}`
      : score >= 50
        ? `Decent attempt! You touched on some important points but could provide more depth and examples. Focus on ${question.hint || 'the core concepts'}.`
        : `Your answer needs improvement. Try to explain the concept more thoroughly with examples. Hint: ${question.hint || 'Review the fundamentals.'}`,
    idealAnswer: `A strong answer for this question would cover: ${question.hint || 'the core concepts thoroughly, with practical examples and clear explanation of trade-offs.'}`,
    followup: wordCount < 50 ? `Can you elaborate more on how you would apply this in a real project?` : null,
  };
}
