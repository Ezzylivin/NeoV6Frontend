// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar
} from "recharts";

export default function Backtests() {
  const { fetchOptions, runBacktest } = useBacktest();

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
        takeProfit: selectedTP,
        stopLoss: selectedSL,
      });
      setBacktests([{ saved, metrics, equityCurve, trades, label: "(New)" }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  // --- Generate 10 random parameter combos for the batch ---
  const generateRandomBatch = () => {
    const batch = [];
    const { strategies, risks, takeProfits, stopLosses } = options;

    const usedCombos = new Set();

    while (batch.length < 10) {
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      const risk = risks[Math.floor(Math.random() * risks.length)];
      const takeProfit = takeProfits[Math.floor(Math.random() * takeProfits.length)];
      const stopLoss = stopLosses[Math.floor(Math.random() * stopLosses.length)];

      const key = `${strategy}-${risk}-${takeProfit}-${stopLoss}`;
      if (usedCombos.has(key)) continue; // avoid duplicates
      usedCombos.add(key);

      batch.push({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: { name: strategy, parameters: {} },
        risk,
        takeProfit,
        stopLoss
      });
    }

    return batch;
  };

  // --- Batch backtest handler ---
  const handleRunBatchBacktests = async () => {
    if (!selectedSymbol) return;
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);

    const batch = generateRandomBatch();
    const results = [];

    for (const testParams of batch) {
      try {
        const { saved, metrics, equityCurve, trades } = await runBacktest(testParams);
        results.push({ saved, metrics, equityCurve, trades, label: "(Batch)" });
      } catch (err) {
        console.error("Batch test failed for params:", testParams, err);
      }
    }

    setBacktests(results);
    setLoadingBatch(false);
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
          <select value={selectedTP ?? ""} onChange={e => setSelectedTP(e.target.value === "" ? null : Number(e.target.value))}>
            {options.takeProfits?.map(tp => <option key={tp ?? "none"} value={tp ?? ""}>{tp !== null ? tp+"%" : "None"}</option>)}
          </select>
        </div>

        <div>
          <label>Stop Loss: </label>
          <select value={selectedSL ?? ""} onChange={e => setSelectedSL(e.target.value === "" ? null : Number(e.target.value))}>
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
            {loadingBatch ? "Running..." : "Run Batch Backtests (10)"}
          </button>
        </div>
      </div>

      {/* Backtest Results */}
      {backtests.length > 0 && backtests.map((bt, idx) => (
        <div key={idx} style={{ marginBottom: "40px", border: "1px solid #ccc", padding: "10px" }}>
          <h3>{bt.saved?.symbol || "N/A"} ({bt.saved?.strategy?.name || selectedStrategy.name}) {bt.label}</h3>
          <p>Net Profit: {bt.metrics?.netProfit ?? 0}</p>
          <p>Win Rate: {bt.metrics?.winRate ?? 0}%</p>
          <p>Max Drawdown: {bt.metrics?.maxDrawdown ?? 0}%</p>
          <p>Trades: {bt.metrics?.tradesCount ?? 0}</p>

          <h4>Equity Curve</h4>
          <LineChart width={700} height={250} data={bt.equityCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false} />
          </LineChart>

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
