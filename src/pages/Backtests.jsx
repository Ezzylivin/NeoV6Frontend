// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, Cell
} from "recharts";

export default function Backtests() {
  const { fetchOptions, runBacktest, runBatchBacktests } = useBacktest();

  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low","Medium","High"],
    takeProfits: [null,1,2,3,5,10],
    stopLosses: [null,0.5,1,2,3,5]
  });

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "SMA", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);

  const [backtests, setBacktests] = useState([]);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);

  // Fetch options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        if (resp?.success && resp?.options) {
          setOptions(prev => ({ ...prev, ...resp.options }));
          if (!selectedSymbol) setSelectedSymbol(resp.options.symbols?.[0] || "BTCUSDT");
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
        setError("Could not load backtest options");
      }
    }
    loadOptions();
  }, [fetchOptions]);

  // --- Normalize TP/SL values ---
  const normalizeNumber = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  // --- Single backtest ---
  const handleRunSingleBacktest = async () => {
    if (!selectedSymbol) return;
    setLoadingSingle(true);
    setError(null);
    setBacktests([]); // collapse previous logs
    try {
      const { saved, metrics, equityCurve, trades } = await runBacktest({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
      });
      setBacktests([{
        saved,
        metrics,
        equityCurve,
        trades,
        label: "(New)",
        params: {
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          balance: selectedBalance,
          strategy: selectedStrategy.name,
          risk: selectedRisk,
          takeProfit: selectedTP,
          stopLoss: selectedSL
        },
        expanded: true,
        tradesView: "chart"
      }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  // --- Batch backtests (10 at a time, random strategies/risk/TP/SL) ---
  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]); // collapse previous logs

    try {
      const { results, usedCombos } = await runBatchBacktests({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
      });

      setBacktests(results.map((r, idx) => ({
        saved: r.saved,
        metrics: r.metrics,
        equityCurve: r.saved?.equityCurve || [],
        trades: r.saved?.tradeBreakdown || [],
        label: `(Batch #${idx + 1})`,
        params: usedCombos[idx], // show parameters from generation
        expanded: false,
        tradesView: "chart"
      })));
    } catch (err) {
      console.error("Batch run failed:", err);
      setError("Batch backtests failed");
    } finally {
      setLoadingBatch(false);
    }
  };

  // Toggle expand/collapse
  const toggleExpand = (index) => {
    setBacktests(prev =>
      prev.map((b, i) =>
        i === index ? { ...b, expanded: !b.expanded } : b
      )
    );
  };

  // Toggle trades view
  const toggleTradesView = (index) => {
    setBacktests(prev =>
      prev.map((b, i) =>
        i === index
          ? { ...b, tradesView: b.tradesView === "chart" ? "table" : "chart" }
          : b
      )
    );
  };

  return (
    <div>
      <h2>Backtests</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Selectors */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
        {/* ... unchanged selectors ... */}
        <div>
          <button onClick={handleRunSingleBacktest} disabled={loadingSingle}>
            {loadingSingle ? "Running..." : "Run Single Backtest"}
          </button>
        </div>
        <div>
          <button onClick={handleRunBatchBacktests} disabled={loadingBatch}>
            {loadingBatch ? "Running..." : "Run Batch Backtests"}
          </button>
        </div>
      </div>

      {/* Backtest Results */}
      {backtests.length > 0 && backtests.map((bt, idx) => (
        <div key={idx} style={{ marginBottom: "40px", border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
          <h3 onClick={() => toggleExpand(idx)} style={{ cursor: "pointer" }}>
            {bt.saved?.symbol || "N/A"} ({bt.saved?.strategy?.name || bt.params?.strategy?.name}) {bt.label}
            {bt.expanded ? " ▼" : " ▶"}
          </h3>

          {bt.expanded && (
            <>
              {/* Summary cards */}
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <b>Net Profit:</b> {bt.metrics?.netProfit ?? 0}
                </div>
                <div style={{ padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <b>Win Rate:</b> {bt.metrics?.winRate ?? 0}%
                </div>
                <div style={{ padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <b>Max Drawdown:</b> {bt.metrics?.maxDrawdown ?? 0}%
                </div>
                <div style={{ padding: "10px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <b>Trades:</b> {bt.metrics?.tradesCount ?? 0}
                </div>
              </div>

              <p><b>Parameters:</b> Strategy={bt.params?.strategy?.name || bt.params?.strategy} | Risk={bt.params?.risk} | TP={bt.params?.takeProfit ?? "None"} | SL={bt.params?.stopLoss ?? "None"}</p>

              <h4>Equity Curve</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={bt.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false} />
                </LineChart>
              </ResponsiveContainer>

              <h4>
                Trades P/L
                <button style={{ marginLeft: "10px" }} onClick={() => toggleTradesView(idx)}>
                  Switch to {bt.tradesView === "chart" ? "Table" : "Chart"}
                </button>
              </h4>

              {bt.tradesView === "chart" ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bt.trades}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="exitTime" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="profit">
                      {bt.trades?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#82ca9d" : "#ff6b6b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ddd", padding: "8px" }}>Entry Time</th>
                      <th style={{ border: "1px solid #ddd", padding: "8px" }}>Exit Time</th>
                      <th style={{ border: "1px solid #ddd", padding: "8px" }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bt.trades?.map((t, i) => (
                      <tr key={i}>
                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{t.entryTime}</td>
                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{t.exitTime}</td>
                        <td style={{ border: "1px solid #ddd", padding: "8px", color: t.profit >= 0 ? "green" : "red" }}>
                          {t.profit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      ))}

      {/* Overall Performance Over Time */}
      {backtests.length > 1 && (
        <div style={{ marginTop: "40px" }}>
          <h3>Overall Performance Over Runs</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={backtests.map((b, i) => ({
              run: i + 1,
              netProfit: b.metrics?.netProfit ?? 0,
              winRate: b.metrics?.winRate ?? 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="run" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="netProfit" stroke="#8884d8" />
              <Line type="monotone" dataKey="winRate" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
