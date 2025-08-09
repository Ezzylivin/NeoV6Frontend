import React from 'react';
import { useBot } from '../hooks/useBot';

export default function tradingBot() {
  const {
    symbol,
    setSymbol,
    status,
    logs,
    loading,
    error,
    handleStart,
    handleStop,
    handleStatus,
  } = useBot();

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Bot Training</h1>

      <input
        type="text"
        placeholder="Enter symbol (e.g., BTC/USDT)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />

      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleStart} disabled={loading}>
          {loading ? 'Starting...' : 'Start Bot'}
        </button>
        <button onClick={handleStop} disabled={loading}>
          {loading ? 'Stopping...' : 'Stop Bot'}
        </button>
        <button onClick={handleStatus} disabled={loading}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', color: 'red' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {status && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Status:</strong> {status}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Logs:</h3>
          <ul>
            {logs.map((log, idx) => (
              <li key={idx}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
