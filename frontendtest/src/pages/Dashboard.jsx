import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx'; // ✅ make sure you import your navbar

const Dashboard = () => {
  const { user } = useAuth();
  const { botStatus, logs, loading, error, fetchDashboardData } = useDashboard();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Navbar /> {/* ✅ always visible */}

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user?.username}</h1>

        {/* loading and error states are inside the layout */}
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

        <section className="mb-6">
          <h2 className="text-xl font-semibold">Bot Status</h2>
          <p>Status: {botStatus?.status || 'Unknown'}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Recent Logs</h2>
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
};

export default Dashboard;
