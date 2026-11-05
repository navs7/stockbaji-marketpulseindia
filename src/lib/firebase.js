// Firebase is optional at runtime: with no VITE_FIREBASE_* values the app runs in local demo mode.
// Spark-plan services used: Hosting, Authentication, Firestore. (FCM push + scheduled functions need Blaze.)
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = !!(cfg.apiKey && cfg.projectId && cfg.appId);
let app, auth, db;
if (firebaseEnabled) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
}

export const watchAuth = (cb) => (firebaseEnabled ? onAuthStateChanged(auth, cb) : (cb(null), () => {}));
export const googleSignIn = () => signInWithPopup(auth, new GoogleAuthProvider());
export const fbSignOut = () => signOut(auth);

const EMAIL_KEY = 'mp.emailForSignIn';
export const sendEmailLink = async (email) => {
  await sendSignInLinkToEmail(auth, email, { url: `${location.origin}/login`, handleCodeInApp: true });
  localStorage.setItem(EMAIL_KEY, email);
};
export const finishEmailLink = async () => {
  if (!firebaseEnabled || !isSignInWithEmailLink(auth, location.href)) return null;
  let email = localStorage.getItem(EMAIL_KEY) || window.prompt('Confirm your email to finish signing in');
  if (!email) return null;
  const res = await signInWithEmailLink(auth, email, location.href);
  localStorage.removeItem(EMAIL_KEY);
  return res.user;
};

export const loadRemote = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};
export const saveRemote = (uid, payload) => setDoc(doc(db, 'users', uid), payload);
export const deleteRemote = (uid) => deleteDoc(doc(db, 'users', uid));
