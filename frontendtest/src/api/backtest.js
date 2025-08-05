// src/api/backtest.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const runBacktest = async (token) => {
  const res = await fetch(`${API_BASE}/backtest/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to run backtest');
  return await res.json();
};

export const fetchBacktestResults = async (token, timeframe = '') => {
  const url = new URL(`${API_BASE}/backtest/results`);
  if (timeframe) url.searchParams.append('timeframe', timeframe);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch backtest results');
  return await res.json();
};
