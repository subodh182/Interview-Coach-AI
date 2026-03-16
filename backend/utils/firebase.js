// utils/firebase.js – Firebase Admin SDK
const admin = require('firebase-admin');

let db, auth;

function initFirebase() {
  if (admin.apps.length > 0) return { db, auth };

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : null;

    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      // For Vercel: use individual env vars
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    // db = admin.firestore();
    const { getDatabase } = require('firebase-admin/database');
    db = getDatabase();
    
    auth = admin.auth();
    console.log('✓ Firebase Admin initialized');
  } catch (err) {
    console.warn('⚠ Firebase Admin init failed (demo mode):', err.message);
    // Return mock objects for demo/development
    db = createMockDB();
    auth = createMockAuth();
  }

  return { db, auth };
}

// Mock DB for development without Firebase creds
// NAYA Mock DB for Realtime Database style
function createMockDB() {
  const store = {};
  return {
    ref: (path) => ({
      set:    async (data) => { store[path] = data; },
      update: async (data) => { store[path] = { ...store[path], ...data }; },
      get:    async () => ({
        exists: () => !!store[path],
        val:    () => store[path] || null,
      }),
      push:   async (data) => {
        const id = 'mock_' + Date.now();
        store[`${path}/${id}`] = data;
        return { key: id };
      },
      orderByChild: (field) => ({
        limitToLast: (n) => ({
          get: async () => ({
            exists: () => false,
            forEach: () => {},
          }),
        }),
        equalTo: (val) => ({
          get: async () => ({ exists: () => false, forEach: () => {} }),
        }),
      }),
      on:  (event, cb) => cb({ val: () => null }),
      off: () => {},
    }),
    ServerValue: { TIMESTAMP: Date.now() },
  };
}

function createMockAuth() {
  return {
    verifyIdToken: async () => ({ uid: 'demo_user', email: 'demo@example.com', name: 'Demo User' }),
  };
}

const { db: firebaseDB, auth: firebaseAuth } = initFirebase();
module.exports = { admin, db: firebaseDB, auth: firebaseAuth };
