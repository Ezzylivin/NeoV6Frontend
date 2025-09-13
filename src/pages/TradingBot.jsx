// File: src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import * as backtestApi from '../api/backtest.js';
import * as botApi from '../api/bot.js';

// (We will move UI components like charts and stats into their own files later)
export default function TradingBot() {
  const [form, setForm] = useState({
    symbol: 'BTCUSDT',
    timeframe: '1h',
    initialBalance: 10000,
    strategy: {
        type: 'SMA',
        parameters: { fast: 10, slow: 20 }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [botStatus, setBotStatus] = useState(null);
  
  const handleRunSingle = async () => {
    setLoading(true);
    setError(null);
    try {
      // startDate and endDate are required by the backend
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 90); // Default to 90 days ago

      const result = await backtestApi.run({ ...form, startDate, endDate });
      setLatestResult(result);
    } catch (err) {
      setError(err.response?.data?.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartBot = async () => {
      // Simplified bot start logic
      const config = { symbol: form.symbol, amount: form.initialBalance };
      const status = await botApi.start(config);
      setBotStatus(status);
  };
  
  useEffect(() => {
    const fetchStatus = async () => {
        const status = await botApi.getStatus();
        setBotStatus(status);
    }
    fetchStatus();
  }, []);

  // JSX for this page would be simplified to use the state variables above.
  // We've removed all direct `axios` and `fetch` calls.

  return (
    <div>
        <h1>Trading Bot & Backtesting</h1>
        {/* Your form controls would go here, wired to the `form` state */}
        <button onClick={handleRunSingle} disabled={loading}>
            {loading ? 'Running...' : 'Run Backtest'}
        </button>
         <button onClick={handleStartBot}>Start Bot</button>
        {error && <p style={{color: 'red'}}>{error}</p>}
        {latestResult && (
            <div>
                <h2>Latest Result</h2>
                <pre>{JSON.stringify(latestResult.metrics, null, 2)}</pre>
            </div>
        )}
        {botStatus && (
            <div>
                <h2>Bot Status</h2>
                <p>Running: {botStatus.isRunning ? 'Yes' : 'No'}</p>
                <p>Symbol: {botStatus.symbol}</p>
            </div>
        )}
    </div>
  );
}
