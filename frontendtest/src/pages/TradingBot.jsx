// File: src/pages/TradingBot.jsx
import React, { useState } from "react";
import { useBot } from "../hooks/useBot.js";

const AVAILABLE_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT"];

export default function TradingBot() {
  const {
    symbol,
    setSymbol,
    amount,
    setAmount,
    status,
    logs,
    loading,
    error,
    startBot,
    stopBot,
    fetchStatus,
  } = useBot();

  const handleStart = async () => {
    await startBot(["5m", "15m"]); // example timeframes
  };

  const handleStop = async () => {
    await stopBot();
  };

  return (
    <div className="flex justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Symbol Dropdown */}
        <div className="mb-4">
          <label className="block mb-2">Select Symbol:</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full p-2 rounded bg-black border border-gray-600 text-white"
          >
            <option value="">-- Select Symbol --</option>
            {AVAILABLE_SYMBOLS.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block mb-2">Amount ($):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full p-2 rounded bg-black border border-gray-600 text-white"
            placeholder="Enter amount"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleStart}
            disabled={loading || !symbol || !amount}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-500"
          >
            {loading ? "Starting..." : "Start Bot"}
          </button>
          <button
            onClick={handleStop}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded disabled:bg-gray-500"
          >
            {loading ? "Stopping..." : "Stop Bot"}
          </button>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-500"
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </div>

        {/* Status & Error */}
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {status && (
          <div className="mb-2">
            <strong>Status:</strong>{" "}
            {status.isRunning ? `Running (${status.symbol})` : "Stopped"}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Logs:</h3>
            <ul className="list-disc list-inside max-h-60 overflow-y-auto">
              {logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
