// File: src/hooks/useDashboard.js (Corrected and More Robust)

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getBotStatus } from '../api/bot.js'; // Assuming file is named botApi.js
import { getLogs } from '../api/log.js';     // Assuming file is named logsApi.js

export const useDashboard = () => {
  const { token } = useAuth(); // We get the token to know IF we should fetch.
  const [botStatus, setBotStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true); // Start loading immediately.
  const [error, setError] = useState('');

  // The data fetching logic is now inside a self-contained useEffect hook.
  useEffect(() => {
    // Don't try to fetch data if the user isn't logged in.
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');

      try {
        // Use the correct imported function names.
        // The token is sent automatically by the apiClient.
        const [statusRes, logsRes] = await Promise.all([
          getBotStatus(),
          getLogs()
        ]);

        setBotStatus(statusRes);
        setLogs(logsRes);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]); // This effect re-runs if the token changes (i.e., user logs in).

  // The hook now just returns the data state.
  return { botStatus, logs, loading, error };
};
