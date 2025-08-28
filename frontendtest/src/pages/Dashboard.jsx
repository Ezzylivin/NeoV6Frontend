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
    <div>
      <h2 className="text-2xl font-semibold mb-6">
        Welcome, {user?.username || "User"}!
      </h2>

      {loading && <p className="mb-4 text-blue-400">Loading dashboard data...</p>}
      {error && <p className="mb-4 text-red-500">Error: {error}</p>}

      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Bot Status</h3>
        <p>{botStatus?.status || "Unknown"}</p>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Recent Logs</h3>
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
