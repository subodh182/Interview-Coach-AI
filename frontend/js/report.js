/* ================================================
   report.js
================================================ */
window.addEventListener('userReady', async (e) => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  await loadReport(id, e.detail);
});

async function loadReport(id, user) {
  try {
    // Try fetching from Firestore
    const { doc, getDoc } = window.firebaseFunctions;
    const snap = await getDoc(doc(window.firebaseDB, 'interviews', id));
    if (snap.exists()) {
      renderReport(snap.data());
    } else {
      // Fallback to session
      const cached = JSON.parse(sessionStorage.getItem('lastInterviewResults') || 'null');
      if (cached) renderReport({ ...cached, id, userId: user.uid });
      else throw new Error('Report not found');
    }
  } catch (err) {
    const cached = JSON.parse(sessionStorage.getItem('lastInterviewResults') || 'null');
    if (cached) renderReport({ ...cached, id });
    else { Toast.error('Could not load report'); setTimeout(() => location.href='dashboard.html', 2000); }
  }
}

function renderReport(data) {
  document.getElementById('reportLoading').style.display = 'none';
  document.getElementById('reportMain').classList.remove('hidden');

  const answers = data.answers || [];
  const scores = data.scores || answers.map(a => a.evaluation || {});
  const config = data.config || {};

  const avgScore = scores.length
    ? Math.round(scores.reduce((s, e) => s + (e.score || 0), 0) / scores.filter(e => !e.skipped).length || 0)
    : 0;

  // Hero
  document.getElementById('bigScore').textContent = avgScore;
  document.getElementById('reportTitle').textContent = avgScore >= 75 ? 'Excellent Performance!' : avgScore >= 50 ? 'Good Effort!' : 'Keep Practicing!';
  const roleMap = { frontend:'Frontend Developer', backend:'Backend Developer', fullstack:'Full Stack Developer', java:'Java Developer', python:'Python Developer', devops:'DevOps Engineer', datascience:'Data Science', android:'Android Developer', hr:'HR Interview' };
  document.getElementById('reportSubtitle').textContent = `${roleMap[config.role] || 'General'} · ${config.mode || 'Technical'} · ${config.difficulty || 'Medium'}`;
  document.getElementById('reportDate').textContent = data.createdAt
    ? `Completed on ${formatDate(data.createdAt)}`
    : `Completed just now`;
  document.getElementById('scoreTrophy').textContent = avgScore >= 75 ? '🏆' : avgScore >= 50 ? '🥈' : '💪';

  // Score ring
  const ring = document.getElementById('bigScoreRing');
  setTimeout(() => {
    ring.style.strokeDashoffset = 314 - (avgScore / 100 * 314);
    ring.style.stroke = avgScore >= 75 ? '#34d399' : avgScore >= 50 ? '#f59e0b' : '#f87171';
  }, 300);

  // Grade
  const gradeEl = document.getElementById('scoreGrade');
  let grade, gradeClass;
  if (avgScore >= 85) { grade = 'Grade A'; gradeClass = 'grade-A'; }
  else if (avgScore >= 70) { grade = 'Grade B'; gradeClass = 'grade-B'; }
  else if (avgScore >= 50) { grade = 'Grade C'; gradeClass = 'grade-C'; }
  else { grade = 'Grade D'; gradeClass = 'grade-D'; }
  gradeEl.textContent = grade;
  gradeEl.className = `score-grade ${gradeClass}`;

  // Breakdown
  const avgCats = scores.filter(s => !s.skipped).reduce((acc, e) => {
    acc.correctness += e.categories?.correctness || e.score || 0;
    acc.communication += e.categories?.communication || Math.max(0, (e.score || 0) - 5);
    acc.confidence += e.categories?.confidence || Math.max(0, (e.score || 0) - 8);
    return acc;
  }, { correctness: 0, communication: 0, confidence: 0 });
  const n = scores.filter(s => !s.skipped).length || 1;
  setBar('sbCorrectness', 'sbCorrectnessScore', Math.round(avgCats.correctness / n));
  setBar('sbComm', 'sbCommScore', Math.round(avgCats.communication / n));
  setBar('sbConf', 'sbConfScore', Math.round(avgCats.confidence / n));

  // Stats
  const skipped = answers.filter(a => a.answer === '[Skipped]').length;
  document.getElementById('rsTotalQ').textContent = answers.length;
  document.getElementById('rsAnswered').textContent = answers.length - skipped;
  document.getElementById('rsSkipped').textContent = skipped;
  document.getElementById('rsDuration').textContent = data.duration
    ? Math.round(data.duration / 60) + ' min'
    : '--';

  // Charts
  initQScoreChart(scores);
  initCommStats(answers);

  // Tips
  generateAITips(avgScore, avgCats, n, config);

  // Q&A
  renderQAList(answers, scores);
}

function setBar(barId, scoreId, val) {
  setTimeout(() => {
    document.getElementById(barId).style.width = val + '%';
    document.getElementById(scoreId).textContent = val + '%';
  }, 400);
}

function initQScoreChart(scores) {
  const ctx = document.getElementById('qScoreChart')?.getContext('2d');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: scores.map((_, i) => `Q${i + 1}`),
      datasets: [{
        label: 'Score',
        data: scores.map(s => s.score || 0),
        backgroundColor: scores.map(s => {
          const v = s.score || 0;
          return v >= 75 ? 'rgba(52,211,153,0.7)' : v >= 50 ? 'rgba(245,158,11,0.7)' : 'rgba(248,113,113,0.7)';
        }),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: '#111827', borderColor: '#1e2d45', borderWidth: 1,
        titleColor: '#f0f4ff', bodyColor: '#8899bb', padding: 10,
        callbacks: { label: ctx => `Score: ${ctx.raw}/100` }
      }},
      scales: {
        x: { grid: { display: false }, ticks: { color: '#4d6080', font: { size: 11 } } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4d6080', font: { size: 11 }, callback: v => v + '%' } }
      }
    }
  });
}

function initCommStats(answers) {
  const allText = answers.map(a => a.answer || '').join(' ');
  const words = allText.trim().split(/\s+/).filter(Boolean);
  const FILLERS = ['um','uh','like','you know','basically','literally','actually','so','right','kind of','sort of'];
  const fillerCount = FILLERS.reduce((c, f) => c + (allText.toLowerCase().match(new RegExp(`\\b${f}\\b`, 'g')) || []).length, 0);
  const posWords = ['good','great','experience','implemented','built','designed','solved','achieved','understand','worked'];
  const posCount = posWords.filter(w => allText.toLowerCase().includes(w)).length;

  document.getElementById('csTotalWords').textContent = words.length;
  const fe = document.getElementById('csFillers');
  fe.textContent = fillerCount;
  fe.className = 'cs-val ' + (fillerCount > 10 ? 'warn' : 'good');
  document.getElementById('csTone').textContent = posCount > 5 ? 'Positive 😊' : 'Neutral 😐';
  const avgWordsPerAnswer = answers.length ? Math.round(words.length / answers.length) : 0;
  document.getElementById('csConf').textContent = avgWordsPerAnswer > 60 ? 'High' : avgWordsPerAnswer > 30 ? 'Medium' : 'Low';
}

function generateAITips(avgScore, cats, n, config) {
  const strengths = [], improvements = [];
  const corrScore = Math.round(cats.correctness / n);
  const commScore = Math.round(cats.communication / n);
  const confScore = Math.round(cats.confidence / n);

  if (corrScore >= 70) strengths.push({ text: 'Strong technical knowledge demonstrated across questions.' });
  else improvements.push({ text: `Deepen understanding of ${config.role} core concepts. Review fundamentals.` });

  if (commScore >= 70) strengths.push({ text: 'Clear and structured communication style.' });
  else improvements.push({ text: 'Work on reducing filler words and structuring answers using STAR/PREP method.' });

  if (confScore >= 70) strengths.push({ text: 'Answered confidently with good detail and examples.' });
  else improvements.push({ text: 'Practice speaking confidently. Give more concrete examples in your answers.' });

  if (avgScore >= 80) strengths.push({ text: 'Overall excellent performance — ready for real interviews!' });
  else if (avgScore < 50) improvements.push({ text: 'Schedule daily 15-minute practice sessions on InterviewAI to build consistency.' });

  const html = `<div class="tips-grid">
    ${strengths.slice(0,2).map(t => `
      <div class="tip-item strength">
        <div class="tip-label green">💪 Strength</div>
        <p class="tip-text">${t.text}</p>
      </div>`).join('')}
    ${improvements.slice(0,2).map(t => `
      <div class="tip-item improve">
        <div class="tip-label yellow">📈 Improve</div>
        <p class="tip-text">${t.text}</p>
      </div>`).join('')}
  </div>`;
  document.getElementById('aiTipsContent').innerHTML = html;
}

function renderQAList(answers, scores) {
  const container = document.getElementById('qaList');
  if (!answers.length) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No answers recorded.</p>'; return; }

  container.innerHTML = answers.map((a, i) => {
    const ev = a.evaluation || scores[i] || {};
    const score = ev.score || 0;
    const badgeClass = score >= 75 ? 'badge-green' : score >= 50 ? 'badge-yellow' : 'badge-red';
    const skipped = a.answer === '[Skipped]';
    return `
    <div class="qa-item" id="qa-${i}">
      <div class="qa-header" onclick="toggleQA(${i})">
        <span class="qa-num">${i + 1}</span>
        <span class="qa-question">${a.question}</span>
        <span class="qa-score-badge badge ${badgeClass}">${skipped ? 'Skipped' : score + '/100'}</span>
        <span class="qa-chevron">▼</span>
      </div>
      <div class="qa-body">
        <div class="qa-answer-box">
          <p class="qa-section-label">Your Answer</p>
          <div class="qa-answer-text">${a.answer || 'No answer recorded'}</div>
        </div>
        ${!skipped && ev.feedback ? `
        <div class="qa-answer-box" style="margin-top:12px">
          <p class="qa-section-label">AI Feedback</p>
          <p class="qa-feedback-text">${ev.feedback}</p>
        </div>` : ''}
        ${ev.idealAnswer ? `
        <div class="qa-answer-box" style="margin-top:12px">
          <p class="qa-section-label">💡 Ideal Answer</p>
          <p class="qa-ideal-text">${ev.idealAnswer}</p>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function toggleQA(i) {
  const item = document.getElementById(`qa-${i}`);
  item.classList.toggle('open');
}

// PDF Download
document.getElementById('downloadPDFBtn')?.addEventListener('click', () => {
  Toast.info('Preparing PDF... please wait');
  window.print();
});
