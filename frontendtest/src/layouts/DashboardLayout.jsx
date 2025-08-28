import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <NavBar />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Card-like container for page content */}
        <div className="bg-gray-900 rounded-xl shadow-lg p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
