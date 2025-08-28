// File: src/layouts/DashboardLayout.jsx

import React from 'react';
// Outlet is a special component from react-router-dom that renders the child route's element
import { Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Header from '../components/Header.jsx';

const DashboardLayout = () => {
  return (
        <div className="min-h-screen flex flex-col">
      {/* NavBar MUST be rendered here */}
      <NavBar />

    <div className="dashboard-layout">
      {/* The Header will be rendered at the top of every page using this layout */}
      <Header />
      
      {/* The main content area */}
      <main style={{ padding: '2rem' }}>
        {/* 
          The <Outlet> is the magic part. React Router will automatically render
          the correct page component here (e.g., <Dashboard />, <SettingsPage />)
          based on the current URL.
        */}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
