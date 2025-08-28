import React from 'react';
import { useBot } from '../hooks/useBot';

export default function TradingBot() {
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
    <div className="p-6 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

      {/* Symbol Input */}
      <input
        type="text"
        className="border p-2 rounded w-full mb-4 text-black"
        placeholder="Enter symbol (e.g., BTC/USDT)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Starting...' : 'Start Bot'}
        </button>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={handleStop}
          disabled={loading}
        >
          {loading ? 'Stopping...' : 'Stop Bot'}
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleStatus}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-500 mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="mb-4">
          <strong>Status:</strong> {status}
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Logs:</h3>
          <ul className="list-disc list-inside">
            {logs.map((log, idx) => (
              <li key={idx}>{log}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
