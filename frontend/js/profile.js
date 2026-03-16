/* profile.js */
window.addEventListener('userReady', async (e) => {
  const user = e.detail;
  setupSidebar();
  setupLogout();
  await loadProfile(user);
});

function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  toggle?.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

function setupLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await window.firebaseFunctions.signOut(window.firebaseAuth);
    location.href = 'auth.html';
  });
}

async function loadProfile(user) {
  const { doc, getDoc, updateDoc } = window.firebaseFunctions;

  // Set basic info from Auth
  document.getElementById('profileAvatar').textContent = (user.displayName || 'U')[0].toUpperCase();
  document.getElementById('profileName').textContent = user.displayName || 'User';
  document.getElementById('profileEmail').textContent = user.email || '';
  document.getElementById('editEmail').value = user.email || '';

  try {
    const snap = await getDoc(doc(window.firebaseDB, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById('editFirstName').value = data.firstName || '';
      document.getElementById('editLastName').value = data.lastName || '';
      document.getElementById('editRole').value = data.role || 'frontend';
      document.getElementById('psInterviews').textContent = data.totalInterviews || 0;
      document.getElementById('psAvgScore').textContent = (data.avgScore || 0) + '%';
      document.getElementById('psStreak').textContent = (data.streak || 0) + '🔥';
      document.getElementById('profileRoleBadge').textContent = getRoleLabel(data.role);
      unlockAchievements(data);
    }
  } catch (err) {
    console.warn('Profile load error:', err);
  }

  // Save profile
  document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Saving...';
    try {
      const firstName = document.getElementById('editFirstName').value.trim();
      const lastName = document.getElementById('editLastName').value.trim();
      const role = document.getElementById('editRole').value;
      await updateDoc(doc(window.firebaseDB, 'users', user.uid), {
        firstName, lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        role, updatedAt: new Date()
      });
      document.getElementById('profileName').textContent = `${firstName} ${lastName}`.trim();
      document.getElementById('profileRoleBadge').textContent = getRoleLabel(role);
      Toast.success('Profile updated! ✓');
    } catch (err) {
      Toast.error('Failed to save. Try again.');
    } finally {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Save Changes';
    }
  });
}

function unlockAchievements(data) {
  const total = data.totalInterviews || 0;
  const avg = data.avgScore || 0;
  const streak = data.streak || 0;

  document.querySelectorAll('.achievement').forEach(el => {
    const unlock = parseInt(el.dataset.unlock);
    const unlockScore = parseInt(el.dataset.unlockScore);
    const unlockStreak = parseInt(el.dataset.streak);
    if ((!isNaN(unlock) && total >= unlock) ||
        (!isNaN(unlockScore) && avg >= unlockScore) ||
        (!isNaN(unlockStreak) && streak >= unlockStreak)) {
      el.classList.remove('locked');
      el.classList.add('unlocked');
    }
  });
}

function getRoleLabel(role) {
  const m = { frontend:'Frontend Developer', backend:'Backend Developer', fullstack:'Full Stack', java:'Java Developer', python:'Python Developer', devops:'DevOps Engineer', datascience:'Data Scientist', android:'Android Developer', hr:'HR Interview' };
  return m[role] || 'Developer';
}
