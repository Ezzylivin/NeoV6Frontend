// File: src/pages/TradingBot.jsx
import React, { useState } from 'react';
import { useBot } from '../hooks/useBot.js';

const availableSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
const availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

export default function TradingBot() {
  const {
    symbol,
    setSymbol,
    amount,
    setAmount,
    timeframes,
    setTimeframes,
    status,
    logs,
    loading,
    error,
    startBot,
    stopBot,
    getStatus
  } = useBot();

  const handleTimeframeChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(options[i].value);
    }
    setTimeframes(selected);
  };

  return (
    <div className="flex justify-center min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Symbol */}
        <label className="block mb-2">Symbol:</label>
        <select
          className="w-full p-2 mb-4 text-black rounded"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        >
          <option value="">Select a symbol</option>
          {availableSymbols.map(sym => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>

        {/* Amount */}
        <label className="block mb-2">Amount ($):</label>
        <input
          type="number"
          className="w-full p-2 mb-4 text-black rounded"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />

        {/* Timeframes */}
        <label className="block mb-2">Timeframes:</label>
        <select
          multiple
          className="w-full p-2 mb-4 text-black rounded"
          value={timeframes}
          onChange={handleTimeframeChange}
        >
          {availableTimeframes.map(tf => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>

        {/* Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={startBot}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Bot'}
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={stopBot}
            disabled={loading}
          >
            {loading ? 'Stopping...' : 'Stop Bot'}
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={getStatus}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Error */}
        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* Status */}
        {status && status.isRunning && (
          <div className="mb-4">
            <strong>Status:</strong> Running {status.symbol} with ${status.amount} on {status.timeframes.join(', ')}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Logs:</h3>
            <ul className="list-disc list-inside">
              {logs.map((log, idx) => <li key={idx}>{log}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
