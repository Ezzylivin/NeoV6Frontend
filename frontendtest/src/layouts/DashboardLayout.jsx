// File: src/layouts/DashboardLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";

export default function DashboardLayout() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <Header />
      <div className="flex justify-center w-full p-6 flex-1">
        <div className="w-full max-w-4xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
