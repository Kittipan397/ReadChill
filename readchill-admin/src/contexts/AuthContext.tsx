"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export type Role = "admin" | "partner" | "user" | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      try {
        if (currentUser) {
          // Hardcode Super Admin
          if (currentUser.email === "kittipan.g397@gmail.com") {
            setRole("admin");
            // Ensure it's saved in DB as well
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists() || userSnap.data().role !== "admin") {
              await setDoc(userRef, {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                role: "admin",
                createdAt: new Date()
              }, { merge: true });
            }
          } else {
            // Check role from Firestore
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              setRole(userSnap.data().role as Role);
            } else {
              // First time login - Check pre_approved_partners
              const q = query(collection(db, "pre_approved_partners"), where("email", "==", currentUser.email?.toLowerCase() || ""));
              const preApproveSnap = await getDocs(q);
              
              if (!preApproveSnap.empty) {
                const partnerData = preApproveSnap.docs[0].data();
                await setDoc(userRef, {
                  email: currentUser.email,
                  displayName: currentUser.displayName,
                  photoURL: currentUser.photoURL,
                  role: "partner",
                  revenueShare: partnerData.revenueShare || 73,
                  earnedCoins: 0,
                  createdAt: new Date()
                });
                setRole("partner");
              } else {
                await setDoc(userRef, {
                  email: currentUser.email,
                  displayName: currentUser.displayName,
                  photoURL: currentUser.photoURL,
                  role: "user",
                  createdAt: new Date()
                });
                setRole("user"); // Default to normal user
              }
            }
          }
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Error in AuthContext fetching role:", error);
        // Fallback role on error
        setRole(currentUser?.email === "kittipan.g397@gmail.com" ? "admin" : "user");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
