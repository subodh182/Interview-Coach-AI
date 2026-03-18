/* dashboard.js – Fixed with Realtime Database */

let performanceChart = null;
let skillsChart = null;

window.addEventListener('userReady', async (e) => {
  initDashboard(e.detail);
});

async function initDashboard(user) {
  document.getElementById('greetingText').textContent = getGreeting();
  document.getElementById('userName').textContent = user.displayName?.split(' ')[0] || 'User';
  const ava = document.getElementById('userAvatar');
  if (ava) { ava.textContent = (user.displayName || 'U')[0].toUpperCase(); ava.onclick = () => window.location.href = 'profile.html'; ava.style.cursor = 'pointer'; }

  setupSidebar();
  setupLogout();

  const interviews = await loadInterviews(user);
  renderStats(interviews);
  renderRecentInterviews(interviews);
  updateStrengthWeakness(interviews);
  window._dashboardInterviews = interviews;
  initCharts(interviews);
}

function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!toggle) return;
  toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

function setupLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await window.firebaseFunctions.signOut(window.firebaseAuth);
    window.location.href = 'auth.html';
  });
}

async function loadInterviews(user) {
  try {
    const { ref, get } = window.firebaseFunctions;
    const snap = await get(ref(window.firebaseDB, `userInterviews/${user.uid}`));
    if (!snap.exists()) return [];
    const arr = [];
    snap.forEach(child => arr.push({ id: child.key, ...child.val() }));
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return arr;
  } catch (err) {
    console.warn('loadInterviews error:', err);
    return [];
  }
}

function renderStats(interviews) {
  const total = interviews.length;
  const valid = interviews.filter(i => i.score > 0);
  const avg = valid.length ? Math.round(valid.reduce((s,i) => s+(i.score||0),0)/valid.length) : 0;
  document.getElementById('totalInterviews').textContent = total;
  document.getElementById('avgScore').textContent = avg + '%';

  const today = new Date(); today.setHours(0,0,0,0);
  const dates = [...new Set(interviews.map(i => { const d=new Date(i.createdAt||0); d.setHours(0,0,0,0); return d.getTime(); }))].sort((a,b)=>b-a);
  let streak = 0;
  for (let i=0;i<dates.length;i++) { if(dates[i]===today.getTime()-i*86400000) streak++; else break; }
  document.getElementById('streakDays').textContent = streak;
}

function renderRecentInterviews(interviews) {
  const container = document.getElementById('recentList');
  if (!interviews.length) {
    container.innerHTML = `<div class="empty-state"><span>🎤</span><p>No interviews yet. <a href="setup.html">Start your first one!</a></p></div>`;
    return;
  }
  const ri = {frontend:'🌐',backend:'⚙️',fullstack:'💻',java:'☕',python:'🐍',devops:'🔧',datascience:'📊',android:'📱',hr:'💼',general:'🎯'};
  const rn = {frontend:'Frontend Developer',backend:'Backend Developer',fullstack:'Full Stack',java:'Java Developer',python:'Python Developer',devops:'DevOps',datascience:'Data Science',android:'Android Dev',hr:'HR Interview',general:'General'};
  container.innerHTML = interviews.slice(0,5).map(iv => {
    const s=iv.score||0, sc=s>=75?'high':s>=50?'mid':'low';
    const bc=s>=75?'badge-green':s>=50?'badge-yellow':'badge-red';
    const bl=s>=75?'Excellent':s>=50?'Good':'Needs Work';
    const dt=iv.createdAt?new Date(iv.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Recently';
    return `<a href="report.html?id=${iv.id}" class="recent-item">
      <span class="recent-role-icon">${ri[iv.role]||'🎯'}</span>
      <div class="recent-info"><span class="recent-role">${rn[iv.role]||'Interview'}</span><span class="recent-meta">${iv.mode||'Technical'} · ${iv.difficulty||'Medium'} · ${dt}</span></div>
      <span class="recent-score ${sc}">${s}%</span>
      <span class="badge ${bc}">${bl}</span>
    </a>`;
  }).join('');
}

function updateStrengthWeakness(interviews) {
  const container = document.getElementById('swList');
  if (!interviews.length) { container.innerHTML=`<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:.85rem">Complete interviews to see analysis</div>`; return; }
  const avg = Math.round(interviews.reduce((s,i)=>s+(i.score||0),0)/interviews.length);
  const items = [
    { topic:'Communication', avg: Math.min(95,avg+8) },
    { topic:'Technical Knowledge', avg },
    { topic:'Confidence', avg: Math.min(95,avg+3) },
    { topic:'Problem Solving', avg: Math.max(20,avg-7) },
    { topic:'Grammar & Clarity', avg: Math.min(95,avg+10) },
  ];
  container.innerHTML = items.map(item => `
    <div class="sw-item ${item.avg>=65?'strength':'weakness'}">
      <span class="sw-icon">${item.avg>=65?'💪':'📚'}</span>
      <div><span class="sw-name">${item.topic}</span>
        <div class="progress-bar"><div class="progress-fill" style="width:${item.avg}%"></div></div>
      </div>
      <span class="sw-score">${item.avg}%</span>
    </div>`).join('');
}

function initCharts(interviews) {
  initPerformanceChart(interviews);
  initSkillsChart(interviews);
  document.querySelectorAll('.cf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cf-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updatePerformanceChart(btn.dataset.range, interviews);
    });
  });
}

function getChartData(interviews, range) {
  const days = range==='week'?7:range==='month'?30:60;
  const now = new Date();
  const labels=[], data=[];
  for (let i=days-1;i>=0;i--) {
    const d=new Date(now); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    labels.push(d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}));
    const dayIvs=interviews.filter(iv=>{const id=new Date(iv.createdAt||0);id.setHours(0,0,0,0);return id.getTime()===d.getTime();});
    data.push(dayIvs.length?Math.round(dayIvs.reduce((s,iv)=>s+(iv.score||0),0)/dayIvs.length):null);
  }
  return {labels,data};
}

function initPerformanceChart(interviews) {
  const ctx = document.getElementById('performanceChart')?.getContext('2d');
  if (!ctx) return;
  const {labels,data} = getChartData(interviews,'week');
  const gradient = ctx.createLinearGradient(0,0,0,200);
  gradient.addColorStop(0,'rgba(79,140,255,0.3)'); gradient.addColorStop(1,'rgba(79,140,255,0)');
  performanceChart = new Chart(ctx, {
    type:'line',
    data:{labels,datasets:[{label:'Score',data,fill:true,backgroundColor:gradient,borderColor:'#4f8cff',borderWidth:2,pointBackgroundColor:'#4f8cff',pointBorderColor:'transparent',pointRadius:5,tension:0.4,spanGaps:true}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#111827',borderColor:'#1e2d45',borderWidth:1,titleColor:'#f0f4ff',bodyColor:'#8899bb',padding:12}},
      scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#4d6080',font:{size:11}}},
              y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#4d6080',font:{size:11},callback:v=>v+'%'}}}}
  });
}

function initSkillsChart(interviews) {
  const ctx = document.getElementById('skillsChart')?.getContext('2d');
  if (!ctx) return;
  const avg = interviews.length?Math.round(interviews.reduce((s,i)=>s+(i.score||0),0)/interviews.length):50;
  skillsChart = new Chart(ctx, {
    type:'radar',
    data:{labels:['Technical','Communication','Confidence','Grammar','Problem Solving','Clarity'],
      datasets:[{label:'Skills',data:[Math.min(95,avg+5),Math.min(95,avg+8),Math.min(95,avg-3),Math.min(95,avg+10),Math.min(95,avg-7),Math.min(95,avg+3)],
        fill:true,backgroundColor:'rgba(79,140,255,0.1)',borderColor:'#4f8cff',pointBackgroundColor:'#4f8cff',pointRadius:4,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{r:{min:0,max:100,grid:{color:'rgba(255,255,255,0.06)'},angleLines:{color:'rgba(255,255,255,0.06)'},ticks:{display:false},pointLabels:{color:'#8899bb',font:{size:11}}}}}
  });
}

function updatePerformanceChart(range, interviews) {
  if (!performanceChart) return;
  const {labels,data} = getChartData(interviews||[], range);
  performanceChart.data.labels = labels;
  performanceChart.data.datasets[0].data = data;
  performanceChart.update();
}
