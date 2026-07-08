"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, role, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check for custom token for Single Sign-On
    const params = new URLSearchParams(window.location.search);
    const customToken = params.get("token");
    
    if (customToken && !user) {
      import("firebase/auth").then(({ signInWithCustomToken }) => {
        import("@/lib/firebase").then(({ auth }) => {
          signInWithCustomToken(auth, customToken).then(() => {
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            router.push("/dashboard");
          }).catch(console.error);
        });
      });
      return;
    }

    if (!loading && user && (role === "admin" || role === "partner")) {
      router.push("/dashboard");
    }
  }, [user, role, loading, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">ReadChill</h1>
          <p className="text-slate-500 dark:text-slate-400">Admin & Partner Portal</p>
        </div>
        
        {user && role === "user" ? (
          <div className="text-center text-red-500 mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p>Access Denied. You do not have Partner or Admin privileges.</p>
            <p className="text-sm mt-2 text-slate-500">Please contact the administrator to request Partner access.</p>
          </div>
        ) : null}

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 px-4 rounded-xl font-medium transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
