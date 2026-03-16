/* ================================================
   main.js – Global Utilities
================================================ */

// Theme Management
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    this.apply(saved);
    document.querySelectorAll('.theme-toggle, .sidebar-theme').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
  },
  apply(theme) {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(theme + '-mode');
    localStorage.setItem('theme', theme);
    document.querySelectorAll('.theme-icon').forEach(icon => {
      icon.textContent = theme === 'dark' ? '☀' : '☽';
    });
  },
  toggle() {
    const current = localStorage.getItem('theme') || 'dark';
    this.apply(current === 'dark' ? 'light' : 'dark');
  }
};

// Toast System
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toastContainer');
  },
  show(message, type = 'info', duration = 3500) {
    if (!this.container) return;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (msg, dur) => Toast.show(msg, 'success', dur),
  error: (msg, dur) => Toast.show(msg, 'error', dur),
  info: (msg, dur) => Toast.show(msg, 'info', dur),
  warning: (msg, dur) => Toast.show(msg, 'warning', dur),
};

// Navbar scroll effect
const NavbarScroll = {
  init() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
  }
};

// Hamburger Menu
const HamburgerMenu = {
  init() {
    const btn = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }
};

// API Helper
const API = {
  BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api',

  async request(method, path, data = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(this.BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  get: (path, token) => API.request('GET', path, null, token),
  post: (path, data, token) => API.request('POST', path, data, token),
  put: (path, data, token) => API.request('PUT', path, data, token),

  async getToken() {
    if (window.firebaseAuth?.currentUser) {
      return window.firebaseAuth.currentUser.getIdToken();
    }
    return null;
  }
};

// Session Storage for interview config
const Session = {
  setInterviewConfig(config) {
    sessionStorage.setItem('interviewConfig', JSON.stringify(config));
  },
  getInterviewConfig() {
    try {
      return JSON.parse(sessionStorage.getItem('interviewConfig') || 'null');
    } catch { return null; }
  },
  setCurrentInterview(data) {
    sessionStorage.setItem('currentInterview', JSON.stringify(data));
  },
  getCurrentInterview() {
    try {
      return JSON.parse(sessionStorage.getItem('currentInterview') || 'null');
    } catch { return null; }
  },
  clear() {
    sessionStorage.removeItem('interviewConfig');
    sessionStorage.removeItem('currentInterview');
  }
};

// Greeting helper
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Format date
function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Score color
function scoreColor(s) {
  if (s >= 75) return 'high';
  if (s >= 50) return 'mid';
  return 'low';
}

// Initialize globals
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Toast.init();
  NavbarScroll.init();
  HamburgerMenu.init();
});

window.ThemeManager = ThemeManager;
window.Toast = Toast;
window.API = API;
window.Session = Session;
window.getGreeting = getGreeting;
window.formatDate = formatDate;
window.scoreColor = scoreColor;
