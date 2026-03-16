/* ================================================
   dashboard.js – Dashboard Logic
================================================ */

let performanceChart = null;
let skillsChart = null;

window.addEventListener('userReady', async (e) => {
  const user = e.detail;
  initDashboard(user);
});

async function initDashboard(user) {
  document.getElementById('greetingText').textContent = getGreeting();
  document.getElementById('userName').textContent = user.displayName?.split(' ')[0] || 'User';
  document.getElementById('userAvatar').textContent = (user.displayName || 'U')[0].toUpperCase();

  setupSidebar();
  setupLogout();

  try {
    await loadStats(user);
    await loadRecentInterviews(user);
    initCharts();
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!toggle) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

function setupLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const { signOut } = window.firebaseFunctions;
    await signOut(window.firebaseAuth);
    window.location.href = 'auth.html';
  });
}

async function loadStats(user) {
  const { collection, query, where, orderBy, getDocs } = window.firebaseFunctions;
  const db = window.firebaseDB;

  try {
    const q = query(
      collection(db, 'interviews'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const interviews = [];
    snap.forEach(doc => interviews.push({ id: doc.id, ...doc.data() }));

    const total = interviews.length;
    const avg = total > 0
      ? Math.round(interviews.reduce((s, i) => s + (i.score || 0), 0) / total)
      : 0;

    document.getElementById('totalInterviews').textContent = total;
    document.getElementById('avgScore').textContent = avg + '%';

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const dates = [...new Set(interviews.map(i => {
      const d = i.createdAt?.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
      d.setHours(0,0,0,0);
      return d.getTime();
    }))].sort((a,b) => b-a);

    for (let i = 0; i < dates.length; i++) {
      const expected = today.getTime() - i * 86400000;
      if (dates[i] === expected) streak++;
      else break;
    }
    document.getElementById('streakDays').textContent = streak;

    updateStrengthWeakness(interviews);
    window._dashboardInterviews = interviews;

    return interviews;
  } catch (err) {
    console.warn('Stats load error (may need Firestore indexes):', err);
    return [];
  }
}

async function loadRecentInterviews(user) {
  const interviews = window._dashboardInterviews || [];
  const container = document.getElementById('recentList');

  if (!interviews.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>🎤</span>
        <p>No interviews yet. <a href="setup.html">Start your first one!</a></p>
      </div>`;
    return;
  }

  const roleIcons = {
    frontend: '🌐', backend: '⚙️', fullstack: '💻', java: '☕',
    python: '🐍', devops: '🔧', datascience: '📊', android: '📱', hr: '💼', general: '🎯'
  };

  container.innerHTML = interviews.slice(0, 5).map(iv => `
    <a href="report.html?id=${iv.id}" class="recent-item">
      <span class="recent-role-icon">${roleIcons[iv.role] || '🎯'}</span>
      <div class="recent-info">
        <span class="recent-role">${getRoleLabel(iv.role)}</span>
        <span class="recent-meta">${iv.mode || 'Technical'} · ${iv.difficulty || 'Medium'} · ${formatDate(iv.createdAt)}</span>
      </div>
      <span class="recent-score ${scoreColor(iv.score)}">${iv.score || 0}%</span>
      <span class="badge badge-${getBadgeClass(iv.score)}">${getBadgeLabel(iv.score)}</span>
    </a>
  `).join('');
}

function updateStrengthWeakness(interviews) {
  if (!interviews.length) return;
  const topics = {};

  interviews.forEach(iv => {
    if (iv.topicScores) {
      Object.entries(iv.topicScores).forEach(([topic, score]) => {
        if (!topics[topic]) topics[topic] = [];
        topics[topic].push(score);
      });
    }
  });

  const averaged = Object.entries(topics).map(([topic, scores]) => ({
    topic,
    avg: Math.round(scores.reduce((a,b) => a+b, 0) / scores.length)
  })).sort((a,b) => b.avg - a.avg);

  if (!averaged.length) {
    averaged.push(
      { topic: 'JavaScript', avg: 78 },
      { topic: 'System Design', avg: 62 },
      { topic: 'Data Structures', avg: 85 },
      { topic: 'Communication', avg: 70 }
    );
  }

  const container = document.getElementById('swList');
  container.innerHTML = averaged.slice(0, 5).map((item, i) => `
    <div class="sw-item ${item.avg >= 70 ? 'strength' : 'weakness'}">
      <span class="sw-icon">${item.avg >= 70 ? '💪' : '📚'}</span>
      <div>
        <span class="sw-name">${item.topic}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${item.avg}%"></div>
        </div>
      </div>
      <span class="sw-score">${item.avg}%</span>
    </div>
  `).join('');
}

function initCharts() {
  initPerformanceChart();
  initSkillsChart();

  document.querySelectorAll('.cf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePerformanceChart(btn.dataset.range);
    });
  });
}

function initPerformanceChart() {
  const ctx = document.getElementById('performanceChart')?.getContext('2d');
  if (!ctx) return;

  const interviews = window._dashboardInterviews || [];
  const { labels, data } = getChartData(interviews, 'week');

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(79,140,255,0.3)');
  gradient.addColorStop(1, 'rgba(79,140,255,0)');

  performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data,
        fill: true,
        backgroundColor: gradient,
        borderColor: '#4f8cff',
        borderWidth: 2,
        pointBackgroundColor: '#4f8cff',
        pointBorderColor: 'transparent',
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          borderColor: '#1e2d45',
          borderWidth: 1,
          titleColor: '#f0f4ff',
          bodyColor: '#8899bb',
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#4d6080', font: { family: 'DM Sans', size: 11 } }
        },
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#4d6080', font: { family: 'DM Sans', size: 11 }, callback: v => v + '%' }
        }
      }
    }
  });
}

function initSkillsChart() {
  const ctx = document.getElementById('skillsChart')?.getContext('2d');
  if (!ctx) return;

  skillsChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Technical', 'Communication', 'Confidence', 'Grammar', 'Problem Solving', 'Clarity'],
      datasets: [{
        label: 'Your Skills',
        data: [75, 68, 72, 80, 65, 78],
        fill: true,
        backgroundColor: 'rgba(79,140,255,0.1)',
        borderColor: '#4f8cff',
        pointBackgroundColor: '#4f8cff',
        pointRadius: 4,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          ticks: { display: false },
          pointLabels: { color: '#8899bb', font: { family: 'DM Sans', size: 11 } }
        }
      }
    }
  });
}

function getChartData(interviews, range) {
  const now = new Date();
  let days = range === 'week' ? 7 : range === 'month' ? 30 : 60;
  const labels = [], data = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

    const dayInterviews = interviews.filter(iv => {
      const id = iv.createdAt?.toDate ? iv.createdAt.toDate() : new Date(iv.createdAt);
      id.setHours(0,0,0,0);
      return id.getTime() === d.getTime();
    });

    const avg = dayInterviews.length
      ? Math.round(dayInterviews.reduce((s,iv) => s + (iv.score || 0), 0) / dayInterviews.length)
      : null;
    data.push(avg);
  }

  return { labels, data };
}

function updatePerformanceChart(range) {
  if (!performanceChart) return;
  const interviews = window._dashboardInterviews || [];
  const { labels, data } = getChartData(interviews, range);
  performanceChart.data.labels = labels;
  performanceChart.data.datasets[0].data = data;
  performanceChart.update();
}

function getRoleLabel(role) {
  const labels = {
    frontend: 'Frontend Developer', backend: 'Backend Developer',
    fullstack: 'Full Stack Developer', java: 'Java Developer',
    python: 'Python Developer', devops: 'DevOps Engineer',
    datascience: 'Data Science', android: 'Android Developer',
    hr: 'HR Interview', general: 'General Interview'
  };
  return labels[role] || 'Interview';
}

function getBadgeClass(score) {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function getBadgeLabel(score) {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  return 'Needs Work';
}
