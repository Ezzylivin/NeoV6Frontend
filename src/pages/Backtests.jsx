// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const {
    fetchOptions,
    runBacktest,
    results,
    loading,
    options: hookOptions
  } = useBacktest();

  // Local state for selections
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "SMA", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTakeProfit, setSelectedTakeProfit] = useState(2);
  const [selectedStopLoss, setSelectedStopLoss] = useState(1);
  const [backtests, setBacktests] = useState([]);

  // Load options from backend via hook
  useEffect(() => {
    async function loadOptions() {
      const resp = await fetchOptions();
      if (resp?.success && resp?.options) {
        // Set defaults from backend options
        setSelectedSymbol(resp.options.symbols?.[0] || "BTCUSDT");
        setSelectedTimeframe(resp.options.timeframes?.[0] || "1h");
        setSelectedBalance(resp.options.balances?.[0] || 1000);
        setSelectedStrategy({ name: resp.options.strategies?.[0] || "SMA", parameters: {} });
        setSelectedRisk(resp.options.risks?.[0] || "Medium");
        setSelectedTakeProfit(resp.options.takeProfits?.[0] || 2);
        setSelectedStopLoss(resp.options.stopLosses?.[0] || 1);
      }
    }
    loadOptions();
  }, []);

  // Run a single backtest
  const handleRunBacktest = async () => {
    if (!selectedSymbol) return;
    try {
      const data = await runBacktest({
        userId: "currentUserId", // replace with actual user ID
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: Number(selectedBalance),
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: Number(selectedTakeProfit),
        stopLoss: Number(selectedStopLoss)
      });

      if (data?.saved) {
        setBacktests(prev => [...prev, data]);
      } else {
        console.error("Backtest API returned error:", data.message);
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>

      {/* Symbol selector */}
      <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
        {hookOptions.symbols?.map(sym => <option key={sym} value={sym}>{sym}</option>)}
      </select>

      {/* Timeframe selector */}
      <select value={selectedTimeframe} onChange={e => setSelectedTimeframe(e.target.value)}>
        {hookOptions.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
      </select>

      {/* Balance selector */}
      <select value={selectedBalance} onChange={e => setSelectedBalance(e.target.value)}>
        {hookOptions.balances?.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      {/* Strategy selector */}
      <select value={selectedStrategy.name} onChange={e => setSelectedStrategy({ name: e.target.value, parameters: {} })}>
        {hookOptions.strategies?.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Risk selector */}
      <select value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}>
        {hookOptions.risks?.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Take Profit selector */}
      <select value={selectedTakeProfit} onChange={e => setSelectedTakeProfit(e.target.value)}>
        {hookOptions.takeProfits?.map(tp => <option key={tp} value={tp}>{tp}%</option>)}
      </select>

      {/* Stop Loss selector */}
      <select value={selectedStopLoss} onChange={e => setSelectedStopLoss(e.target.value)}>
        {hookOptions.stopLosses?.map(sl => <option key={sl} value={sl}>{sl}%</option>)}
      </select>

      <button onClick={handleRunBacktest} disabled={loading}>
        {loading ? "Running..." : "Run Backtest"}
      </button>

      {/* Display results */}
      {backtests.length > 0 && backtests.map((bt, idx) => (
        <div key={idx} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <h3>{bt.saved?.symbol || "N/A"} ({bt.saved?.strategy?.name || selectedStrategy.name})</h3>
          <p>Net Profit: {bt.metrics?.netProfit ?? 0}</p>
          <p>Win Rate: {bt.metrics?.winRate ?? 0}%</p>
          <p>Max Drawdown: {bt.metrics?.maxDrawdown ?? 0}%</p>
          <p>Trades: {bt.metrics?.tradesCount ?? 0}</p>
          <p>Take Profit: {selectedTakeProfit}%</p>
          <p>Stop Loss: {selectedStopLoss}%</p>
        </div>
      ))}
    </div>
  );
}
