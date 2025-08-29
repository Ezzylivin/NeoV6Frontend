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
    <div className="w-full bg-black text-white p-4 rounded-lg border border-gray-700">
      <h2 className="text-2xl font-semibold mb-2">
        Welcome, {user?.username || "User"}!
      </h2>

      {loading && <p className="text-blue-400">Loading dashboard data...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      <section className="mb-4">
        <h3 className="text-xl font-semibold">Bot Status</h3>
        <p>{botStatus?.status || "Unknown"}</p>
      </section>

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
    </div>
  );
}
