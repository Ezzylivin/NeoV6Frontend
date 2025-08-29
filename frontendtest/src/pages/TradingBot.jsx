// src/pages/TradingBot.jsx
import React, { useState, useEffect } from "react";
import { useBot } from "../hooks/useBot.js";

const SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];

export default function TradingBot() {
  const { status, logs, loading, error, startBot, stopBot, getBotStatus } = useBot();
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);

  useEffect(() => {
    getBotStatus();
  }, []);

  const handleStart = async () => {
    await startBot({ symbol, timeframes: [timeframe], amount: initialBalance });
  };

  const handleStop = async () => {
    await stopBot();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Symbol */}
        <div className="mb-4">
          <label>Select Symbol:</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full p-2 text-black rounded">
            {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Timeframe */}
        <div className="mb-4">
          <label>Select Timeframe:</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full p-2 text-black rounded">
            {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>

        {/* Initial Balance */}
        <div className="mb-4">
          <label>Initial Balance ($):</label>
          <select value={initialBalance} onChange={(e) => setInitialBalance(Number(e.target.value))} className="w-full p-2 text-black rounded">
            {BALANCES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-4">
          <button onClick={handleStart} disabled={loading} className="bg-green-500 px-4 py-2 rounded text-white">
            {loading ? "Starting..." : "Start Bot"}
          </button>
          <button onClick={handleStop} disabled={loading} className="bg-red-500 px-4 py-2 rounded text-white">
            {loading ? "Stopping..." : "Stop Bot"}
          </button>
        </div>

        {/* Status & Logs */}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {status && <div className="mb-4">{status}</div>}
        {logs.length > 0 && (
          <div>
            <h3>Logs:</h3>
            <ul>{logs.map((log, idx) => <li key={idx}>{log}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
