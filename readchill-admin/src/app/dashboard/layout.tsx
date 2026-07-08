"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  LogOut, 
  Menu,
  Sun,
  Moon,
  Wallet,
  ShoppingBag
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect if not authenticated or not authorized
    if (!loading) {
      if (!user || (role !== "admin" && role !== "partner")) {
        router.push("/login");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || !role) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 w-64 transition-all duration-300 ${isSidebarOpen ? "ml-0" : "-ml-64"} flex flex-col`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-200 dark:border-slate-700 px-4">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-500">ReadChill <span className="text-sm font-normal text-slate-500">[{role === "admin" ? "Admin" : "Partner"}]</span></h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            <LayoutDashboard size={20} />
            <span className="font-medium">{t("overview")}</span>
          </Link>
          
          <Link href="/dashboard/content" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            <BookOpen size={20} />
            <span className="font-medium">{t("contentManager")}</span>
          </Link>

          <Link href="/dashboard/finance" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            <Wallet size={20} />
            <span className="font-medium">{t("finance")}</span>
          </Link>

          <Link href="/dashboard/shop" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            <ShoppingBag size={20} />
            <span className="font-medium">My Shop</span>
          </Link>

          {role === "admin" && (
            <Link href="/dashboard/partners" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Users size={20} />
              <span className="font-medium">{t("partnerMgmt")}</span>
            </Link>
          )}

          {role === "admin" && (
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Settings size={20} />
              <span className="font-medium">{t("settings")}</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-10 h-10 rounded-full" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.displayName || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none">
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLanguage(language === "th" ? "en" : "th")} 
              className="px-2 py-1 text-sm font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 uppercase"
            >
              {language}
            </button>
            {mounted && (
              <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
