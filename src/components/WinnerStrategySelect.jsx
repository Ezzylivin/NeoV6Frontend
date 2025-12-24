// File: src/components/WinnerStrategySelect.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Adjust base URL if your React app is on a different port than your API
// If using a proxy in package.json, you can keep this empty.
const API_BASE_URL = "https://neov6backend.onrender.com/api";

const WinnerStrategySelect = ({ onStrategySelect, className = "" }) => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Winners on Mount
  useEffect(() => {
    const fetchWinners = async () => {
      try {
        setLoading(true);
        // Calls the endpoint we just fixed in Python
        const response = await axios.get(`${API_BASE_URL}/api/bot/winners`);
        
        if (Array.isArray(response.data)) {
          setWinners(response.data);
        } else {
          setWinners([]);
          console.warn("⚠️ Received non-array data for winners:", response.data);
        }
      } catch (err) {
        console.error("❌ Failed to load winners:", err);
        setError("Failed to load strategies.");
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  // 2. Handle Selection
  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    // Find the full bot object to get the hidden 'config' payload
    const selectedBot = winners.find(w => w.botId === selectedId);
    
    if (selectedBot && onStrategySelect) {
      // Pass the config and symbol back to the parent component
      onStrategySelect({
        symbol: selectedBot.symbol,
        config: selectedBot.config, // This contains mlMode, strategies, etc.
        roi: selectedBot.roi
      });
    }
  };

  // 3. Render
  if (loading) return <div className="text-gray-500 text-sm animate-pulse">Loading top strategies...</div>;
  if (error) return <div className="text-red-500 text-sm">Error: {error}</div>;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-semibold text-gray-700">
        🏆 Load Top Performer
      </label>
      <select 
        onChange={handleChange}
        className="p-2 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        defaultValue=""
      >
        <option value="" disabled>-- Select a Winner --</option>
        {winners.map((bot) => (
          <option key={bot.botId} value={bot.botId}>
            {bot.symbol} | ROI: {(bot.roi * 100).toFixed(1)}% | DD: {bot.metrics?.maxDrawdown?.toFixed(1) || 0}%
          </option>
        ))}
      </select>
      <small className="text-xs text-gray-500">
        Selecting one will auto-fill configuration.
      </small>
    </div>
  );
};

export default WinnerStrategySelect;
