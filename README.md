# 🎯 InterviewAI – AI-Powered Mock Interview Platform

<div align="center">

![InterviewAI Banner](https://img.shields.io/badge/InterviewAI-v1.0.0-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHRleHQgeT0iLjllbSIgZm9udC1zaXplPSIyMCI+8J+OrzwvdGV4dD48L3N2Zz4=)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)
![Gemini](https://img.shields.io/badge/Google-Gemini_AI-blue?style=for-the-badge&logo=google)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)

**Practice smarter. Interview better. Land your dream job.**

[🚀 Live Demo](#) · [📖 Docs](#setup) · [🐛 Issues](#)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚡ Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [🚀 Deploy to Vercel](#-deploy-to-vercel)
- [🔥 Firebase Setup](#-firebase-setup)
- [🤖 Gemini AI Setup](#-gemini-ai-setup)
- [📱 Features Deep Dive](#-features-deep-dive)
- [🎨 UI/UX Design](#-uiux-design)
- [🔐 Security](#-security)
- [🤝 Contributing](#-contributing)

---

## ✨ Features

### 🎤 Core Interview Features
| Feature | Description |
|---------|-------------|
| 🎯 AI Question Generator | Gemini AI generates role-specific questions |
| 📋 JD-Based Questions | Paste Job Description → get tailored questions |
| 🎤 Voice Interview | Speak your answers via browser mic |
| 🗣️ Speech-to-Text | Real-time voice → text conversion (Web Speech API) |
| 🧠 AI Answer Evaluation | Gemini analyzes correctness, communication, confidence |
| ⭐ Score System | 0-100 scoring across 3 categories |
| 🔄 Follow-up Questions | AI asks deeper questions based on your answer |
| 📄 Resume-Based Questions | Upload PDF → get personalized questions |

### 📊 Communication Analysis
| Feature | Description |
|---------|-------------|
| 🔤 Filler Word Detection | Highlights "um", "uh", "like", "basically" etc. |
| 😊 Sentiment Analysis | Positive/Negative/Neutral tone detection |
| 💪 Confidence Detection | AI evaluates confidence level 0-100% |
| ✅ Grammar Checking | Flags grammar issues in real-time |
| 📈 Live Word Count | Real-time words spoken counter |

### 📊 Performance Dashboard
| Feature | Description |
|---------|-------------|
| 📈 Progress Charts | Score over time (Chart.js) |
| 🕸️ Skills Radar | Visual skill assessment across 6 dimensions |
| 💪 Strength/Weakness | Auto-detected strong and weak topics |
| 📅 Interview History | Complete history with filters |
| 🔥 Streak Tracking | Daily practice streak system |

### 💼 Job Preparation
| Role | Coverage |
|------|---------|
| 🌐 Frontend Developer | HTML, CSS, JS, React, Vue, Performance |
| ⚙️ Backend Developer | Node.js, APIs, Databases, Security |
| 💻 Full Stack | Frontend + Backend combined |
| ☕ Java Developer | OOP, Spring, JVM, Collections |
| 🐍 Python Developer | Django, Flask, Algorithms |
| 🔧 DevOps Engineer | Docker, CI/CD, Cloud, Linux |
| 📊 Data Science | ML, Statistics, Python, SQL |
| 📱 Android Developer | Kotlin, Java, Android SDK |
| 💼 HR Interview | Behavioral, STAR Method, Soft Skills |

### 🎨 UI/UX Features
| Feature | Description |
|---------|-------------|
| 🌙 Dark / Light Mode | Smooth theme toggle, saved in localStorage |
| 📱 Mobile Responsive | Works on all screen sizes |
| ⚡ Animated Interface | Smooth transitions, wave visualizer, avatar rings |
| 🎭 AI Avatar | Animated AI interviewer with live status |
| ⏱️ Timer System | Per-question countdown with color warnings |
| 🎙️ Voice Visualizer | Real-time audio waveform animation |

### 🔐 Authentication & Data
| Feature | Description |
|---------|-------------|
| 🔑 Email/Password Auth | Firebase Auth |
| 🔵 Google OAuth | One-click Google sign-in |
| 💾 Interview History | All interviews saved to Firestore |
| 📄 PDF Report Download | Browser print-to-PDF |
| 🏆 Leaderboard | Global rankings with weekly/monthly filters |

---

## 🛠 Tech Stack

```
Frontend:
├── HTML5 + CSS3 + Vanilla JavaScript
├── Google Fonts (Syne + DM Sans)
├── Chart.js (performance graphs)
└── Web Speech API (voice recognition)

Backend:
├── Node.js 18+
├── Express.js
├── Google Gemini 1.5 Flash API (AI)
├── Firebase Admin SDK
└── Multer (resume file upload)

Database:
└── Firebase Firestore (NoSQL)

Auth:
└── Firebase Authentication

Deployment:
└── Vercel (serverless functions)
```

---

## 📁 Project Structure

```
ai-mock-interview/
│
├── frontend/                    # Static HTML/CSS/JS
│   ├── index.html               # Landing page
│   ├── auth.html                # Login / Signup
│   ├── dashboard.html           # User dashboard
│   ├── setup.html               # Interview configuration
│   ├── interview.html           # Live interview interface
│   ├── report.html              # Results & analysis
│   ├── leaderboard.html         # Global rankings
│   │
│   ├── css/
│   │   ├── main.css             # Global variables, reset, components
│   │   ├── landing.css          # Landing page styles
│   │   ├── auth.css             # Auth page styles
│   │   ├── dashboard.css        # Dashboard layout
│   │   ├── setup.css            # Setup wizard styles
│   │   ├── interview.css        # Interview interface
│   │   ├── report.css           # Report page
│   │   └── leaderboard.css      # Leaderboard styles
│   │
│   └── js/
│       ├── main.js              # Theme, toast, API helper, utilities
│       ├── landing.js           # Landing page animations
│       ├── auth.js              # Firebase auth logic
│       ├── dashboard.js         # Charts, stats, recent interviews
│       ├── setup.js             # Interview configuration wizard
│       ├── interview.js         # Core interview logic + Speech API
│       ├── report.js            # Results rendering, PDF
│       └── leaderboard.js       # Rankings display
│
├── backend/
│   ├── server.js                # Express app, middleware, routes
│   ├── package.json
│   ├── .env.example             # Environment variable template
│   │
│   ├── routes/
│   │   ├── interview.js         # Generate questions, evaluate, save
│   │   ├── user.js              # Profile, stats
│   │   └── leaderboard.js       # Rankings API
│   │
│   ├── middleware/
│   │   └── auth.js              # Firebase token verification
│   │
│   └── utils/
│       ├── firebase.js          # Firebase Admin SDK init
│       └── gemini.js            # Gemini AI integration
│
├── vercel.json                  # Vercel deployment config
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ installed
- Firebase project created
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-mock-interview.git
cd ai-mock-interview
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Now edit .env with your actual values
```

### 4. Add Firebase Config to Frontend
Open each HTML file that has Firebase config and replace:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",         // Replace these
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```
Files to update: `auth.html`, `dashboard.html`, `report.html`, `leaderboard.html`

### 5. Start Development Server
```bash
cd backend
npm run dev
# Server starts at http://localhost:3000
```

### 6. Open in Browser
```
http://localhost:3000
```

---

## 🔧 Configuration

### Backend `.env` File
```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Gemini AI (Required for AI features)
GEMINI_API_KEY=AIzaSy...your_key_here

# Firebase Admin (Required for database)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔥 Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `interviewai`
4. Enable Google Analytics (optional)
5. Click **"Create Project"**

### Step 2: Enable Authentication
1. In Firebase Console → **Authentication** → **Get Started**
2. Enable **Email/Password** provider
3. Enable **Google** provider
   - Add your app domain to authorized domains

### Step 3: Create Firestore Database
1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (we'll add rules later)
3. Select your region

### Step 4: Firestore Security Rules
Go to **Firestore → Rules** and paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if true; // for leaderboard
    }
    // Interviews belong to their creator
    match /interviews/{interviewId} {
      allow read, write: if request.auth != null &&
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null;
    }
  }
}
```

### Step 5: Get Frontend Config
1. Firebase Console → **Project Settings** → **General**
2. Scroll to "Your apps" → click **Web** icon (`</>`)
3. Register app name: `InterviewAI Web`
4. Copy the `firebaseConfig` object
5. Replace in all HTML files

### Step 6: Get Admin SDK for Backend
1. Firebase Console → **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Add to `.env`:
   ```
   FIREBASE_PROJECT_ID=value from JSON
   FIREBASE_CLIENT_EMAIL=value from JSON
   FIREBASE_PRIVATE_KEY="value from JSON (keep the quotes)"
   ```

### Step 7: Create Firestore Indexes
Firebase Console → **Firestore → Indexes** → Create composite indexes:

**Index 1** (for interview history):
- Collection: `interviews`
- Fields: `userId` (Ascending), `createdAt` (Descending)

**Index 2** (for leaderboard):
- Collection: `users`
- Fields: `avgScore` (Descending)

---

## 🤖 Gemini AI Setup

### Get API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the key
4. Add to `.env`: `GEMINI_API_KEY=AIzaSy...`

### Model Used
- **gemini-1.5-flash** – Fast, efficient, supports structured output
- Free tier: 15 requests/minute, 1 million tokens/day

### What Gemini Does
1. **Question Generation** – Creates role/difficulty/JD-specific interview questions
2. **Answer Evaluation** – Scores correctness, communication, confidence + feedback
3. **Ideal Answers** – Generates model answers for learning
4. **Follow-up Questions** – Smart contextual follow-ups
5. **Improvement Tips** – Personalized study recommendations

---

## 🚀 Deploy to Vercel

### Method 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# From project root
vercel

# Follow prompts:
# - Set up and deploy? → Yes
# - Link to existing project? → No
# - Project name? → interviewai
# - Which directory is your code? → ./
# - Override settings? → No
```

### Method 2: GitHub + Vercel Dashboard

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: InterviewAI"
git remote add origin https://github.com/yourusername/interviewai.git
git push -u origin main
```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **"New Project"**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `cd backend && npm install`
   - **Output Directory**: `frontend`

### Step 3: Add Environment Variables in Vercel

Vercel Dashboard → Your Project → **Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Private key (with quotes) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |

### Step 4: Deploy
```bash
vercel --prod
```

### Step 5: Update Firebase Auth
1. Firebase Console → Authentication → Settings
2. Add your Vercel domain to **Authorized Domains**:
   `your-app.vercel.app`

---

## 📱 Features Deep Dive

### 🎤 Voice Interview Flow
```
User clicks "Start Answering"
    ↓
Browser Web Speech API activates mic
    ↓
Real-time transcription appears in box
    ↓
Filler words highlighted in amber
    ↓
Live metrics: words, fillers, tone, confidence
    ↓
User clicks "Submit Answer"
    ↓
Transcript sent to backend
    ↓
Gemini AI evaluates → score + feedback
    ↓
Results shown in modal
    ↓
"Next Question" → AI may ask follow-up
```

### 🧠 AI Evaluation Criteria
| Category | Weight | What It Measures |
|----------|--------|-----------------|
| Correctness | 40% | Technical accuracy, completeness |
| Communication | 35% | Clarity, structure, articulation |
| Confidence | 25% | Certainty, filler words, pace |

### 📊 Score Grading
| Score | Grade | Meaning |
|-------|-------|---------|
| 85-100 | A | Excellent – Interview ready! |
| 70-84 | B | Good – Minor improvements needed |
| 50-69 | C | Average – Practice more |
| 0-49 | D | Below average – Review fundamentals |

---

## 🎨 UI/UX Design

### Design System
```
Colors (Dark Mode):
├── Background: #080b14
├── Card: #111827
├── Border: #1e2d45
├── Accent Blue: #4f8cff
├── Accent Purple: #a78bfa
├── Accent Green: #34d399
└── Accent Yellow: #f59e0b

Typography:
├── Display: Syne (headings, numbers)
└── Body: DM Sans (text, UI)

Spacing: 8px base unit
Radius: 8px → 28px scale
```

### Component Library
- **Buttons**: Primary (gradient), Outline, Ghost
- **Cards**: With hover glow effects
- **Badges**: Color-coded score system
- **Progress Bars**: Animated fills
- **Toasts**: Success/Error/Info/Warning
- **Modals**: Backdrop blur + scale animation
- **Charts**: Line (progress) + Radar (skills) + Bar (Q-scores)

---

## 🔐 Security

- **Helmet.js** – HTTP security headers
- **CORS** – Whitelist allowed origins
- **Rate Limiting** – 100 req/15min API, 20 req/min AI endpoints
- **Firebase Token Verification** – All protected routes verify JWT
- **Input Validation** – Sanitize all user inputs
- **File Upload** – Max 5MB, allowed types only (PDF, TXT, DOC)

---

## 🗺️ Roadmap

- [ ] Coding interview mode with code editor (Monaco)
- [ ] Video recording of interview sessions
- [ ] Company-specific question datasets (scraped data)
- [ ] Interview scheduling & reminders
- [ ] Group mock interviews
- [ ] Mobile app (React Native)
- [ ] AI face expression analysis
- [ ] Integration with LinkedIn profile

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License – see [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- **Google Gemini AI** – Question generation & evaluation
- **Firebase** – Auth & database
- **Chart.js** – Performance visualizations
- **Web Speech API** – Voice recognition
- **Vercel** – Deployment platform

---

<div align="center">

Made with ❤️ for students preparing for their dream jobs

**[⭐ Star this repo if it helped you!]**

</div>
