// File: src/layouts/DashboardLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white">
      {/* Main content wrapper */}
      <div className="w-full max-w-4xl p-6">
        <Outlet />
      </div>
    </div>
  );
}
