import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchBotStatus } from '../api/bot.jsx';
import { fetchLogs } from '../api/logs.jsx';

export const useDashboard = () => {
  const { token } = useAuth();
  const [botStatus, setBotStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [statusRes, logsRes] = await Promise.all([
        fetchBotStatus(token),
        fetchLogs(token)
      ]);

      setBotStatus(statusRes);
      setLogs(logsRes);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return { botStatus, logs, loading, error, fetchDashboardData };
};
