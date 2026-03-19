/* interview.js – Fixed: introduce yourself first, history save, AI questions */

const FILLER_WORDS = ['um','uh','like','you know','basically','literally','actually','so','right','okay','kind of','sort of','i mean','well'];

let interviewState = {
  config: null, questions: [], currentQ: 0, answers: [],
  scores: [], timer: null, timeLeft: 120, recognition: null,
  isRecording: false, transcript: '', interviewId: null, isProcessing: false,
};

document.addEventListener('DOMContentLoaded', async () => {
  const config = Session.getInterviewConfig();
  if (!config) { Toast.error('Config not found. Redirecting...'); setTimeout(()=>window.location.href='setup.html',1500); return; }
  interviewState.config = config;
  interviewState.timeLeft = config.timeLimit || 120;
  setupUI(config);
  setupMicButton();
  setupActionButtons();
  setupEndInterview();
  await generateQuestions(config);
});

function setupUI(config) {
  const roleLabels = {frontend:'Frontend Developer',backend:'Backend Developer',fullstack:'Full Stack Developer',java:'Java Developer',python:'Python Developer',devops:'DevOps Engineer',datascience:'Data Science',android:'Android Developer',hr:'HR Interview'};
  document.getElementById('headerRole').textContent = roleLabels[config.role] || config.role;
  document.getElementById('headerType').textContent = `${config.mode?.charAt(0).toUpperCase()+config.mode?.slice(1)} · ${config.difficulty?.charAt(0).toUpperCase()+config.difficulty?.slice(1)}`;
}

// ─── Generate Questions ────────────────────────────
async function generateQuestions(config) {
  setAIStatus('thinking','Preparing your questions...');
  document.getElementById('questionText').textContent = 'Loading your personalized questions...';

  // Always start with "Introduce Yourself"
  const introQ = {
    id: 0,
    text: 'Please introduce yourself — your name, educational background, technical skills, and why you are interested in this role.',
    category: 'Introduction',
    hint: 'Mention: name, education, key skills, experience, and career goal',
    type: 'introduction',
    isIntro: true,
  };

  try {
    const token = await API.getToken();
    const result = await API.post('/api/interview/generate-questions', config, token);
    interviewState.questions = [introQ, ...result.questions];
    interviewState.interviewId = result.interviewId;
    Session.setCurrentInterview({ id: result.interviewId, ...config });
  } catch (err) {
    console.warn('Using fallback questions');
    interviewState.questions = [introQ, ...getFallbackQuestions(config)];
    interviewState.interviewId = 'local_' + Date.now();
  }

  document.getElementById('qTotalNum').textContent = interviewState.questions.length;
  displayQuestion(0);
}

function displayQuestion(index) {
  const q = interviewState.questions[index];
  if (!q) { endInterview(); return; }
  const total = interviewState.questions.length;
  document.getElementById('qCurrentNum').textContent = index + 1;
  document.getElementById('headerProgress').style.width = ((index+1)/total*100)+'%';
  document.getElementById('qBadgeNum').textContent = `Q${index+1}`;
  document.getElementById('qCategory').textContent = q.category || 'Technical';
  document.getElementById('questionText').textContent = q.text;
  document.getElementById('hintText').textContent = q.hint || '';
  document.getElementById('questionHint').style.display = 'none';
  document.getElementById('followupBadge').classList.toggle('hidden', !q.isFollowup);
  resetAnswerUI();
  setAIStatus('listening','Waiting for your answer...');
  if (interviewState.config.timeLimit > 0) startTimer();
}

// ─── Timer ────────────────────────────────────────
function startTimer() {
  clearInterval(interviewState.timer);
  const limit = interviewState.config.timeLimit;
  if (!limit) { document.getElementById('timerDisplay').style.display='none'; return; }
  interviewState.timeLeft = limit;
  updateTimerDisplay();
  interviewState.timer = setInterval(() => {
    interviewState.timeLeft--;
    updateTimerDisplay();
    const td = document.getElementById('timerDisplay');
    if (interviewState.timeLeft<=30) td.className='timer-display warning';
    if (interviewState.timeLeft<=10) td.className='timer-display critical';
    if (interviewState.timeLeft<=0) { clearInterval(interviewState.timer); if(!interviewState.isProcessing) autoSubmitAnswer(); }
  }, 1000);
}

function updateTimerDisplay() {
  const m=Math.floor(interviewState.timeLeft/60), s=interviewState.timeLeft%60;
  document.getElementById('timerVal').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function autoSubmitAnswer() {
  Toast.info('⏱ Time up! Submitting...');
  setTimeout(()=>submitAnswer(),800);
}

// ─── Speech Recognition ───────────────────────────
function setupMicButton() {
  document.getElementById('micBtn')?.addEventListener('click', toggleRecording);
}

function toggleRecording() {
  interviewState.isRecording ? stopRecording() : startRecording();
}

function startRecording() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { Toast.error('Browser does not support voice. Please type your answer.'); enableTextMode(); return; }

  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let final = interviewState.transcript;

  recognition.onstart = () => {
    interviewState.isRecording = true;
    setMicState('recording');
    setAIStatus('speaking','Listening...');
    document.getElementById('vvStatus').textContent = '🎤 Recording...';
    animateWaveBars(true);
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i=event.resultIndex;i<event.results.length;i++) {
      if (event.results[i].isFinal) final += ' ' + event.results[i][0].transcript;
      else interim = event.results[i][0].transcript;
    }
    interviewState.transcript = final.trim();
    displayTranscript(interviewState.transcript + (interim?' '+interim:''));
    updateLiveAnalysis(interviewState.transcript + ' ' + interim);
  };

  recognition.onerror = (e) => { if(e.error!=='aborted') { console.error('STT error:',e.error); if(e.error==='not-allowed') Toast.error('Microphone access denied.'); } };

  recognition.onend = () => {
    interviewState.isRecording = false;
    setMicState('idle');
    setAIStatus('listening','Answer recorded. Submit when ready.');
    animateWaveBars(false);
    document.getElementById('vvStatus').textContent='Recording stopped';
    if (interviewState.transcript.trim().length>0) document.getElementById('submitAnswerBtn').disabled=false;
  };

  interviewState.recognition = recognition;
  recognition.start();
}

function stopRecording() {
  interviewState.recognition?.stop();
  interviewState.recognition = null;
}

function enableTextMode() {
  document.getElementById('transcriptBox').style.display='none';
  const eb=document.getElementById('transcriptEditBox'); eb.classList.remove('hidden');
  const ta=document.getElementById('transcriptEditArea'); ta.focus();
  ta.addEventListener('input',()=>{
    interviewState.transcript=ta.value;
    updateLiveAnalysis(ta.value);
    document.getElementById('submitAnswerBtn').disabled=ta.value.trim().length===0;
  });
}

function displayTranscript(text) {
  const box=document.getElementById('transcriptBox');
  let html=text;
  FILLER_WORDS.forEach(f=>{ html=html.replace(new RegExp(`\\b(${f})\\b`,'gi'),'<span class="filler-word">$1</span>'); });
  box.innerHTML=html||'<span class="transcript-placeholder">Your spoken words will appear here...</span>';
}

function updateLiveAnalysis(text) {
  const words=text.trim().split(/\s+/).filter(Boolean);
  document.getElementById('wordCount').textContent=words.length;
  const fc=FILLER_WORDS.reduce((c,f)=>c+(text.toLowerCase().match(new RegExp(`\\b${f}\\b`,'g'))||[]).length,0);
  const fe=document.getElementById('fillerCount'); fe.textContent=fc; fe.className='la-val '+(fc>5?'bad':fc>2?'warn':'good');
  const pos=['good','great','experience','implemented','built','designed','solved','achieved','understand'].filter(w=>text.toLowerCase().includes(w)).length;
  const neg=["don't","doesn't","can't","not sure","never"].filter(w=>text.toLowerCase().includes(w)).length;
  const te=document.getElementById('toneVal');
  if(pos>neg){te.textContent='Positive';te.className='la-val good';}else if(neg>pos){te.textContent='Negative';te.className='la-val bad';}else{te.textContent='Neutral';te.className='la-val';}
  const conf=Math.min(100,Math.max(30,words.length*2.5-fc*5));
  const ce=document.getElementById('confVal'); ce.textContent=Math.round(conf)+'%'; ce.className='la-val '+(conf>=70?'good':conf>=50?'warn':'bad');
}

function animateWaveBars(active) {
  document.querySelectorAll('.vv-bar').forEach(bar=>{ bar.classList.toggle('active',active); if(active) bar.style.height=(Math.random()*60+20)+'%'; else bar.style.height='var(--h)'; });
  if(active) window._waveInterval=setInterval(()=>{ document.querySelectorAll('.vv-bar').forEach(bar=>{ bar.style.height=(Math.random()*60+20)+'%'; }); },150);
  else clearInterval(window._waveInterval);
}

// ─── Submit Answer ────────────────────────────────
function setupActionButtons() {
  document.getElementById('submitAnswerBtn')?.addEventListener('click', submitAnswer);
  document.getElementById('skipBtn')?.addEventListener('click', skipQuestion);
  document.getElementById('clearTranscript')?.addEventListener('click',()=>{ interviewState.transcript=''; displayTranscript(''); document.getElementById('submitAnswerBtn').disabled=true; });
  document.getElementById('editTranscript')?.addEventListener('click',()=>{
    const eb=document.getElementById('transcriptEditBox'), tb=document.getElementById('transcriptBox');
    const editing=!eb.classList.contains('hidden');
    eb.classList.toggle('hidden',editing); tb.style.display=editing?'block':'none';
    if(!editing) document.getElementById('transcriptEditArea').value=interviewState.transcript;
  });
  document.getElementById('showHintBtn')?.addEventListener('click',()=>{ const h=document.getElementById('questionHint'); h.style.display=h.style.display==='none'?'flex':'none'; });
  document.getElementById('toggleIdeal')?.addEventListener('click',()=>{
    const c=document.getElementById('idealContent'); c.classList.toggle('hidden');
    document.getElementById('toggleIdeal').textContent=c.classList.contains('hidden')?'Show':'Hide';
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

  const q = interviewState.questions[interviewState.currentQ];
  let evaluation;

  try {
    const token = await API.getToken();
    evaluation = await API.post('/api/interview/evaluate-answer', {
      interviewId: interviewState.interviewId,
      questionIndex: interviewState.currentQ,
      question: q.text,
      answer,
      role: interviewState.config.role,
      difficulty: interviewState.config.difficulty,
    }, token);
  } catch (err) {
    evaluation = generateLocalEvaluation(answer, q);
  }

  interviewState.scores.push(evaluation);
  interviewState.answers.push({ question: q.text, answer, evaluation, questionIndex: interviewState.currentQ });
  displayEvalResult(evaluation);
}

function skipQuestion() {
  clearInterval(interviewState.timer);
  interviewState.answers.push({ question: interviewState.questions[interviewState.currentQ].text, answer:'[Skipped]', evaluation:{score:0,skipped:true} });
  interviewState.scores.push({ score:0, skipped:true });
  moveToNextQuestion();
}

function moveToNextQuestion() {
  closeEvalModal();
  interviewState.isProcessing = false;
  interviewState.currentQ++;

  if (interviewState.currentQ >= interviewState.questions.length) {
    endInterview();
  } else {
    const last = interviewState.scores[interviewState.scores.length-1];
    if (last?.followup && interviewState.scores.filter(s=>s.isFollowup).length<2) {
      const fq = { text:last.followup, category:interviewState.questions[interviewState.currentQ-1].category, isFollowup:true, hint:'' };
      interviewState.questions.splice(interviewState.currentQ,0,fq);
      document.getElementById('qTotalNum').textContent=interviewState.questions.length;
    }
    displayQuestion(interviewState.currentQ);
  }
}

// ─── Eval Modal ───────────────────────────────────
function openEvalModal() { document.getElementById('evalModal').classList.add('open'); document.getElementById('evalLoading').style.display='block'; document.getElementById('evalResult').classList.add('hidden'); }
function closeEvalModal() { document.getElementById('evalModal').classList.remove('open'); }

function displayEvalResult(result) {
  document.getElementById('evalLoading').style.display='none';
  document.getElementById('evalResult').classList.remove('hidden');
  const score=result.score||0;
  document.getElementById('scoreNum').textContent=score;
  const ring=document.getElementById('scoreRing');
  setTimeout(()=>{ ring.style.strokeDashoffset=251-(score/100*251); ring.style.stroke=score>=75?'#34d399':score>=50?'#f59e0b':'#f87171'; },100);
  const cats=result.categories||{};
  animProg('correctnessBar','correctnessScore',cats.correctness||score);
  animProg('commBar','commScore',cats.communication||Math.max(0,score-10));
  animProg('confBar','confScore',cats.confidence||Math.max(0,score-5));
  document.getElementById('aiFeedbackText').textContent=result.feedback||'Good attempt! Keep practicing.';
  if(result.idealAnswer){ document.getElementById('evalIdeal').classList.remove('hidden'); document.getElementById('idealAnswerText').textContent=result.idealAnswer; }
}

function animProg(barId,scoreId,val) {
  setTimeout(()=>{ document.getElementById(barId).style.width=val+'%'; document.getElementById(scoreId).textContent=val+'%'; },300);
}

// ─── End Interview + SAVE HISTORY ────────────────
function setupEndInterview() {
  document.getElementById('endInterviewBtn')?.addEventListener('click',()=>document.getElementById('endModal').classList.remove('hidden'));
  document.getElementById('cancelEnd')?.addEventListener('click',()=>document.getElementById('endModal').classList.add('hidden'));
  document.getElementById('confirmEnd')?.addEventListener('click',endInterview);
}

async function endInterview() {
  document.getElementById('endModal').classList.add('hidden');
  clearInterval(interviewState.timer);
  stopRecording();
  Toast.info('Saving your results...');

  const validScores = interviewState.scores.filter(s => !s.skipped && s.score > 0);
  const avgScore = validScores.length
    ? Math.round(validScores.reduce((s, e) => s + e.score, 0) / validScores.length)
    : 0;

  const interviewId = interviewState.interviewId || ('local_' + Date.now());

  const resultData = {
    id: interviewId,
    role: interviewState.config?.role || 'general',
    mode: interviewState.config?.mode || 'technical',
    difficulty: interviewState.config?.difficulty || 'medium',
    score: avgScore,
    answers: interviewState.answers || [],
    scores: interviewState.scores || [],
    config: interviewState.config || {},
    status: 'completed',
    createdAt: Date.now(),
  };

  // PEHLE sessionStorage mein save karo
  sessionStorage.setItem('lastInterviewResults', JSON.stringify(resultData));
  sessionStorage.setItem('lastInterviewId', interviewId);

  // Phir Firebase mein save karo
  try {
    const user = window.firebaseAuth?.currentUser;
    if (user) {
      const { getDatabase, ref, set, get, update } = await import(
        "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js"
      );
      const db = getDatabase();
      await set(ref(db, `userInterviews/${user.uid}/${interviewId}`), resultData);
      const snap = await get(ref(db, `users/${user.uid}`));
      if (snap.exists()) {
        const ud = snap.val();
        const prev = ud.totalInterviews || 0;
        const prevAvg = ud.avgScore || 0;
        const newAvg = Math.round((prevAvg * prev + avgScore) / (prev + 1));
        await update(ref(db, `users/${user.uid}`), {
          totalInterviews: prev + 1,
          avgScore: newAvg,
          lastInterviewAt: Date.now(),
        });
      }
      Toast.success('Interview saved! ✅');
    }
  } catch (err) {
    console.warn('Firebase save failed:', err);
  }

  setTimeout(() => {
    window.location.href = `report.html?id=${interviewId}`;
  }, 800);
}

  // Save to Firebase Realtime DB
  try {
    if (window.firebaseAuth?.currentUser) {
      const uid = window.firebaseAuth.currentUser.uid;
      // Dynamic import for RTDB
      const { getDatabase, ref, set, update } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js");
      const db = getDatabase();

      // Save interview details
      await set(ref(db, `userInterviews/${uid}/${interviewState.interviewId}`), resultData);

      // Update user stats
      const userRef = ref(db, `users/${uid}`);
      const { get } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js");
      const snap = await get(userRef);
      if (snap.exists()) {
        const ud = snap.val();
        const prevTotal = ud.totalInterviews || 0;
        const prevAvg = ud.avgScore || 0;
        const newAvg = Math.round((prevAvg * prevTotal + avgScore) / (prevTotal + 1));
        await update(userRef, { totalInterviews: prevTotal+1, avgScore: newAvg, lastInterviewAt: Date.now() });
      }
      Toast.success('Interview saved! ✅');
    }
  } catch (err) {
    console.warn('Save error:', err);
    // Fallback: save to sessionStorage so report still works
    sessionStorage.setItem('lastInterviewResults', JSON.stringify(resultData));
  }

  setTimeout(()=>window.location.href=`report.html?id=${interviewState.interviewId}`,800);


// ─── Reset UI ────────────────────────────────────
function resetAnswerUI() {
  interviewState.transcript=''; interviewState.isRecording=false;
  displayTranscript(''); setMicState('idle');
  document.getElementById('submitAnswerBtn').disabled=true;
  document.getElementById('wordCount').textContent='0';
  document.getElementById('fillerCount').textContent='0';
  document.getElementById('toneVal').textContent='--';
  document.getElementById('confVal').textContent='--';
  document.getElementById('timerDisplay').className='timer-display';
  document.getElementById('transcriptEditBox').classList.add('hidden');
  document.getElementById('transcriptBox').style.display='block';
  animateWaveBars(false);
}

function setMicState(state) {
  const btn=document.getElementById('micBtn'), lbl=document.getElementById('micLabel')||document.getElementById('micLbl');
  btn.className=`mic-btn ${state}`;
  if(state==='recording'){if(lbl)lbl.textContent='Tap to Stop'; btn.querySelector('.mic-icon').textContent='⏹';}
  else {if(lbl)lbl.textContent='Start Answering'; btn.querySelector('.mic-icon').textContent='🎤';}
}

function setAIStatus(state,text) {
  const dot=document.querySelector('.status-dot'), textEl=document.getElementById('aiStatusText');
  if(dot) dot.className=`status-dot ${state}`;
  if(textEl) textEl.textContent=text;
  document.getElementById('speakingWaves')?.classList.toggle('active',state==='speaking');
}

// ─── Fallback Questions ────────────────────────────
function getFallbackQuestions(config) {
  const sets = {
    frontend:[
      {text:'What is the difference between var, let, and const in JavaScript?',category:'JavaScript',hint:'Think about scope, hoisting, and reassignment'},
      {text:'Explain the Virtual DOM in React and how it improves performance.',category:'React',hint:'Consider reconciliation and diffing algorithm'},
      {text:'What is CSS Flexbox? Give a practical layout example.',category:'CSS',hint:'Think about flex-direction, justify-content, align-items'},
      {text:'How does event delegation work in JavaScript?',category:'DOM',hint:'Think about event bubbling and parentElement'},
      {text:'Explain async/await in JavaScript with an example.',category:'JavaScript',hint:'Think about Promises and error handling with try/catch'},
    ],
    backend:[
      {text:'What is the difference between REST and GraphQL?',category:'API Design',hint:'Think about data fetching, over-fetching, under-fetching'},
      {text:'Explain database indexing and when to use it.',category:'Database',hint:'Think about query speed vs write overhead'},
      {text:'What is JWT authentication? How does it work?',category:'Security',hint:'Header, payload, signature — stateless auth'},
      {text:'Explain the difference between SQL and NoSQL databases.',category:'Database',hint:'Schema, ACID, scalability, use cases'},
      {text:'What are middleware functions in Express.js?',category:'Node.js',hint:'Request pipeline, next() function'},
    ],
    java:[
      {text:'Explain the four pillars of OOP with Java examples.',category:'OOP',hint:'Encapsulation, inheritance, polymorphism, abstraction'},
      {text:'What is the difference between ArrayList and LinkedList?',category:'Collections',hint:'Random access O(1) vs insertion O(1)'},
      {text:'Explain Java memory management and garbage collection.',category:'JVM',hint:'Heap, stack, Eden, Survivor spaces'},
      {text:'What is the difference between interface and abstract class?',category:'OOP',hint:'Multiple inheritance, default methods'},
    ],
    hr:[
      {text:'What are your greatest strengths and one area you are working to improve?',category:'Self-assessment',hint:'Be specific and honest, frame weakness positively'},
      {text:'Describe a challenging situation you faced and how you resolved it.',category:'Behavioral',hint:'Use STAR: Situation, Task, Action, Result'},
      {text:'Why do you want this role and what motivates you?',category:'Motivation',hint:'Align with company values and growth opportunity'},
      {text:'Where do you see yourself in the next 3-5 years?',category:'Career Goals',hint:'Show ambition aligned with company growth'},
    ],
  };
  return (sets[config.role]||sets.frontend).map((q,i)=>({id:i+1,...q,difficulty:config.difficulty,type:'technical'}));
}

function generateLocalEvaluation(answer, question) {
  const words=answer.trim().split(/\s+/).length;
  const fc=FILLER_WORDS.reduce((c,f)=>c+(answer.toLowerCase().match(new RegExp(`\\b${f}\\b`,'g'))||[]).length,0);
  const score=Math.min(85,Math.max(25,words*0.9-fc*4+Math.random()*15));
  return {
    score:Math.round(score),
    categories:{correctness:Math.round(score*(0.8+Math.random()*0.3)),communication:Math.round(Math.max(30,80-fc*5+Math.random()*20)),confidence:Math.round(Math.min(90,words*0.8+Math.random()*20))},
    feedback:`${score>=70?'Good answer!':'Decent attempt.'} ${words>50?'You covered several key points.':'Try to elaborate more.'} ${fc>3?'Reduce filler words for better clarity.':'Your delivery was clear.'} ${score<60?'Review: '+question.hint:''}`,
    idealAnswer:`A strong answer covers: ${question.hint||'the core concept with definition, practical example, and real-world use case.'}`,
    followup:words<40?'Can you give a specific real-world example from your experience?':null,
  };
}
