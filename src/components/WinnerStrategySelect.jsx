// File: src/components/WinnerStrategySelect.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ✅ CORRECT BASE URL
const API_BASE_URL = "https://neov6backend.onrender.com";

const WinnerStrategySelect = ({ onStrategySelect, className = "" }) => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        setLoading(true);
        
        // 🔐 AUTHENTICATION FIX: Get token from storage
        const token = localStorage.getItem('token');
        
        // Check if token exists to avoid 401 loops
        if (!token) {
             console.warn("⚠️ No auth token found. Cannot fetch winners.");
             setError("Please log in to view strategies.");
             setLoading(false);
             return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/bot/winners`, {
            headers: {
                Authorization: `Bearer ${token}` // Attach the token here
            }
        });
        
        if (Array.isArray(response.data)) {
          setWinners(response.data);
        } else {
          setWinners([]);
        }
      } catch (err) {
        console.error("❌ Failed to load winners:", err);
        // Handle 401 specifically if needed
        if (err.response && err.response.status === 401) {
            setError("Session expired. Please re-login.");
        } else {
            setError("Failed to load strategies.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    // Support both ID formats
    const selectedBot = winners.find(w => w.botId === selectedId || w.id === selectedId);
    
    if (selectedBot && onStrategySelect) {
      onStrategySelect({
        symbol: selectedBot.symbol,
        config: selectedBot.config, 
        roi: selectedBot.roi
      });
    }
  };

  if (loading) return <div className="text-gray-500 text-xs animate-pulse">Loading strategies...</div>;
  if (error) return <div className="text-red-500 text-xs">{error}</div>;

  return (
    <select 
        onChange={handleChange}
        className={`bg-[#1a1a1a] text-white border border-gray-700 text-xs rounded p-2 outline-none hover:border-emerald-500 focus:border-emerald-500 transition-colors w-full ${className}`}
        defaultValue=""
    >
        <option value="" disabled>🏆 Load Top Performer</option>
        {winners.map((bot) => {
            const id = bot.botId || bot.id; 
            return (
                <option key={id} value={id}>
                    {bot.symbol} | ROI: {(bot.roi * 100).toFixed(0)}%
                </option>
            );
        })}
    </select>
  );
};

export default WinnerStrategySelect;
