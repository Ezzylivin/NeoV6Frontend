// File: src/layouts/DashboardLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx"; // <-- Import Header instead of NavBar

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Replace NavBar with Header */}
      <Header />

      {/* Main content wrapper, centered */}
      <div className="flex-1 flex justify-center items-center p-6">
        <div className="w-full max-w-4xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
