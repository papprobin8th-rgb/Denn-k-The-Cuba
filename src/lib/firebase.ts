import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is provided
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

// Use initializeFirestore with experimentalForceLongPolling to fix "offline" errors in iframes
export const db = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true
}) : null;

export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot };
