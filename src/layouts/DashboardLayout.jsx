import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';

export default function DashboardLayout() {
  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded mb-2 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`;

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 flex-shrink-0">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
        <nav>
          <NavLink to="/dashboard" end className={linkClass}>
            Crypto Dashboard
          </NavLink>
          <NavLink to="/dashboard/backtests" className={linkClass}>
            Backtests
          </NavLink>
          <NavLink to="/dashboard/tradingbot" className={linkClass}>
            Trading Bot
          </NavLink>
          <NavLink to="/dashboard/settings" className={linkClass}>
            Settings
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Header /> {/* optional header above main content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
