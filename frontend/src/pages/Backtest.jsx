// src/pages/Backtest.jsx
import React, { useState } from 'react';
import api from '../api';

const Backtest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runBacktest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/bot/backtest'); // Adjust endpoint as needed
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Backtest failed.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Backtest</h2>
      <button onClick={runBacktest} disabled={loading}>
        {loading ? 'Running...' : 'Run Backtest'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <p>Initial Balance: {result.initialBalance}</p>
          <p>Final Balance: {result.finalBalance}</p>
          <p>Total Trades: {result.totalTrades}</p>
          <p>Profit: {result.profit}</p>
          <p>Candles Tested: {result.candlesTested}</p>
        </div>
      )}
    </div>
  );
};

export default Backtest;
