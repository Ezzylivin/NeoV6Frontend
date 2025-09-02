// File: src/pages/TradingBot.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, ReferenceDot
} from "recharts";

export default function TradingBot() {
  const { user } = useAuth();
  const {
    results: backtests,
    best,
    options,
    loading,
    error,
    fetchOptions,
    fetchBacktests,
    runBacktest,
    runBatchBacktests
  } = useBacktest();

  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
    stopLoss: 1,
    takeProfit: 2
  });

  const [latest, setLatest] = useState(null);
  const [logs, setLogs] = useState([]);

  // Initialize options & fetch backtests
  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
    }
  }, [user?._id]);

  // Set default form when options load
  useEffect(() => {
    if (options.symbols?.length && options.strategies?.length) {
      setForm({
        symbol: options.symbols[0],
        timeframe: options.timeframes?.[0] || "1h",
        initialBalance: options.balances?.[2] || 1000,
        strategy: options.strategies[0],
        risk: options.risks?.[1] || "Medium",
        stopLoss: options.stopLosses?.[0] || 1,
        takeProfit: options.takeProfits?.[0] || 2
      });
    }
  }, [options]);

  // Update form inputs
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: ["initialBalance","stopLoss","takeProfit"].includes(name) ? Number(value) : value }));
  };

  // Run single backtest
  const handleRunSingle = async () => {
    try {
      await runBacktest(form);
      setLatest(backtests[0]); // pick latest backtest from hook results
      setLogs(prev => [...prev, `Ran backtest: ${form.symbol} ${form.strategy}`]);
    } catch (err) {
      console.error(err);
      alert("Backtest failed: " + err.message);
    }
  };

  // Run batch backtests
  const handleRunBatch = () => {
    const combos = options.symbols.flatMap(s =>
      options.strategies.map(st => ({
        ...form,
        symbol: s,
        strategy: st
      }))
    );
    runBatchBacktests(combos);
  };

  const Stats = ({ m }) => {
    if (!m) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Final Balance</div>
          <div className="text-lg font-semibold">${m.finalBalance?.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Net Profit</div>
          <div className={`text-lg font-semibold ${m.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${m.profit?.toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  const TradeDots = ({ trades }) => {
    if (!latest?.results?.equityCurve?.length) return null;
    const eq = latest.results.equityCurve;
    return trades?.map((t, idx) => {
      if (!t.exitTime) return null;
      const near = eq.reduce((a, b) => Math.abs(b.time - new Date(t.exitTime).getTime()) < Math.abs(a.time - new Date(t.exitTime).getTime()) ? b : a);
      return <ReferenceDot key={idx} x={near.time} y={near.equity} r={4} stroke="none" fill={t.profit > 0 ? "#10B981" : "#EF4444"} />;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Trading Bot + Backtests</h1>

      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <select name="symbol" value={form.symbol} onChange={handleChange}>
          {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="timeframe" value={form.timeframe} onChange={handleChange}>
          {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        <select name="strategy" value={form.strategy} onChange={handleChange}>
          {options.strategies?.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <select name="risk" value={form.risk} onChange={handleChange}>
          {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="initialBalance" value={form.initialBalance} onChange={handleChange}>
          {options.balances?.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={handleRunSingle} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? "Running..." : "Run Backtest"}</button>
        <button onClick={handleRunBatch} className="bg-green-600 text-white px-4 py-2 rounded">Run Batch Backtests</button>
      </div>

      {/* Latest Backtest */}
      {latest && latest.results?.equityCurve?.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-xl font-semibold">Latest Backtest – Equity Curve</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={latest.results.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={ts => new Date(ts).toLocaleString()} />
              <YAxis />
              <Tooltip labelFormatter={ts => new Date(ts).toLocaleString()} formatter={v => `$${v.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke="#3B82F6" dot={false} />
              <TradeDots trades={latest.results.trades} />
            </LineChart>
          </ResponsiveContainer>
          <Stats m={{ finalBalance: latest.results.finalBalance, profit: latest.results.profit }} />
        </div>
      )}

      {/* Historical Backtests Table */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4">Backtests History</h2>
        {backtests.length === 0 ? (
          <p>No historical backtests found.</p>
        ) : (
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Date</th>
                <th className="px-4 py-2 border">Symbol</th>
                <th className="px-4 py-2 border">Strategy</th>
                <th className="px-4 py-2 border">Risk</th>
                <th className="px-4 py-2 border">Initial</th>
                <th className="px-4 py-2 border">Final</th>
                <th className="px-4 py-2 border">Profit</th>
              </tr>
            </thead>
            <tbody>
              {backtests.map(bt => (
                <tr key={bt._id} className="text-center">
                  <td>{bt.createdAt ? new Date(bt.createdAt).toLocaleString() : "N/A"}</td>
                  <td>{bt.symbol}</td>
                  <td>{bt.strategy?.name || bt.strategy}</td>
                  <td>{bt.risk}</td>
                  <td>{bt.initialBalance}</td>
                  <td>{bt.results?.finalBalance ?? bt.initialBalance}</td>
                  <td>{bt.results?.profit ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {best && best.results?.profit != null && (
        <p className="text-green-600 mt-2">Best batch profit: ${best.results.profit.toFixed(2)}</p>
      )}
    </div>
  );
}
