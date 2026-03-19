/* leaderboard.js – Reads from userInterviews node + users node */

let allUsers = [];
let currentFilter = 'all';
let currentRole = '';

window.addEventListener('userReady', async (e) => {
  const user = e.detail;

  // Sidebar
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  toggle?.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay?.classList.toggle('show'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await window.firebaseFunctions.signOut(window.firebaseAuth);
    window.location.href = 'auth.html';
  });

  // Avatar
  if (user) {
    const ava = document.getElementById('userAvatar');
    if (ava) ava.textContent = (user.displayName || 'U')[0].toUpperCase();
  }

  setupFilters();
  await buildLeaderboard(user);
});

// ── Build leaderboard from userInterviews node ────
async function buildLeaderboard(currentUser) {
  try {
    const { ref, get } = window.firebaseFunctions;

    // Get all users basic info
    const usersSnap = await get(ref(window.firebaseDB, 'users'));
    const usersMap = {};
    if (usersSnap.exists()) {
      usersSnap.forEach(child => {
        usersMap[child.key] = { id: child.key, ...child.val() };
      });
    }

    // Get all userInterviews to compute real stats
    const ivSnap = await get(ref(window.firebaseDB, 'userInterviews'));

    if (ivSnap.exists()) {
      ivSnap.forEach(userNode => {
        const uid = userNode.key;
        const interviews = [];
        userNode.forEach(ivChild => {
          if (ivChild.val()) interviews.push({ id: ivChild.key, ...ivChild.val() });
        });

        if (!interviews.length) return;

        // Compute stats from actual interviews
        const validScores = interviews.filter(iv => (iv.score || 0) > 0);
        const avgScore = validScores.length
          ? Math.round(validScores.reduce((s, iv) => s + (iv.score || 0), 0) / validScores.length)
          : 0;
        const lastIv = interviews.sort((a,b) => (b.createdAt||0) - (a.createdAt||0))[0];

        // Merge with user profile info
        const userInfo = usersMap[uid] || {};
        allUsers.push({
          id: uid,
          displayName: userInfo.displayName || userInfo.firstName || 'Anonymous',
          role: userInfo.role || lastIv.config?.role || lastIv.role || 'general',
          totalInterviews: interviews.length,
          avgScore,
          lastInterviewAt: lastIv.createdAt || 0,
        });
      });
    } else if (Object.keys(usersMap).length > 0) {
      // Fallback: use users node data
      Object.values(usersMap).forEach(u => {
        if ((u.totalInterviews || 0) > 0) {
          allUsers.push(u);
        }
      });
    }

    // Sort by avgScore desc
    allUsers.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

    renderLeaderboard(currentUser);
    loadYourRank(currentUser);

  } catch (err) {
    console.error('Leaderboard error:', err);
    document.getElementById('lbList').innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-muted)">
        <p style="font-size:1.5rem;margin-bottom:8px">📊</p>
        <p>Complete interviews to appear on the leaderboard!</p>
        <a href="setup.html" style="color:var(--accent);font-weight:600;margin-top:8px;display:inline-block">Start Interview →</a>
      </div>`;
    document.getElementById('podium').innerHTML = '';
  }
}

// ── Filter ────────────────────────────────────────
function getFiltered() {
  let filtered = [...allUsers];

  if (currentRole) {
    filtered = filtered.filter(u => u.role === currentRole);
  }

  if (currentFilter === 'week') {
    const weekAgo = Date.now() - 7 * 86400000;
    filtered = filtered.filter(u => (u.lastInterviewAt || 0) >= weekAgo);
  } else if (currentFilter === 'month') {
    const monthAgo = Date.now() - 30 * 86400000;
    filtered = filtered.filter(u => (u.lastInterviewAt || 0) >= monthAgo);
  }

  return filtered;
}

// ── Render List ───────────────────────────────────
function renderLeaderboard(currentUser) {
  const filtered = getFiltered();
  const list = document.getElementById('lbList');

  renderPodium(filtered.slice(0, 3));

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <p style="font-size:1.5rem;margin-bottom:8px">🎯</p>
      <p>No rankings yet for this filter.</p>
      <a href="setup.html" style="color:var(--accent);font-weight:600;margin-top:8px;display:inline-block">Start an Interview →</a>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map((u, i) => {
    const isYou = currentUser && u.id === currentUser.uid;
    const score = u.avgScore || 0;
    const rankDisplay = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `
    <div class="lb-row${isYou ? ' you' : ''}">
      <div class="lb-rank${i < 3 ? ' top3' : ''}">${rankDisplay}</div>
      <div class="lb-avatar">${(u.displayName || 'U')[0].toUpperCase()}</div>
      <div class="lb-info">
        <span class="lb-name">${u.displayName || 'Anonymous'}${isYou ? ' <span style="color:var(--accent);font-size:.7rem">(You)</span>' : ''}</span>
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

// ── Podium ────────────────────────────────────────
function renderPodium(top3) {
  const podium = document.getElementById('podium');
  if (!top3.length) { podium.innerHTML = ''; return; }

  // Order: 2nd | 1st | 3rd
  const slots = [
    { u: top3[1], rank: 2, height: '75px', medal: '🥈' },
    { u: top3[0], rank: 1, height: '100px', medal: '🥇' },
    { u: top3[2], rank: 3, height: '55px', medal: '🥉' },
  ];

  podium.innerHTML = slots.map(({ u, rank, height, medal }) => {
    if (!u) return `<div class="podium-item pod-${rank}"><div class="pod-platform" style="height:${height}">${rank}</div></div>`;
    return `
    <div class="podium-item pod-${rank}">
      <div class="pod-user">
        <div class="pod-avatar">${(u.displayName||'U')[0].toUpperCase()}<span class="pod-medal">${medal}</span></div>
        <span class="pod-name">${(u.displayName||'User').split(' ')[0]}</span>
        <span class="pod-score">${u.avgScore||0}%</span>
      </div>
      <div class="pod-platform" style="height:${height}">${rank}</div>
    </div>`;
  }).join('');
}

// ── Your Rank Card ────────────────────────────────
function loadYourRank(user) {
  if (!user) return;
  const card = document.getElementById('yourRankCard');
  card.classList.remove('hidden');

  document.getElementById('yrAvatar').textContent = (user.displayName||'U')[0].toUpperCase();
  document.getElementById('yrName').textContent = user.displayName || 'You';

  const myIndex = allUsers.findIndex(u => u.id === user.uid);
  if (myIndex !== -1) {
    const myData = allUsers[myIndex];
    document.getElementById('yrStats').textContent = `${myData.totalInterviews||0} interviews · ${myData.avgScore||0}% avg`;
    document.getElementById('yrRank').textContent = `#${myIndex + 1}`;
    document.getElementById('yrScore').textContent = `${myData.avgScore||0}%`;
  } else {
    document.getElementById('yrStats').textContent = '0 interviews · complete one to rank!';
    document.getElementById('yrRank').textContent = '#--';
    document.getElementById('yrScore').textContent = '0%';
  }
}

// ── Filters ───────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('.lb-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderLeaderboard(window.currentUser);
    });
  });
  document.getElementById('roleFilter')?.addEventListener('change', e => {
    currentRole = e.target.value;
    renderLeaderboard(window.currentUser);
  });
}

function getRoleLabel(role) {
  const m = {frontend:'Frontend Dev',backend:'Backend Dev',fullstack:'Full Stack',java:'Java Dev',python:'Python Dev',devops:'DevOps',datascience:'Data Science',android:'Android Dev',hr:'HR'};
  return m[role] || 'Developer';
}
