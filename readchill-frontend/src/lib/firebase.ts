import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA1-4fnlowdoF6IrFsSGCcnsnFHtwgzQ5o",
  authDomain: "readchill.firebaseapp.com",
  projectId: "readchill",
  storageBucket: "readchill.firebasestorage.app",
  messagingSenderId: "130626914375",
  appId: "1:130626914375:web:79450f746ab35d49c40962",
  measurementId: "G-QWBPVDK8BJ"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = initializeFirestore(app, {});
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);

export { app, auth, db, googleProvider, storage };
