import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useDashboard } from "../hooks/useDashboard.js";

export default function Dashboard() {
  const { user } = useAuth();
  const { botStatus, logs, loading, error, fetchDashboardData } = useDashboard();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Main content */}
      <main className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Welcome, {user?.username || "User"}!
        </h2>

        {/* Loading & error */}
        {loading && (
          <p className="text-blue-400 bg-blue-900 bg-opacity-40 p-3
