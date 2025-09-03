// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"], // fallback
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 500, 1000, 5000, 10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low", "Medium", "High"],
  });

  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "SMA", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");

  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(false);

  const { fetchOptions, runBacktestAPI } = useBacktest(); // your hook

  // Load options from backend
  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        if (resp?.success && resp?.options) {
          setOptions({
            symbols: resp.options.symbols?.length ? resp.options.symbols : ["BTCUSDT","ETHUSDT","BNBUSDT"],
            timeframes: resp.options.timeframes || ["1m","5m","15m","30m","1h","4h","1d"],
            balances: resp.options.balances || [100,500,1000,5000,10000],
            strategies: resp.options.strategies || ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
            risks: resp.options.risks || ["Low","Medium","High"],
          });
          setSelectedSymbol(resp.options.symbols?.[0] || "BTCUSDT");
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
      }
    }
    loadOptions();
  }, []);

  // Run a backtest using backend API via hook
  const handleRunBacktest = async () => {
    if (!selectedSymbol) return;
    setLoading(true);
    try {
      const data = await runBacktestAPI({
        userId: "currentUserId", // replace with actual user
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
      });

      if (data?.success) {
        setBacktests(prev => [...prev, data]);
      } else {
        console.error("Backtest API error:", data?.message);
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Backtests</h2>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label>Symbol:</label>
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
          >
            {options.symbols?.map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Timeframe:</label>
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value)}
          >
            {options.timeframes?.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Balance:</label>
          <select
            value={selectedBalance}
            onChange={e => setSelectedBalance(Number(e.target.value))}
          >
            {options.balances?.map(b => (
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
            {options.strategies?.map(s => (
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
            {options.risks?.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleRunBacktest}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Running..." : "Run Backtest"}
      </button>

      {/* Backtest results */}
      <div className="mt-6">
        {backtests.length === 0 && <p>No backtests yet.</p>}
        {backtests.map((bt, idx) => (
          <div key={idx} className="p-2 border rounded mb-2">
            <p><strong>{bt.saved?.symbol || selectedSymbol}</strong> | Strategy: {bt.saved?.strategy?.name || selectedStrategy.name}</p>
            <p>Net Profit: {bt.metrics?.netProfit ?? 0}</p>
            <p>Win Rate: {bt.metrics?.winRate ?? 0}%</p>
            <p>Max Drawdown: {bt.metrics?.maxDrawdown ?? 0}%</p>
            <p>Trades: {bt.metrics?.tradesCount ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
