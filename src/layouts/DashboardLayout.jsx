// File: src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top header */}
      <Header />

      {/* User info below header, aligned right */}
      {isAuthenticated && (
        <div className="flex justify-end pr-6 pt-2 pb-2 bg-gray-800 border-b border-gray-700">
          <div className="text-right">
            <p className="font-medium">{user.username}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <p className="text-green-400 font-semibold">Wallet: ${user.walletBalance?.toFixed(2)}</p>
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
