"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Shield, Bell, Globe, Moon, Sun, CheckCircle2, Paintbrush } from "lucide-react";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { user, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    setSaveMessage("Settings saved successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your account and platform preferences.</p>
        </div>
        {saveMessage && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg font-medium">
            <CheckCircle2 size={18} />
            {saveMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors text-left ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <User size={20} />
            My Profile
          </button>
          
          <button 
            onClick={() => setActiveTab("appearance")}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors text-left ${activeTab === 'appearance' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Sun size={20} />
            Appearance
          </button>

          <button 
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors text-left ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Bell size={20} />
            Notifications
          </button>

          {role === "admin" && (
            <button 
              onClick={() => setActiveTab("platform")}
              className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors text-left ${activeTab === 'platform' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Globe size={20} />
              Platform Settings
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <User size={20} className="text-blue-500" />
                Profile Information
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden shrink-0 border-4 border-white shadow-lg">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User size={32} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-lg">{user?.displayName || "Anonymous User"}</h4>
                    <p className="text-slate-500">{user?.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      role === "admin" ? "bg-red-100 text-red-700" :
                      role === "partner" ? "bg-purple-100 text-purple-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {role} Role
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                    <input 
                      type="text" 
                      disabled
                      value={user?.displayName || ""}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={user?.email || ""}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Sun size={20} className="text-amber-500" />
                Appearance
              </h3>
              <p className="text-slate-600 mb-4">Choose how ReadChill Admin looks to you.</p>
              
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {mounted ? (
                  <>
                    <button 
                      onClick={() => setTheme("light")}
                      className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <Sun size={24} />
                      <span className="font-medium">Light Mode</span>
                    </button>
                    <button 
                      onClick={() => setTheme("dark")}
                      className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <Moon size={24} />
                      <span className="font-medium">Dark Mode</span>
                    </button>
                  </>
                ) : (
                  <div className="col-span-2 h-28 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"></div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Bell size={20} className="text-indigo-500" />
                Notification Preferences
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div>
                    <h4 className="font-medium text-slate-800">Email Alerts</h4>
                    <p className="text-sm text-slate-500">Receive emails for security alerts and major updates.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                </label>
                
                <label className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  <div>
                    <h4 className="font-medium text-slate-800">New Partner Registrations</h4>
                    <p className="text-sm text-slate-500">Get notified when a new partner joins the platform.</p>
                  </div>
                  <input type="checkbox" defaultChecked={role === 'admin'} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                </label>

                <div className="pt-4">
                  <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PLATFORM SETTINGS TAB (Admin Only) */}
          {activeTab === "platform" && role === "admin" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Globe size={20} className="text-purple-500" />
                Platform Settings
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Revenue Share (%)</label>
                  <input 
                    type="number" 
                    defaultValue={73}
                    className="w-32 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">This will be the default split when adding a new partner.</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button onClick={handleSave} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
