/* leaderboard.js */
window.addEventListener('userReady', async (e) => {
  await loadLeaderboard();
  setupFilters();
  if (e.detail) loadYourRank(e.detail);
});

async function loadLeaderboard() {
  try {
    const { collection, query, orderBy, limit, getDocs } = window.firebaseFunctions;
    const q = query(collection(window.firebaseDB, 'users'), orderBy('avgScore', 'desc'), limit(50));
    const snap = await getDocs(q);
    const users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    renderLeaderboard(users);
  } catch (err) {
    // Demo data
    renderLeaderboard(getDemoLeaderboard());
  }
}

function getDemoLeaderboard() {
  const names = ['Rahul Sharma','Priya Singh','Amit Kumar','Neha Gupta','Ravi Patel','Anjali Mishra','Suresh Yadav','Kavya Reddy','Rohit Jain','Meena Nair'];
  const roles = ['Frontend Dev','Backend Dev','Java Dev','Full Stack','Python Dev','DevOps','Data Science','Android Dev','HR','Frontend Dev'];
  return names.map((name, i) => ({
    displayName: name,
    role: roles[i % roles.length],
    avgScore: Math.round(95 - i * 4 + Math.random() * 5),
    totalInterviews: Math.round(20 - i * 1.5 + Math.random() * 5),
    id: 'demo_' + i
  }));
}

function renderLeaderboard(users) {
  renderPodium(users.slice(0, 3));
  const list = document.getElementById('lbList');
  if (!users.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">No data yet. Be the first!</p>'; return; }

  list.innerHTML = users.map((u, i) => {
    const isYou = window.currentUser && u.id === window.currentUser.uid;
    const score = u.avgScore || 0;
    return `
    <div class="lb-row ${isYou ? 'you' : ''}">
      <div class="lb-rank ${i < 3 ? 'top3' : ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : '#' + (i + 1)}</div>
      <div class="lb-avatar">${(u.displayName || u.firstName || 'U')[0].toUpperCase()}</div>
      <div class="lb-info">
        <span class="lb-name">${u.displayName || u.firstName || 'Anonymous'} ${isYou ? '(You)' : ''}</span>
        <span class="lb-role">${getRoleLabel(u.role)}</span>
      </div>
      <div class="lb-interviews">
        <span class="lb-int-num">${u.totalInterviews || 0}</span>
        <span class="lb-int-label">Interviews</span>
      </div>
      <div class="lb-score ${score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low'}">${score}%</div>
    </div>`;
  }).join('');
}

function renderPodium(top3) {
  const medals = ['🥇','🥈','🥉'];
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visual order
  const positions = [2, 1, 3];
  const html = order.map(i => {
    const u = top3[i];
    if (!u) return '';
    return `
    <div class="podium-item pod-${positions[order.indexOf(i)]}">
      <div class="pod-user">
        <div class="pod-avatar">${(u.displayName || 'U')[0].toUpperCase()}<span class="pod-medal">${medals[i]}</span></div>
        <span class="pod-name">${u.displayName || 'User'}</span>
        <span class="pod-score">${u.avgScore || 0}%</span>
      </div>
      <div class="pod-platform">${i + 1}</div>
    </div>`;
  }).join('');
  document.getElementById('podium').innerHTML = html;
}

function loadYourRank(user) {
  const card = document.getElementById('yourRankCard');
  card.classList.remove('hidden');
  document.getElementById('yrAvatar').textContent = (user.displayName || 'U')[0].toUpperCase();
  document.getElementById('yrName').textContent = user.displayName || 'You';
}

function setupFilters() {
  document.querySelectorAll('.lb-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadLeaderboard();
    });
  });
}

function getRoleLabel(role) {
  const m = { frontend:'Frontend Dev', backend:'Backend Dev', fullstack:'Full Stack', java:'Java Dev', python:'Python Dev', devops:'DevOps', datascience:'Data Science', android:'Android Dev', hr:'HR' };
  return m[role] || 'Developer';
}
