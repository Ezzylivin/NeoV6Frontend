// src/hooks/useBot.js
import { useState, useEffect } from 'react';
import api from '../api';

export const useBot = () => {
  const [status, setStatus] = useState(null);

  const getStatus = async () => {
    const { data } = await api.get('/bot/status');
    setStatus(data);
  };

  const startBot = async (symbol, amount, timeframes) => {
    await api.post('/bot/start', { symbol, amount, timeframes });
    await getStatus();
  };

  const stopBot = async () => {
    await api.post('/bot/stop');
    await getStatus();
  };

  useEffect(() => {
    getStatus();
  }, []);

  return { status, startBot, stopBot };
};
