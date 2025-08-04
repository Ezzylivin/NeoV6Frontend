// File: src/pages/Backtest.jsx
import React, { useState } from 'react';
import { runBacktest, getBacktestResults } from '../api/backtest';

const Backtest = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRunBacktest = async () => {
    setLoading(true);
    setError('');
    try {
      await runBacktest();
      const res = await getBacktestResults();
      setResults(res.data);
    } catch {
      setError('Backtest failed or no results available.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Backtest</h2>
      <button onClick={handleRunBacktest} disabled={loading}>
        {loading ? 'Running...' : 'Run Backtest'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results && (
        <div>
          <h3>Backtest Results:</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default Backtest;
