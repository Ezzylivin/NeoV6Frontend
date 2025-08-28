// File: src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* NavBar at the top */}
      <NavBar />

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-100 text-gray-900">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
