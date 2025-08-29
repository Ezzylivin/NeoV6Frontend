// File: src/layouts/DashboardLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
// import NavBar from "../components/NavBar.jsx"; // 🔹 commented out

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center">
      <div className="w-full max-w-4xl p-6 rounded-lg border border-gray-800 shadow-lg">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
