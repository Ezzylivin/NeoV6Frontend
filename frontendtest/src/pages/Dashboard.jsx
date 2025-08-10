import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth(); // Get logged-in user
  const { botStatus, logs, loading, error, fetchDashboardData } = useDashboard();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome, {user?.username}</h1>

      <section style={{ marginTop: '1rem' }}>
        <h2>Bot Status</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <p>Status: {botStatus?.status || 'Unknown'}</p>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <h2>Recent Logs</h2>
        {logs.length === 0 ? (
          <p>No logs found.</p>
        ) : (
          <ul>
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
};

export default Dashboard;
