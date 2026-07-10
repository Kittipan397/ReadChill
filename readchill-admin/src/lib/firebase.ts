import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
