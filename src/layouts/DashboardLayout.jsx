// File: src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';

export default function DashboardLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header with user info and navigation */}
      <Header />

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
