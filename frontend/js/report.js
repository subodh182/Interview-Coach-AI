/* report.js – Fixed with Realtime DB + score display */

window.addEventListener('userReady', async (e) => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  await loadReport(id, e.detail);
});

async function loadReport(id, user) {
  const cached = JSON.parse(
    sessionStorage.getItem('lastInterviewResults') || 'null'
  );

  if (cached && (cached.id === id || !id || id === 'undefined')) {
    renderReport(cached);
    return;
  }

  try {
    if (window.firebaseDB && user && id && !id.startsWith('local_')) {
      const { ref, get } = window.firebaseFunctions;
      const snap = await get(
        ref(window.firebaseDB, `userInterviews/${user.uid}/${id}`)
      );
      if (snap.exists()) {
        renderReport({ id, ...snap.val() });
        return;
      }
    }
  } catch (err) {
    console.warn('DB load failed:', err);
  }

  if (cached) {
    renderReport(cached);
    return;
  }

  document.getElementById('reportLoading').innerHTML = `
    <p style="color:var(--accent-danger);text-align:center">
      Report not found. 
      <a href="dashboard.html" style="color:var(--accent)">Go to Dashboard</a>
    </p>`;
}

function renderReport(data) {
  document.getElementById('reportLoading').style.display = 'none';
  document.getElementById('reportMain').classList.remove('hidden');

  const answers = data.answers || [];
  const scores = data.scores || answers.map(a => a.evaluation || {});
  const config = data.config || data;

  // Use saved avgScore if available
  const avgScore = data.score || (scores.filter(s=>!s.skipped&&s.score>0).length
    ? Math.round(scores.filter(s=>!s.skipped&&s.score>0).reduce((s,e)=>s+e.score,0)/scores.filter(s=>!s.skipped&&s.score>0).length)
    : 0);

  // Hero
  document.getElementById('bigScore').textContent = avgScore;
  document.getElementById('reportTitle').textContent = avgScore>=85?'Excellent Performance!':avgScore>=70?'Great Job!':avgScore>=50?'Good Effort!':'Keep Practicing!';
  const roleMap={frontend:'Frontend Developer',backend:'Backend Developer',fullstack:'Full Stack Developer',java:'Java Developer',python:'Python Developer',devops:'DevOps Engineer',datascience:'Data Science',android:'Android Developer',hr:'HR Interview'};
  document.getElementById('reportSubtitle').textContent = `${roleMap[config.role]||'General'} · ${config.mode||'Technical'} · ${config.difficulty||'Medium'}`;
  document.getElementById('reportDate').textContent = data.createdAt ? 'Completed on ' + new Date(data.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'Completed just now';
  document.getElementById('scoreTrophy').textContent = avgScore>=85?'🏆':avgScore>=70?'🥈':'💪';

  // Animate score ring
  const ring = document.getElementById('bigScoreRing');
  setTimeout(() => {
    ring.style.strokeDashoffset = 314 - (avgScore/100*314);
    ring.style.stroke = avgScore>=75?'#34d399':avgScore>=50?'#f59e0b':'#f87171';
  }, 300);

  // Grade
  const gradeEl = document.getElementById('scoreGrade');
  const [grade,cls] = avgScore>=85?['Grade A','grade-A']:avgScore>=70?['Grade B','grade-B']:avgScore>=50?['Grade C','grade-C']:['Grade D','grade-D'];
  gradeEl.textContent = grade; gradeEl.className = `score-grade ${cls}`;

  // Category breakdowns
  const valid = scores.filter(s=>!s.skipped&&s.score>0);
  const n = valid.length||1;
  const cats = valid.reduce((acc,s)=>{ acc.c+=(s.categories?.correctness||s.score||0); acc.m+=(s.categories?.communication||Math.max(0,(s.score||0)-5)); acc.f+=(s.categories?.confidence||Math.max(0,(s.score||0)-8)); return acc; },{c:0,m:0,f:0});
  setBar('sbCorrectness','sbCorrectnessScore',Math.round(cats.c/n));
  setBar('sbComm','sbCommScore',Math.round(cats.m/n));
  setBar('sbConf','sbConfScore',Math.round(cats.f/n));

  // Stats cards
  const skipped = answers.filter(a=>a.answer==='[Skipped]').length;
  document.getElementById('rsTotalQ').textContent = answers.length;
  document.getElementById('rsAnswered').textContent = answers.length-skipped;
  document.getElementById('rsSkipped').textContent = skipped;
  document.getElementById('rsDuration').textContent = data.duration?Math.round(data.duration/60)+' min':'--';

  // Charts
  initQScoreChart(scores);
  initCommStats(answers);
  generateAITips(avgScore, {correctness:Math.round(cats.c/n),communication:Math.round(cats.m/n),confidence:Math.round(cats.f/n)}, config);
  renderQAList(answers, scores);
}

function setBar(barId, scoreId, val) {
  setTimeout(()=>{ const b=document.getElementById(barId); const s=document.getElementById(scoreId); if(b)b.style.width=val+'%'; if(s)s.textContent=val+'%'; },400);
}

function initQScoreChart(scores) {
  const ctx = document.getElementById('qScoreChart')?.getContext('2d');
  if (!ctx) return;
  new Chart(ctx, {
    type:'bar',
    data:{labels:scores.map((_,i)=>`Q${i+1}`),datasets:[{label:'Score',data:scores.map(s=>s.score||0),backgroundColor:scores.map(s=>{const v=s.score||0;return v>=75?'rgba(52,211,153,0.7)':v>=50?'rgba(245,158,11,0.7)':'rgba(248,113,113,0.7)';}),borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111827',borderColor:'#1e2d45',borderWidth:1,titleColor:'#f0f4ff',bodyColor:'#8899bb',padding:10,callbacks:{label:ctx=>`Score: ${ctx.raw}/100`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#4d6080',font:{size:11}}},y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#4d6080',font:{size:11},callback:v=>v+'%'}}}}
  });
}

function initCommStats(answers) {
  const text = answers.map(a=>a.answer||'').join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  const FILLERS=['um','uh','like','you know','basically','literally','actually','so','right'];
  const fc = FILLERS.reduce((c,f)=>c+(text.toLowerCase().match(new RegExp(`\\b${f}\\b`,'g'))||[]).length,0);
  const posWords=['good','great','experience','implemented','built','designed','solved'];
  const pos = posWords.filter(w=>text.toLowerCase().includes(w)).length;
  document.getElementById('csTotalWords').textContent = words.length;
  const fe=document.getElementById('csFillers'); fe.textContent=fc; fe.className='cs-val '+(fc>10?'warn':'good');
  document.getElementById('csTone').textContent = pos>5?'Positive 😊':'Neutral 😐';
  const avgW = answers.length?Math.round(words.length/answers.length):0;
  document.getElementById('csConf').textContent = avgW>60?'High':avgW>30?'Medium':'Low';
}

function generateAITips(avgScore, cats, config) {
  const strengths=[], improvements=[];
  if(cats.correctness>=70) strengths.push('Strong technical knowledge demonstrated with good accuracy.');
  else improvements.push(`Deepen core ${config.role||'technical'} concepts. Review fundamentals regularly.`);
  if(cats.communication>=70) strengths.push('Clear and well-structured communication throughout.');
  else improvements.push('Use the STAR method for answers. Reduce filler words for clarity.');
  if(cats.confidence>=70) strengths.push('Confident delivery with good detail and examples.');
  else improvements.push('Practice speaking with more confidence. Give real-world examples.');
  if(avgScore>=80) strengths.push('Overall excellent — you are interview ready!');
  else if(avgScore<50) improvements.push('Practice daily on InterviewAI. Consistency is key.');

  const html=`<div class="tips-grid">
    ${strengths.slice(0,2).map(t=>`<div class="tip-item strength"><div class="tip-label green">💪 Strength</div><p class="tip-text">${t}</p></div>`).join('')}
    ${improvements.slice(0,2).map(t=>`<div class="tip-item improve"><div class="tip-label yellow">📈 Improve</div><p class="tip-text">${t}</p></div>`).join('')}
  </div>`;
  document.getElementById('aiTipsContent').innerHTML = html;
}

function renderQAList(answers, scores) {
  const container = document.getElementById('qaList');
  if (!answers.length) { container.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:20px">No answers recorded.</p>'; return; }
  container.innerHTML = answers.map((a,i)=>{
    const ev=a.evaluation||scores[i]||{};
    const score=ev.score||0; const skip=a.answer==='[Skipped]';
    const bc=score>=75?'badge-green':score>=50?'badge-yellow':'badge-red';
    return `<div class="qa-item" id="qa-${i}">
      <div class="qa-header" onclick="toggleQA(${i})">
        <span class="qa-num">${i+1}</span>
        <span class="qa-question">${a.question}</span>
        <span class="qa-score-badge badge ${bc}">${skip?'Skipped':score+'/100'}</span>
        <span class="qa-chevron" id="chev${i}">▼</span>
      </div>
      <div class="qa-body" id="qb${i}">
        <div class="qa-answer-box" style="margin-top:12px"><p class="qa-section-label">Your Answer</p><div class="qa-answer-text">${a.answer||'No answer recorded'}</div></div>
        ${!skip&&ev.feedback?`<div class="qa-answer-box" style="margin-top:10px"><p class="qa-section-label">AI Feedback</p><p class="qa-feedback-text">${ev.feedback}</p></div>`:''}
        ${ev.idealAnswer?`<div class="qa-answer-box" style="margin-top:10px"><p class="qa-section-label">💡 Ideal Answer</p><p class="qa-ideal-text">${ev.idealAnswer}</p></div>`:''}
      </div>
    </div>`;
  }).join('');
}

function toggleQA(i) {
  const b=document.getElementById('qb'+i), c=document.getElementById('chev'+i);
  const open=b.classList.toggle('open');
  c.style.transform=open?'rotate(180deg)':'';
}

document.getElementById('downloadPDFBtn')?.addEventListener('click',()=>{ Toast.info('Preparing PDF...'); setTimeout(()=>window.print(),500); });
