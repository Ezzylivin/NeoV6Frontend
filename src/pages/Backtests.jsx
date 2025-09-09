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
    symbols: [],
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 500, 1000, 5000, 10000],
    strategies: [],
    risks: ["Low", "Medium", "High"],
    takeProfits: [null, 1, 2, 3, 5, 10],
    stopLosses: [null, 0.5, 1, 2, 3, 5],
    positions: ["Long", "Short", "Both"]
  });

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [positionSide, setPositionSide] = useState("Both");

  // realism toggles
  const [useNews, setUseNews] = useState(false);
  const [useSlippage, setUseSlippage] = useState(false);
  const [useSpread, setUseSpread] = useState(false);
  const [useRandomEvents, setUseRandomEvents] = useState(false);
  const [baseSlippageBps, setBaseSlippageBps] = useState(5);

  const [backtests, setBacktests] = useState([]);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedLogs, setCollapsedLogs] = useState({});
  const [viewMode, setViewMode] = useState("chart");

  // Load backend options
  useEffect(() => {
  async function loadOptions() {
    try {
      const resp = await fetchOptions();
      if (resp) {
        setOptions({
          symbols: resp.symbols || [],
          timeframes: resp.timeframes || [],
          balances: resp.balances || [],
          strategies: resp.strategies || [],
          risks: resp.risks || [],
          takeProfits: resp.takeProfits || [],
          stopLosses: resp.stopLosses || [],
          positions: resp.positions || [],
        });

        if (!selectedSymbol && resp.symbols?.length) {
          setSelectedSymbol(resp.symbols[0]);
        }

        if (!selectedStrategy.name && resp.strategies?.length) {
          setSelectedStrategy(resp.strategies[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch options:", err);
      setError("Could not load backtest options");
    }
  }

  loadOptions();
}, [fetchOptions]);


  const normalizeNumber = val => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const formatTimestamp = ts => ts ? new Date(ts).toLocaleString() : "";
  const toggleLog = idx => setCollapsedLogs(prev => ({ ...prev, [idx]: !prev[idx] }));

  // Single backtest
  const handleRunSingleBacktest = async () => {
    if (!selectedSymbol || !selectedStrategy.name) return;
    setLoadingSingle(true);
    setError(null);
    setBacktests([]);
    try {
      const { saved = {}, metrics = {}, equityCurve = [], trades = [] } = await runBacktest({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
        positionSide,
        useNews,
        useSlippage,
        useSpread,
        useRandomEvents,
        baseSlippageBps
      });

      setBacktests([{
        saved,
        metrics: {
          netProfit: metrics.netProfit ?? 0,
          winRate: metrics.winRate ?? 0,
          maxDrawdown: metrics.maxDrawdown ?? 0,
          tradesCount: metrics.tradesCount ?? 0
        },
        equityCurve,
        trades,
        label: "(Run)",
        params: {
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          balance: selectedBalance,
          strategy: selectedStrategy.name,
          risk: selectedRisk,
          takeProfit: selectedTP,
          stopLoss: selectedSL,
          positionSide,
          useNews,
          useSlippage,
          useSpread,
          useRandomEvents,
          baseSlippageBps
        }
      }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  // Batch backtests
  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);
    try {
      const { results = [], usedCombos = [] } = await runBatchBacktests({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
        positionSide,
        useNews,
        useSlippage,
        useSpread,
        useRandomEvents,
        baseSlippageBps
      });

      const mapped = results.map((r, idx) => {
        const saved = r.saved || {};
        const metrics = r.metrics || {};
        const combo = usedCombos[idx] || {};
        // Merge strategy parameters from usedCombos if present
        const strategyObj = { 
          ...selectedStrategy, 
          parameters: combo.strategy?.parameters || selectedStrategy.parameters 
        };
        return {
          saved,
          metrics: {
            netProfit: metrics.netProfit ?? 0,
            winRate: metrics.winRate ?? 0,
            maxDrawdown: metrics.maxDrawdown ?? 0,
            tradesCount: metrics.tradesCount ?? 0
          },
          equityCurve: r.equityCurve || saved.equityCurve || [],
          trades: r.trades || saved.tradeBreakdown || [],
          label: `(Batch #${idx + 1})`,
          params: { ...combo, strategy: strategyObj },
        };
      });

      setBacktests(mapped);
    } catch (err) {
      console.error("Batch run failed:", err);
      setError("Batch backtests failed");
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Backtests</h2>
      {error && <p className="text-red-500">{error}</p>}

      {/* === Controls === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
          {options.symbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
        </select>

        <select value={selectedTimeframe} onChange={e => setSelectedTimeframe(e.target.value)}>
          {options.timeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>

        <select value={selectedBalance} onChange={e => setSelectedBalance(Number(e.target.value))}>
          {options.balances.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={selectedStrategy.name}
          onChange={e => {
            const s = options.strategies.find(s => s.name === e.target.value);
            setSelectedStrategy(s || { name: "", parameters: {} });
          }}
        >
          {options.strategies.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>

        <select value={selectedRisk} onChange={e => setSelectedRisk(e.target.value)}>
          {options.risks.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={selectedTP ?? ""} onChange={e => setSelectedTP(normalizeNumber(e.target.value))}>
          {options.takeProfits.map(tp => <option key={tp ?? "none"} value={tp ?? ""}>{tp ?? "None"}</option>)}
        </select>

        <select value={selectedSL ?? ""} onChange={e => setSelectedSL(normalizeNumber(e.target.value))}>
          {options.stopLosses.map(sl => <option key={sl ?? "none"} value={sl ?? ""}>{sl ?? "None"}</option>)}
        </select>

        <select value={positionSide} onChange={e => setPositionSide(e.target.value)}>
          {options.positions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* realism toggles */}
        <label><input type="checkbox" checked={useNews} onChange={e => setUseNews(e.target.checked)} /> Use News</label>
        <label><input type="checkbox" checked={useSlippage} onChange={e => setUseSlippage(e.target.checked)} /> Use Slippage</label>
        <label><input type="checkbox" checked={useSpread} onChange={e => setUseSpread(e.target.checked)} /> Use Spread</label>
        <label><input type="checkbox" checked={useRandomEvents} onChange={e => setUseRandomEvents(e.target.checked)} /> Random Events</label>
        <label>
          Slippage Bps
          <input type="number" value={baseSlippageBps} onChange={e => setBaseSlippageBps(Number(e.target.value))} />
        </label>

        <button onClick={handleRunSingleBacktest} disabled={loadingSingle}>
          {loadingSingle ? "Running..." : "Run Backtest"}
        </button>
        <button onClick={handleRunBatchBacktests} disabled={loadingBatch}>
          {loadingBatch ? "Running..." : "Run Batch"}
        </button>
        <button onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}>
          Switch to {viewMode === "chart" ? "Table" : "Charts"}
        </button>
      </div>

      {/* === Results === */}
      {backtests.map((bt, idx) => (
        <div key={idx} className="border rounded p-4">
          <h3 className="font-bold">Backtest {bt.label}</h3>
          <p>Symbol: {bt.params.symbol} | Strategy: {bt.params.strategy?.name} | Risk: {bt.params.risk}</p>

          <p>Profit: {bt.metrics.netProfit}</p>
          <p>Win Rate: {bt.metrics.winRate}%</p>
          <p>Drawdown: {bt.metrics.maxDrawdown}%</p>
          <p>Trades: {bt.metrics.tradesCount}</p>

          {viewMode === "chart" ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bt.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Price</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {bt.trades.map((t, i) => (
                  <tr key={i}>
                    <td>{formatTimestamp(t.timestamp)}</td>
                    <td>{t.side}</td>
                    <td>{t.price}</td>
                    <td>{t.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
