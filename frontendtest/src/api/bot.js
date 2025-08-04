const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const startBot = async (token, symbol, amount, timeframes) => {
  const res = await fetch(`${API_BASE}/bot/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ symbol, amount, timeframes }),
  });
  if (!res.ok) throw new Error('Failed to start bot');
  return await res.json();
};

export const stopBot = async (token) => {
  const res = await fetch(`${API_BASE}/bot/stop`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to stop bot');
  return await res.json();
};

export const getBotStatus = async (token) => {
  const res = await fetch(`${API_BASE}/bot/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get bot status');
  return await res.json();
};
