// File: src/components/DashboardLayout.jsx
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded ${isActive ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`;

  const handleLogout = async () => {
    await logout();        // clears auth context / tokens
    navigate('/login');    // redirect to login page
  };

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

        {/* User info + logout */}
        {user && (
          <div className="text-right flex flex-col items-end space-y-1">
            <p className="font-medium">{user.username}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <p className="text-green-400 font-semibold">
              Wallet: ${user.walletBalance?.toFixed(2)}
            </p>
            <button
              onClick={handleLogout}
              className="mt-1 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm"
            >
              Logout
            </button>
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
