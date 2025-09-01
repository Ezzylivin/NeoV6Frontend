// File: src/components/DashboardLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { user } = useAuth();

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`;

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header with navigation */}
      <header className="flex justify-between items-center bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold">NeoV6</h1>
          <NavLink to="/dashboard" end className={linkClass}>
            Dashboard
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
        </div>

        {/* User info */}
        {user && (
          <div className="text-right">
            <p className="font-medium">{user.username}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <p className="text-green-400 font-semibold">
              Wallet: ${user.walletBalance?.toFixed(2)}
            </p>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
