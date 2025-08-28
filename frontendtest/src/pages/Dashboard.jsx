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
