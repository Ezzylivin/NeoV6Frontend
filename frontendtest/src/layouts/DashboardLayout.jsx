// File: src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navbar */}
      <NavBar />

      {/* Main content container */}
      <div className="flex-1 flex justify-center items-start p-6">
        <div className="w-full max-w-5xl border border-gray-700 rounded-lg p-6 bg-black shadow-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
