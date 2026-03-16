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

    db = admin.firestore();
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
function createMockDB() {
  const store = {};
  return {
    collection: (col) => ({
      doc: (id) => ({
        set: async (data) => { store[`${col}/${id}`] = { ...data, id }; return true; },
        get: async () => {
          const d = store[`${col}/${id}`];
          return { exists: !!d, data: () => d, id };
        },
        update: async (data) => {
          store[`${col}/${id}`] = { ...store[`${col}/${id}`], ...data };
          return true;
        },
      }),
      add: async (data) => {
        const id = 'mock_' + Date.now();
        store[`${col}/${id}`] = { ...data, id };
        return { id };
      },
      where: () => ({
        orderBy: () => ({
          limit: () => ({ get: async () => ({ forEach: () => {}, docs: [] }) }),
          get: async () => ({ forEach: () => {}, docs: [] }),
        }),
        get: async () => ({ forEach: () => {}, docs: [] }),
      }),
      orderBy: () => ({
        limit: () => ({ get: async () => ({ forEach: () => {}, docs: [] }) }),
      }),
    }),
    FieldValue: { serverTimestamp: () => new Date(), increment: (n) => n },
  };
}

function createMockAuth() {
  return {
    verifyIdToken: async () => ({ uid: 'demo_user', email: 'demo@example.com', name: 'Demo User' }),
  };
}

const { db: firebaseDB, auth: firebaseAuth } = initFirebase();
module.exports = { admin, db: firebaseDB, auth: firebaseAuth };
