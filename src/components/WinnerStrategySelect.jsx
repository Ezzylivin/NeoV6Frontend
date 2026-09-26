// File: src/components/WinnerStrategySelect.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/api.js';

const API_BASE_URL = BACKEND_URL;

const WinnerStrategySelect = ({ onStrategySelect, className = "" }) => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Define Fetch Logic (reusable for initial load & button click)
  const fetchWinners = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("No auth token found");

      // Fetch from API
      const response = await axios.get(`${API_BASE_URL}/api/bot/winners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(response.data)) {
        setWinners(response.data);
      } else {
        setWinners([]);
      }
    } catch (err) {
      console.error("❌ Failed to load winners:", err);
      if (err.response && err.response.status === 401) {
        setError("Session expired. Re-login.");
      } else {
        setError("Failed to load data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load on Mount
  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  // 3. Handle Selection
  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const selectedBot = winners.find(w => w.botId === selectedId || w.id === selectedId);
    
    if (selectedBot && onStrategySelect) {
      onStrategySelect({
        symbol: selectedBot.symbol,
        config: selectedBot.config, 
        roi: selectedBot.roi
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      {/* Dropdown Container */}
      <div className="relative flex-grow">
        <select 
            onChange={handleChange}
            disabled={loading || !!error}
            className={`
                w-full bg-[#1a1a1a] text-white text-xs rounded p-2 pr-8 outline-none transition-colors appearance-none cursor-pointer
                border ${error ? 'border-red-500' : 'border-gray-700 hover:border-emerald-500 focus:border-emerald-500'}
                ${loading ? 'opacity-50 cursor-wait' : ''}
            `}
            defaultValue=""
        >
            <option value="" disabled>
                {loading ? "Loading strategies..." : error ? `⚠️ ${error}` : "🏆 Load Top Performer"}
            </option>
            {winners.map((bot) => {
                const id = bot.botId || bot.id; 
                return (
                    <option key={id} value={id}>
                        {bot.symbol} | ROI: {(bot.roi * 100).toFixed(0)}%
                    </option>
                );
            })}
        </select>
        
        {/* Custom Chevron Icon (Visual only) */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        type="button"
        onClick={fetchWinners}
        disabled={loading}
        className={`
            p-2 bg-[#1a1a1a] border border-gray-700 rounded text-gray-400 
            hover:text-white hover:border-emerald-500 transition-all active:scale-95
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title="Refresh Strategies"
      >
        <div className={`font-bold text-xs ${loading ? "animate-spin" : ""}`}>↻</div>
      </button>
    </div>
  );
};

export default WinnerStrategySelect;
