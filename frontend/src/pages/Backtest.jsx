// File: frontend/src/pages/Backtest.jsx
import React, { useState } from 'react';
import api from '../api';

const Backtest = () => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBacktest = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await api.post('/bot/backtest');
      setResult(res.data);
    } catch (error) {
      setResult({ error: 'Failed to run backtest.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Backtest AI Strategy</h2>
      <button onClick={handleBacktest} disabled={isLoading}>
        {isLoading ? 'Running Backtest...' : 'Run Backtest on 1h BTC/USDT Data'}
      </button>
      {result && (
        <pre style={{ background: '#eee', padding: '15px', marginTop: '20px' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default Backtest;


