// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import useBacktest from "../hooks/useBacktest.js";

export default function Backtests() {
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 500, 1000, 5000, 10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low", "Medium", "High"],
  });

  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(false);

  const { fetchOptions } = useBacktest();

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

  // Run backtest via backend API
  const handleRunBacktest = async () => {
    if (!selectedSymbol) return;
    setLoading(true);

    try {
      const res = await fetch("/api/backtests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "currentUserId", // replace with actual user
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          initialBalance: 1000,
          strategy: { name: "SMA", parameters: {} },
          risk: "Medium",
        }),
      });

      const data = await res.json();

      if (data.success && data.backtest) {
        setBacktests(prev => [
          ...prev,
          {
            saved: data.backtest,
            metrics: data.metrics,
            equityCurve: data.equityCurve,
            trades: data.trades
          }
        ]);
      } else {
        console.error("Backtest API error:", data.message);
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>

      {/* Symbol selector */}
      <select
        value={selectedSymbol}
        onChange={e => setSelectedSymbol(e.target.value)}
      >
        {options.symbols?.map(sym => (
          <option key={sym} value={sym}>{sym}</option>
        ))}
      </select>

      {/* Timeframe selector */}
      <select
        value={selectedTimeframe}
        onChange={e => setSelectedTimeframe(e.target.value)}
      >
        {options.timeframes?.map(tf => (
          <option key={tf} value={tf}>{tf}</option>
        ))}
      </select>

      <button onClick={handleRunBacktest} disabled={loading}>
        {loading ? "Running..." : "Run Backtest"}
      </button>

      {/* Display backtest results */}
      {backtests.length > 0 && (
        <div>
          {backtests.map((bt, idx) => (
            <div key={idx}>
              <h3>{bt.saved?.symbol || "N/A"} ({bt.saved?.strategy?.name || "SMA"})</h3>
              <p>Net Profit: {bt.metrics?.netProfit ?? 0}</p>
              <p>Win Rate: {bt.metrics?.winRate ?? 0}%</p>
              <p>Max Drawdown: {bt.metrics?.maxDrawdown ?? 0}%</p>
              <p>Trades: {bt.metrics?.tradesCount ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
