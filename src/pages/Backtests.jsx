// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";

// Fallback crypto options if API doesn't respond yet
const FALLBACK_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 500, 1000, 5000, 10000];
const STRATEGIES = [
  "SMA",
  "EMA",
  "RSI",
  "MACD",
  "BollingerBands",
  "Stochastic",
  "VWAP",
  "ATR"
];
const RISKS = ["Low", "Medium", "High"];

export default function Backtests() {
  const [options, setOptions] = useState({
    symbols: FALLBACK_SYMBOLS,
    timeframes: TIMEFRAMES,
    balances: BALANCES,
    strategies: STRATEGIES,
    risks: RISKS,
  });

  const [selectedSymbol, setSelectedSymbol] = useState(FALLBACK_SYMBOLS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "SMA", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");

  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch options from backend
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch("/api/backtests/options");
        const data = await res.json();
        if (data.success && data.options) {
          setOptions({
            symbols: data.options.symbols || FALLBACK_SYMBOLS,
            timeframes: data.options.timeframes || TIMEFRAMES,
            balances: data.options.balances || BALANCES,
            strategies: data.options.strategies || STRATEGIES,
            risks: data.options.risks || RISKS,
          });
        }
      } catch (err) {
        console.error("Failed to fetch backtest options:", err);
      }
    };
    fetchOptions();
  }, []);

  // Run a backtest via API
  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backtests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "currentUserId", // replace with actual userId
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          initialBalance: selectedBalance,
          strategy: selectedStrategy,
          risk: selectedRisk,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBacktests(prev => [...prev, data]);
      } else {
        console.error("Backtest API error:", data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Crypto Backtests</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label>Symbol:</label>
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
          >
            {options.symbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Timeframe:</label>
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value)}
          >
            {options.timeframes.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Initial Balance:</label>
          <select
            value={selectedBalance}
            onChange={e => setSelectedBalance(Number(e.target.value))}
          >
            {options.balances.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Strategy:</label>
          <select
            value={selectedStrategy.name}
            onChange={e => setSelectedStrategy({ name: e.target.value, parameters: {} })}
          >
            {options.strategies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Risk:</label>
          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
          >
            {options.risks.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={runBacktest}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Running..." : "Run Backtest"}
      </button>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Backtest Results</h2>
        {backtests.length === 0 && <p>No backtests yet.</p>}
        {backtests.map((b, idx) => (
          <div key={idx} className="p-2 border rounded mb-2">
            <p><strong>{b.backtest?.symbol || selectedSymbol}</strong> | Strategy: {b.backtest?.strategy?.name || selectedStrategy.name}</p>
            <p>Net Profit: ${b.metrics?.netProfit ?? 0}</p>
            <p>Win Rate: {b.metrics?.winRate ?? 0}%</p>
            <p>Trades: {b.metrics?.tradesCount ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
