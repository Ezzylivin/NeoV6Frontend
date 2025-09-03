import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";

export default function Backtests() {
  const { fetchOptions, runBacktest, runBatchFromSelectors, options } = useBacktest();

  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedTP, setSelectedTP] = useState(2);
  const [selectedSL, setSelectedSL] = useState(1);
  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        if (resp?.success && resp?.options) {
          setSelectedSymbol(resp.options.symbols?.[0] || "BTCUSDT");
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
      }
    }
    loadOptions();
  }, []);

  const handleRunBacktest = async () => {
    if (!selectedSymbol) return;
    setLoading(true);
    try {
      const { saved, metrics, equityCurve, trades } = await runBacktest({
        userId: "currentUserId",
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: 1000,
        strategy: { name: "SMA", parameters: {} },
        risk: "Medium",
        takeProfit: selectedTP,
        stopLoss: selectedSL
      });
      setBacktests(prev => [...prev, { saved, metrics, equityCurve, trades }]);
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBatch = async () => {
    setLoading(true);
    try {
      const { results, best } = await runBatchFromSelectors("currentUserId");
      setBacktests(prev => [...prev, ...results]);
    } catch (err) {
      console.error("Batch backtest failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>

      {/* Labeled Selectors */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
        <div>
          <label>Symbol: </label>
          <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
            {options.symbols?.map(sym => <option key={sym} value={sym}>{sym}</option>)}
          </select>
        </div>
        <div>
          <label>Timeframe: </label>
          <select value={selectedTimeframe} onChange={e => setSelectedTimeframe(e.target.value)}>
            {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
        <div>
          <label>Take Profit: </label>
          <select value={selectedTP} onChange={e => setSelectedTP(Number(e.target.value))}>
            {options.takeProfits?.map(tp => <option key={tp} value={tp}>{tp}%</option>)}
          </select>
        </div>
        <div>
          <label>Stop Loss: </label>
          <select value={selectedSL} onChange={e => setSelectedSL(Number(e.target.value))}>
            {options.stopLosses?.map(sl => <option key={sl} value={sl}>{sl}%</option>)}
          </select>
        </div>

        <div>
          <button onClick={handleRunBacktest} disabled={loading}>
            {loading ? "Running..." : "Run Backtest"}
          </button>
          <button onClick={handleRunBatch} disabled={loading} style={{ marginLeft: "10px" }}>
            {loading ? "Running Batch..." : "Run Batch Backtests"}
          </button>
        </div>
      </div>

      {/* Backtest Results */}
      {backtests.length > 0 && backtests.map((bt, idx) => (
        <div key={idx} style={{ marginBottom: "40px", border: "1px solid #ccc", padding: "10px" }}>
          <h3>{bt.saved?.symbol || "N/A"} ({bt.saved?.strategy?.name || "SMA"})</h3>
          <p>Net Profit: {bt.metrics?.netProfit ?? 0}</p>
          <p>Win Rate: {bt.metrics?.winRate ?? 0}%</p>
          <p>Max Drawdown: {bt.metrics?.maxDrawdown ?? 0}%</p>
          <p>Trades: {bt.metrics?.tradesCount ?? 0}</p>

          {/* Equity Curve Chart */}
          <h4>Equity Curve</h4>
          <LineChart width={700} height={250} data={bt.equityCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false} />
          </LineChart>

          {/* Trade P/L Chart */}
          <h4>Trades P/L</h4>
          <BarChart width={700} height={250} data={bt.trades}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="exitTime" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="profit" fill="#82ca9d" />
          </BarChart>
        </div>
      ))}
    </div>
  );
}
