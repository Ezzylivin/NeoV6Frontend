// File: src/layouts/DashboardLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar.jsx"; // import NavBar

export default function DashboardLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Top navigation bar */}
      <NavBar />

      {/* Main content wrapper */}
      <div className="flex flex-1 justify-center items-center">
        <div className="w-full max-w-4xl p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
