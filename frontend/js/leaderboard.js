/* leaderboard.js – Fixed with Realtime DB */

let allUsers = [];
let currentFilter = 'all';
let currentRole = '';

window.addEventListener('userReady', async (e) => {
  const user = e.detail;

  // Setup sidebar
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
  await loadLeaderboard(user);
});

// ─── Load All Users from Realtime DB ──────────────
async function loadLeaderboard(user) {
  try {
    const { ref, get } = window.firebaseFunctions;
    const snap = await get(ref(window.firebaseDB, 'users'));

    if (!snap.exists()) {
      renderLeaderboard([], user);
      return;
    }

    allUsers = [];
    snap.forEach(child => {
      const d = child.val();
      // Only include users with at least 1 interview
      if (d && (d.totalInterviews || 0) > 0) {
        allUsers.push({ id: child.key, ...d });
      }
    });

    // Sort by avgScore descending
    allUsers.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

    renderLeaderboard(allUsers, user);
    if (user) loadYourRank(user, allUsers);

  } catch (err) {
    console.warn('Leaderboard load error:', err);
    renderLeaderboard([], user);
  }
}

// ─── Filter & Render ──────────────────────────────
function getFilteredUsers() {
  let filtered = [...allUsers];

  // Role filter
  if (currentRole) {
    filtered = filtered.filter(u => u.role === currentRole);
  }

  // Time filter — based on lastInterviewAt
  if (currentFilter === 'week') {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter(u => (u.lastInterviewAt || 0) >= weekAgo);
  } else if (currentFilter === 'month') {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter(u => (u.lastInterviewAt || 0) >= monthAgo);
  }

  return filtered;
}

function renderLeaderboard(users, currentUser) {
  const filtered = users.length ? getFilteredUsers() : [];
  const list = document.getElementById('lbList');

  // Podium top 3
  renderPodium(filtered.slice(0, 3));

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <p style="font-size:1.5rem;margin-bottom:8px">🎯</p>
      <p>No rankings yet. Complete interviews to appear here!</p>
      <a href="setup.html" style="color:var(--accent);font-weight:600;margin-top:8px;display:inline-block">Start an Interview →</a>
    </div>`;
    document.getElementById('podium').innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No data yet</div>';
    return;
  }

  list.innerHTML = filtered.map((u, i) => {
    const isYou = currentUser && u.id === currentUser.uid;
    const score = u.avgScore || 0;
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `
    <div class="lb-row ${isYou ? 'you' : ''}">
      <div class="lb-rank ${i < 3 ? 'top3' : ''}">${rankIcon}</div>
      <div class="lb-avatar">${(u.displayName || u.firstName || 'U')[0].toUpperCase()}</div>
      <div class="lb-info">
        <span class="lb-name">${u.displayName || u.firstName || 'Anonymous'}${isYou ? ' (You)' : ''}</span>
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
  const podium = document.getElementById('podium');
  if (!top3.length) { podium.innerHTML = ''; return; }

  // Visual order: 2nd, 1st, 3rd
  const visualOrder = [
    { data: top3[1], rank: 2, height: '75px', medal: '🥈' },
    { data: top3[0], rank: 1, height: '100px', medal: '🥇' },
    { data: top3[2], rank: 3, height: '55px', medal: '🥉' },
  ];

  podium.innerHTML = visualOrder.map(({ data, rank, height, medal }) => {
    if (!data) return `<div class="podium-item pod-${rank}"><div class="pod-platform" style="height:${height}">${rank}</div></div>`;
    return `
    <div class="podium-item pod-${rank}">
      <div class="pod-user">
        <div class="pod-avatar">${(data.displayName || 'U')[0].toUpperCase()}<span class="pod-medal">${medal}</span></div>
        <span class="pod-name">${(data.displayName || 'User').split(' ')[0]}</span>
        <span class="pod-score">${data.avgScore || 0}%</span>
      </div>
      <div class="pod-platform" style="height:${height}">${rank}</div>
    </div>`;
  }).join('');
}

// ─── Your Rank Card ───────────────────────────────
async function loadYourRank(user, allUsersList) {
  const card = document.getElementById('yourRankCard');
  card.classList.remove('hidden');

  const yrAvatar = document.getElementById('yrAvatar');
  const yrName = document.getElementById('yrName');
  const yrStats = document.getElementById('yrStats');
  const yrRank = document.getElementById('yrRank');
  const yrScore = document.getElementById('yrScore');

  yrAvatar.textContent = (user.displayName || 'U')[0].toUpperCase();
  yrName.textContent = user.displayName || 'You';

  // Find user in list
  const myIndex = allUsersList.findIndex(u => u.id === user.uid);
  if (myIndex !== -1) {
    const myData = allUsersList[myIndex];
    yrStats.textContent = `${myData.totalInterviews || 0} interviews · ${myData.avgScore || 0}% avg`;
    yrRank.textContent = `#${myIndex + 1}`;
    yrScore.textContent = `${myData.avgScore || 0}%`;
  } else {
    // User has no interviews yet — fetch from DB
    try {
      const { ref, get } = window.firebaseFunctions;
      const snap = await get(ref(window.firebaseDB, `users/${user.uid}`));
      if (snap.exists()) {
        const d = snap.val();
        yrStats.textContent = `${d.totalInterviews || 0} interviews · ${d.avgScore || 0}% avg`;
        yrScore.textContent = `${d.avgScore || 0}%`;
      }
      yrRank.textContent = '#--';
    } catch (e) { yrRank.textContent = '#--'; }
  }
}

// ─── Filters ──────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('.lb-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderLeaderboard(allUsers, window.currentUser);
    });
  });

  document.getElementById('roleFilter')?.addEventListener('change', (e) => {
    currentRole = e.target.value;
    renderLeaderboard(allUsers, window.currentUser);
  });
}

function getRoleLabel(role) {
  const m = { frontend:'Frontend Dev', backend:'Backend Dev', fullstack:'Full Stack', java:'Java Dev', python:'Python Dev', devops:'DevOps', datascience:'Data Science', android:'Android Dev', hr:'HR' };
  return m[role] || 'Developer';
}
