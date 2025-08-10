import { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { getBotStatus } from '../api/bot.js';
import { getLogs } from '../api/logs.js';

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
