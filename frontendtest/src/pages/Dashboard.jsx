// File: src/pages/Dashboard.jsx
import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useDashboard } from "../hooks/useDashboard.js";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar.jsx"; // your custom NavBar

export default function Dashboard() {
  const { user, clearAuthData } = useAuth();
  const { botStatus, logs, loading, error, fetchDashboardData } = useDashboard();
  const navigate = useNavigate();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = () => {
    clearAuthData();
    navigate("/"); // redirect to login/register
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Navbar with logout */}
      <nav className="flex items-center justify-between p-4 bg-gray-800 shadow-md">
        <h1 className="text-xl font-bold">NeoV6 Dashboard</h1>
        <div className="flex items-center gap-4">
          {user && <span className="text-gray-300">Hello, {user.username || user.email}</span>}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Welcome , {user?.username || "User"}!
        </h2>

        {/* Loading & error */}
        {loading && (
          <p className="text-blue-400 bg-blue-900 bg-opacity-40 p-3 rounded mb-4">
            Loading dashboard data...
          </p>
        )}
        {error && (
          <p className="text-red-400 bg-red-900 bg-opacity-40 p-3 rounded mb-4">
            Error: {error}
          </p>
        )}

        {/* Bot Status */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold">Bot Status</h3>
          <p>Status: {botStatus?.status || "Unknown"}</p>
        </section>

        {/* Recent Logs */}
        <section>
          <h3 className="text-xl font-semibold">Recent Logs</h3>
          {logs.length === 0 ? (
            <p>No logs found.</p>
          ) : (
            <ul className="list-disc ml-6">
              {logs.map((log, idx) => (
                <li key={idx}>
                  [{new Date(log.timestamp).toLocaleString()}] {log.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
