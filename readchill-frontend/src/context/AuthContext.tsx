'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserData {
  coins: number;
  earnedCoins: number;
  role: string;
  activeFrame?: string | null;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
  sessionId: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeDoc: () => void;
    let unsubscribeSession: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        unsubscribeDoc = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
          if (snap.exists()) {
            setUserData(snap.data() as UserData);
          } else {
            setUserData(null);
          }
        });

        // Initialize session tracking
        let sid = localStorage.getItem('readchill_session_id');
        if (!sid) {
          sid = crypto.randomUUID();
          localStorage.setItem('readchill_session_id', sid);
        }
        setSessionId(sid);

        const sessionRef = doc(db, 'users', currentUser.uid, 'sessions', sid);
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown Device';
        
        // Write initial session data
        setDoc(sessionRef, {
          userAgent,
          lastActive: serverTimestamp(),
        }, { merge: true });

        // Fetch IP and update session
        fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => {
            setDoc(sessionRef, { ip: data.ip }, { merge: true }).catch(() => {});
          })
          .catch(() => {});

        // Listen for remote session deletion
        unsubscribeSession = onSnapshot(sessionRef, (snap) => {
          if (!snap.exists() && !snap.metadata.hasPendingWrites) {
            // Document was deleted by another device/session, force logout
            signOut(auth);
            localStorage.removeItem('readchill_session_id');
            setSessionId(null);
          }
        });

      } else {
        setUserData(null);
        setSessionId(null);
        if (unsubscribeDoc) unsubscribeDoc();
        if (unsubscribeSession) unsubscribeSession();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeSession) unsubscribeSession();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, sessionId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
