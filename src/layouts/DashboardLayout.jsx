// File: src/layouts/DashboardLayout.jsx
// 🚀 THEME UPDATE: "Carbon Grey & Emerald"

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    // CHANGED: bg-gray-900 -> bg-[#121212] (Carbon Background)
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Top header */}
      <Header />

      {/* User info below header, aligned left */}
      {isAuthenticated && (
        // CHANGED: bg-gray-800 -> bg-[#1a1a1a] (Lighter Carbon Strip)
        // CHANGED: border-gray-700 -> border-white/10 (Glass Border)
        <div className="flex justify-start pl-6 pt-2 pb-2 bg-[#1a1a1a] border-b border-white/10">
          <div className="text-left">
            <p className="font-medium">The Best</p>
            {/* CHANGED: text-gray-400 -> text-neutral-400 (True Grey) */}
            <p className="text-neutral-400 text-sm">Trading Bot</p>
            {/* CHANGED: text-green-400 -> text-emerald-400 (Matches new Emerald theme) */}
            <p className="text-emerald-400 font-semibold">In Existence</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
