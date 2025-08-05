
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const fetchLogs = async (token) => {
  const res = await fetch(`${API_BASE}/logs.jsx`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch logs');
  return await res.json();
};
