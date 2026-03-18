/* profile.js – Complete profile with Realtime DB */

window.addEventListener('userReady', async (e) => {
  const user = e.detail;
  setupSidebar();
  setupLogout();
  await loadProfile(user);
  await loadInterviewStats(user);
  setupSaveProfile(user);
  setupDeleteAccount(user);
  updateThemeBtn();
});

function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  toggle?.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay?.classList.toggle('show'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

function setupLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await window.firebaseFunctions.signOut(window.firebaseAuth);
    window.location.href = 'auth.html';
  });
}

async function loadProfile(user) {
  const { ref, get } = window.firebaseFunctions;
  const db = window.firebaseDB;

  // Set basic info from Auth
  document.getElementById('profileName').textContent = user.displayName || 'User';
  document.getElementById('profileEmail').textContent = user.email || '';
  document.getElementById('profileAvatar').textContent = (user.displayName || 'U')[0].toUpperCase();
  document.getElementById('accountEmail').textContent = user.email || '';

  try {
    const snap = await get(ref(db, `users/${user.uid}`));
    if (snap.exists()) {
      const data = snap.val();
      const roleMap = {frontend:'Frontend Developer',backend:'Backend Developer',fullstack:'Full Stack Dev',java:'Java Developer',python:'Python Dev',devops:'DevOps Eng',datascience:'Data Scientist',android:'Android Dev',hr:'HR Interview'};

      document.getElementById('profileRoleTag').textContent = roleMap[data.role] || data.role || 'Developer';
      document.getElementById('profileJoined').textContent = data.createdAt
        ? 'Joined ' + new Date(data.createdAt).toLocaleDateString('en-IN', { month:'long', year:'numeric' })
        : 'Joined recently';

      // Fill edit form
      document.getElementById('editFirstName').value = data.firstName || user.displayName?.split(' ')[0] || '';
      document.getElementById('editLastName').value = data.lastName || user.displayName?.split(' ').slice(1).join(' ') || '';
      document.getElementById('editRole').value = data.role || 'frontend';
      document.getElementById('editCollege').value = data.college || '';
      document.getElementById('editExp').value = data.experience || '0';

      // Hero stats
      document.getElementById('phsTotal').textContent = data.totalInterviews || 0;
      document.getElementById('phsAvg').textContent = (data.avgScore || 0) + '%';
    }
  } catch (err) {
    console.warn('Profile load error:', err);
    document.getElementById('editFirstName').value = user.displayName?.split(' ')[0] || '';
  }
}

async function loadInterviewStats(user) {
  const { ref, get } = window.firebaseFunctions;
  try {
    const snap = await get(ref(window.firebaseDB, `userInterviews/${user.uid}`));
    if (!snap.exists()) return;

    const interviews = [];
    snap.forEach(child => interviews.push({ id: child.key, ...child.val() }));
    interviews.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

    const total = interviews.length;
    const validScores = interviews.filter(i => i.score > 0);
    const avg = validScores.length ? Math.round(validScores.reduce((s,i)=>s+(i.score||0),0)/validScores.length) : 0;
    const best = validScores.length ? Math.max(...validScores.map(i=>i.score||0)) : 0;

    // Streak
    const today = new Date(); today.setHours(0,0,0,0);
    const dates = [...new Set(interviews.map(i=>{ const d=new Date(i.createdAt||0); d.setHours(0,0,0,0); return d.getTime(); }))].sort((a,b)=>b-a);
    let streak=0; for(let i=0;i<dates.length;i++){if(dates[i]===today.getTime()-i*86400000)streak++;else break;}

    // Favourite role
    const roleCounts = {};
    interviews.forEach(i => { roleCounts[i.role] = (roleCounts[i.role]||0)+1; });
    const favRole = Object.entries(roleCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '--';
    const roleMap = {frontend:'Frontend',backend:'Backend',fullstack:'Full Stack',java:'Java',python:'Python',devops:'DevOps',datascience:'Data Science',android:'Android',hr:'HR'};

    // This week
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7); weekStart.setHours(0,0,0,0);
    const thisWeek = interviews.filter(i => (i.createdAt||0) >= weekStart.getTime()).length;

    // Update UI
    document.getElementById('phsTotal').textContent = total;
    document.getElementById('phsAvg').textContent = avg + '%';
    document.getElementById('phsStreak').textContent = streak;
    document.getElementById('piTotal').textContent = total;
    document.getElementById('piAvg').textContent = avg + '%';
    document.getElementById('bestScore').textContent = best > 0 ? best + '%' : '--';
    document.getElementById('favRole').textContent = roleMap[favRole] || favRole;
    document.getElementById('thisWeek').textContent = thisWeek;
    document.getElementById('lastIv').textContent = interviews.length
      ? new Date(interviews[0].createdAt||0).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
      : '--';

    // Unlock badges
    if (total >= 1) document.querySelector('[title="First Interview"]')?.classList.add('earned');
    if (total >= 5) document.getElementById('badge5')?.classList.add('earned');
    if (total >= 10) document.getElementById('badge10')?.classList.add('earned');
    if (avg >= 75) document.getElementById('badge75')?.classList.add('earned');
    if (best >= 90) document.getElementById('badge90')?.classList.add('earned');
    if (streak >= 7) document.getElementById('badge7streak')?.classList.add('earned');
    if (interviews.some(i=>i.role==='hr')) document.getElementById('badgeHR')?.classList.add('earned');
    if (interviews.some(i=>i.mode==='coding')) document.getElementById('badgeCode')?.classList.add('earned');

    // Badge icon based on performance
    const badge = document.getElementById('profileBadge');
    if (best >= 90) badge.textContent = '🏆';
    else if (avg >= 75) badge.textContent = '⭐';
    else if (total >= 5) badge.textContent = '🔥';
    else badge.textContent = '🎯';

  } catch (err) {
    console.warn('Stats load error:', err);
  }
}

function setupSaveProfile(user) {
  document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const role = document.getElementById('editRole').value;
    const college = document.getElementById('editCollege').value.trim();
    const experience = document.getElementById('editExp').value;

    if (!firstName) { Toast.warning('Please enter your first name'); return; }

    const btn = document.getElementById('saveProfileBtn');
    btn.textContent = '⏳ Saving...'; btn.disabled = true;

    try {
      const { ref, update } = window.firebaseFunctions;
      await update(ref(window.firebaseDB, `users/${user.uid}`), {
        firstName, lastName, displayName: `${firstName} ${lastName}`.trim(),
        role, college, experience, updatedAt: Date.now()
      });

      // Update Auth display name
      const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js");
      await updateProfile(user, { displayName: `${firstName} ${lastName}`.trim() });

      document.getElementById('profileName').textContent = `${firstName} ${lastName}`.trim();
      document.getElementById('profileAvatar').textContent = firstName[0].toUpperCase();
      const roleMap = {frontend:'Frontend Developer',backend:'Backend Developer',fullstack:'Full Stack Dev',java:'Java Developer',python:'Python Dev',devops:'DevOps Eng',datascience:'Data Scientist',android:'Android Dev',hr:'HR Interview'};
      document.getElementById('profileRoleTag').textContent = roleMap[role] || role;

      Toast.success('Profile updated successfully! ✅');
    } catch (err) {
      console.error('Save error:', err);
      Toast.error('Could not save profile. Try again.');
    } finally {
      btn.innerHTML = '<span>💾</span> Save Changes'; btn.disabled = false;
    }
  });
}

function setupDeleteAccount(user) {
  document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
    const confirm = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirm) return;
    try {
      const { ref, set } = window.firebaseFunctions;
      await set(ref(window.firebaseDB, `users/${user.uid}`), null);
      await set(ref(window.firebaseDB, `userInterviews/${user.uid}`), null);
      const { deleteUser } = window.firebaseFunctions;
      await deleteUser(user);
      window.location.href = 'index.html';
    } catch (err) {
      Toast.error('Could not delete account. Please re-login and try again.');
    }
  });
}

function updateThemeBtn() {
  const theme = localStorage.getItem('theme') || 'dark';
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☽';
}

window.updateThemeBtn = updateThemeBtn;
