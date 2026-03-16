/* ================================================
   setup.js – Interview Setup Logic
================================================ */

const config = {
  role: null,
  difficulty: 'medium',
  mode: 'technical',
  company: 'none',
  timeLimit: 120,
  jd: '',
  resumeText: ''
};

let currentStep = 1;

document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  // Pre-fill from URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('role')) selectRole(params.get('role'));
  if (params.get('level')) selectDifficulty(params.get('level'));

  setupRolePicker();
  setupDifficultyPicker();
  setupModePicker();
  setupCompanyPicker();
  setupTimePicker();
  setupFileUpload();
  setupNavigation();
});

function setupRolePicker() {
  document.querySelectorAll('.role-option').forEach(opt => {
    opt.addEventListener('click', () => selectRole(opt.dataset.role));
  });
}

function selectRole(role) {
  config.role = role;
  document.querySelectorAll('.role-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.role === role);
  });
}

function setupDifficultyPicker() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => selectDifficulty(btn.dataset.diff));
  });
}

function selectDifficulty(diff) {
  config.difficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.diff === diff);
  });
}

function setupModePicker() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      config.mode = btn.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
}

function setupCompanyPicker() {
  document.querySelectorAll('.company-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      config.company = opt.dataset.company;
      document.querySelectorAll('.company-opt').forEach(o => o.classList.toggle('selected', o === opt));
    });
  });
  // Select "General" by default
  document.querySelector('[data-company="none"]')?.classList.add('selected');
}

function setupTimePicker() {
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      config.timeLimit = parseInt(btn.dataset.time);
      document.querySelectorAll('.time-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
}

function setupFileUpload() {
  const area = document.getElementById('uploadArea');
  const input = document.getElementById('resumeFile');
  const preview = document.getElementById('filePreview');
  const nameEl = document.getElementById('fileName');
  const removeBtn = document.getElementById('removeFile');

  if (!area) return;

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  removeBtn.addEventListener('click', () => {
    config.resumeText = '';
    input.value = '';
    preview.classList.add('hidden');
    area.style.display = 'block';
    nameEl.textContent = '';
  });

  function handleFile(file) {
    const allowed = ['.pdf', '.txt', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      Toast.error('Please upload a PDF, TXT, DOC, or DOCX file');
      return;
    }
    nameEl.textContent = file.name;
    preview.classList.remove('hidden');
    area.style.display = 'none';
    config.resumeFile = file;

    // Read text from .txt
    if (ext === '.txt') {
      const reader = new FileReader();
      reader.onload = (e) => { config.resumeText = e.target.result; };
      reader.readAsText(file);
    }
  }
}

function setupNavigation() {
  document.getElementById('nextStep1')?.addEventListener('click', () => {
    if (!config.role) { Toast.warning('Please select a job role'); return; }
    goToStep(2);
  });

  document.getElementById('nextStep2')?.addEventListener('click', () => {
    config.jd = document.getElementById('jdInput')?.value?.trim() || '';
    goToStep(3);
    updatePreview();
  });

  document.getElementById('backStep2')?.addEventListener('click', () => goToStep(1));
  document.getElementById('backStep3')?.addEventListener('click', () => goToStep(2));

  document.getElementById('launchInterview')?.addEventListener('click', launchInterview);
}

function goToStep(step) {
  currentStep = step;
  document.querySelectorAll('.setup-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${step}`)?.classList.add('active');

  document.querySelectorAll('.step-dot').forEach(dot => {
    const n = parseInt(dot.dataset.step);
    dot.classList.toggle('active', n === step);
    dot.classList.toggle('done', n < step);
  });
  document.querySelectorAll('.step-line').forEach((line, i) => {
    line.classList.toggle('done', i + 1 < step);
  });

  window.scrollTo(0, 0);
}

function updatePreview() {
  const roleLabels = {
    frontend: 'Frontend Developer', backend: 'Backend Developer',
    fullstack: 'Full Stack Developer', java: 'Java Developer',
    python: 'Python Developer', devops: 'DevOps Engineer',
    datascience: 'Data Science', android: 'Android Developer',
    hr: 'HR Interview'
  };
  const timeLabels = { 0: 'Unlimited', 60: '1 minute', 120: '2 minutes', 180: '3 minutes', 300: '5 minutes' };
  const modeLabels = { technical: 'Technical', hr: 'HR Round', mixed: 'Mixed (Technical + HR)', coding: 'Coding Only' };

  document.getElementById('prevRole').textContent = roleLabels[config.role] || config.role;
  document.getElementById('prevDiff').textContent = config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);
  document.getElementById('prevMode').textContent = modeLabels[config.mode] || config.mode;
  document.getElementById('prevCompany').textContent = config.company === 'none' ? 'General' : config.company.charAt(0).toUpperCase() + config.company.slice(1);
  document.getElementById('prevTime').textContent = timeLabels[config.timeLimit] || config.timeLimit + 's';
  document.getElementById('prevJD').textContent = config.jd ? `Yes (${config.jd.length} chars)` : 'No';
  document.getElementById('prevResume').textContent = config.resumeFile ? config.resumeFile.name : 'No';
}

function launchInterview() {
  // Save config to session
  Session.setInterviewConfig({
    role: config.role,
    difficulty: config.difficulty,
    mode: config.mode,
    company: config.company,
    timeLimit: config.timeLimit,
    jd: config.jd,
    resumeText: config.resumeText,
    startedAt: new Date().toISOString()
  });

  Toast.success('Starting interview... Good luck! 🎤');
  setTimeout(() => window.location.href = 'interview.html', 600);
}
