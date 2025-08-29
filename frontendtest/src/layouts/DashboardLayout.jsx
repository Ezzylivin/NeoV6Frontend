// File: src/layouts/DashboardLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
// import NavBar from "../components/NavBar.jsx"; // 🔹 commented out

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* <NavBar /> */} {/* 🔹 commented out */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-5xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
