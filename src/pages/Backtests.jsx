// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
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

  const normalizeNumber = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const handleRunSingleBacktest = async () => {
    if (!selectedSymbol) return;
    setLoadingSingle(true);
    setError(null);
    setBacktests([]);
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
        }
      }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);

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
        params: usedCombos[idx]
      })));
    } catch (err) {
      console.error("Batch run failed:", err);
      setError("Batch backtests failed");
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Selectors */}
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
          <label>Balance: </label>
          <select value={selectedBalance} onChange={e => setSelectedBalance(Number(e.target.value))}>
            {options.balances?.map(b => <option key={b} value={b}>${b}</option>)}
          </select>
        </div>
        <div>
          <label>Strategy: </label>
          <select value={selectedStrategy.name} onChange={e => setSelectedStrategy({ name: e.target.value, parameters: {} })}>
            {options.strategies?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Risk: </label>
          <select value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}>
            {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label>Take Profit: </label>
          <select value={selectedTP ?? ""} onChange={e => setSelectedTP(normalizeNumber(e.target.value))}>
            {options.takeProfits?.map(tp => <option key={tp ?? "none"} value={tp ?? ""}>{tp !== null ? tp+"%" : "None"}</option>)}
          </select>
        </div>
        <div>
          <label>Stop Loss: </label>
          <select value={selectedSL ?? ""} onChange={e => setSelectedSL(normalizeNumber(e.target.value))}>
            {options.stopLosses?.map(sl => <option key={sl ?? "none"} value={sl ?? ""}>{sl !== null ? sl+"%" : "None"}</option>)}
          </select>
        </div>
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
        <div key={idx} style={{ marginBottom: "40px", border: "1px solid #ccc", padding: "10px" }}>
          <h3>{bt.saved?.symbol || "N/A"} ({bt.saved?.strategy?.name || bt.params?.strategy?.name}) {bt.label}</h3>

          {/* Metrics cards */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            <div style={{ padding: "10px", borderRadius: "8px", background: "#1e1e1e", color: "#fff" }} title={`Max Gain: ${bt.metrics?.maxGain ?? 0}, Max Loss: ${bt.metrics?.maxLoss ?? 0}`}>
              <b>Net Profit:</b> <span style={{ color: (bt.metrics?.netProfit >= 0 ? "#4caf50" : "#f44336") }}>{bt.metrics?.netProfit ?? 0}</span>
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", background: "#1e1e1e", color: "#fff" }} title={`Winning Trades: ${bt.metrics?.winningTrades ?? 0}, Losing Trades: ${bt.metrics?.losingTrades ?? 0}`}>
              <b>Win Rate:</b> {bt.metrics?.winRate ?? 0}%
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", background: "#1e1e1e", color: "#fff" }} title={`Peak Drawdown Time: ${bt.metrics?.drawdownDuration ?? "N/A"}`}>
              <b>Max Drawdown:</b> {bt.metrics?.maxDrawdown ?? 0}%
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", background: "#1e1e1e", color: "#fff" }}>
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

          <h4>Trades P/L</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bt.trades}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exitTime" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
