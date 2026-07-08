"use client";

import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Users, BookOpen, DollarSign } from "lucide-react";

export default function DashboardOverview() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h2>
        <p className="text-slate-500 dark:text-slate-400">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">฿0.00</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-sm text-emerald-500 mt-4 flex items-center gap-1">
            <TrendingUp size={16} /> +0% from last month
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Views</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0</h3>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Your Content</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <BookOpen size={24} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Pending Actions or Charts placeholder */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[300px] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 italic">No recent activity data to display.</p>
      </div>

    </div>
  );
}
