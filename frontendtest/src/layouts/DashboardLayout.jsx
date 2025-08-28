// File: src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';
import Header from '../components/Header.jsx';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* NavBar at the top */}
      <NavBar />

      <div className="dashboard-layout flex-1">
        {/* Header */}
        <Header />

        {/* Main content */}
        <main style={{ padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
