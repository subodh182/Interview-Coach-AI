/* ================================================
   auth.js – Authentication Logic
================================================ */

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupForms();
  setupPasswordToggles();
  checkURLParams();
});

function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'signup') {
    switchTab('signup');
  }
}

function setupTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
}

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    });
  });
}

function setupForms() {
  document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
  document.getElementById('signupBtn')?.addEventListener('click', handleSignup);
  document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogle);
  document.getElementById('googleSignupBtn')?.addEventListener('click', handleGoogle);
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    Toast.error('Please fill in all fields');
    return;
  }

  setLoading(btn, true, 'Logging in...');
  try {
    const { signInWithEmailAndPassword } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    await signInWithEmailAndPassword(auth, email, password);
    Toast.success('Welcome back! 🎉');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (err) {
    setLoading(btn, false, 'Login');
    Toast.error(getAuthError(err.code));
  }
}

async function handleSignup() {
  const firstName = document.getElementById('signupFirstName').value.trim();
  const lastName = document.getElementById('signupLastName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;
  const terms = document.getElementById('termsCheck').checked;
  const btn = document.getElementById('signupBtn');

  if (!firstName || !email || !password) {
    Toast.error('Please fill in all required fields');
    return;
  }
  if (password.length < 8) {
    Toast.error('Password must be at least 8 characters');
    return;
  }
  if (!terms) {
    Toast.error('Please accept the Terms of Service');
    return;
  }

  setLoading(btn, true, 'Creating account...');
  try {
    const { createUserWithEmailAndPassword, updateProfile, doc, setDoc } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const displayName = `${firstName} ${lastName}`.trim();
    await updateProfile(cred.user, { displayName });

    // Save user to Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      firstName,
      lastName,
      displayName,
      email,
      role: role || 'general',
      createdAt: new Date(),
      totalInterviews: 0,
      avgScore: 0,
      streak: 0,
      rank: 0
    });

    Toast.success('Account created! Welcome to InterviewAI 🚀');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (err) {
    setLoading(btn, false, 'Create Account');
    Toast.error(getAuthError(err.code));
  }
}

async function handleGoogle() {
  try {
    const { signInWithPopup, doc, setDoc, getDoc } = window.firebaseFunctions;
    const auth = window.firebaseAuth;
    const db = window.firebaseDB;
    const provider = window.googleProvider;

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Create user doc if doesn't exist
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const [firstName, ...rest] = (user.displayName || 'User').split(' ');
      await setDoc(userRef, {
        uid: user.uid,
        firstName,
        lastName: rest.join(' '),
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: 'general',
        createdAt: new Date(),
        totalInterviews: 0,
        avgScore: 0,
        streak: 0,
        rank: 0
      });
    }

    Toast.success('Signed in with Google! 🎉');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (err) {
    Toast.error(getAuthError(err.code));
  }
}

function setLoading(btn, loading, label) {
  if (loading) {
    btn.disabled = true;
    btn.querySelector('span').textContent = label;
  } else {
    btn.disabled = false;
    btn.querySelector('span').textContent = label;
  }
}

function getAuthError(code) {
  const errors = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered. Please login.',
    'auth/weak-password': 'Password too weak. Use at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in cancelled',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return errors[code] || 'Authentication failed. Please try again.';
}
