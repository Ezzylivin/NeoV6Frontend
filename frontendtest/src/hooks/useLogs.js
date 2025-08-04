// src/hooks/useLogs.js
import { useState, useEffect } from 'react';
import api from '../api';

export const useLogs = () => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const { data } = await api.get('/logs');
    setLogs(data);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return { logs, refresh: fetchLogs };
};
