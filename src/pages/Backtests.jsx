// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, ReferenceDot
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const { results: backtests, best, options, loading, error, fetchOptions, fetchBacktests, runBacktest, runBatchBacktests } = useBacktest();

  const [form, setForm] = useState({
    symbol: "",
    timeframe: "",
    initialBalance: 1000,
    strategy: "",
    risk: "Medium",
    stopLoss: 1,
    takeProfit: 2
  });

  const [historyChart, setHistoryChart] = useState([]);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
      loadHistoryChart();
    }
  }, [user]);

  useEffect(() => {
    if (options.symbols?.length && options.strategies?.length) {
      setForm({
        symbol: options.symbols[0],
        timeframe: options.timeframes[0],
        initialBalance: options.balances?.[2] || 1000,
        strategy: options.strategies[0],
        risk: options.risks?.[1] || "Medium",
        stopLoss: options.stopLosses?.[0] || 1,
        takeProfit: options.takeProfits?.[0] || 2,
      });
    }
  }, [options]);

  async function loadHistoryChart() {
    if (!user?._id) return;
    try {
      const res = await fetchBacktests();
      const data = backtests.map(bt => ({
        time: new Date(bt.createdAt).toLocaleString(),
        initialBalance: bt.initialBalance,
        finalBalance: bt.finalBalance ?? ((bt.results?.profit ?? 0) + bt.initialBalance),
        profit: bt.results?.profit ?? 0,
      }));
      setHistoryChart(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRun() {
    if (!form.symbol || !form.timeframe) return alert("Select symbol and timeframe!");
    await runBacktest(form);
    loadHistoryChart();
  }

  async function handleBatchRun() {
    const paramCombos = options.symbols.flatMap(symbol =>
      options.strategies.map(strategy => ({
        symbol,
        timeframe: form.timeframe,
        strategy: { name: strategy },
        risk: form.risk,
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        initialBalance: form.initialBalance
      }))
    );
    await runBatchBacktests(paramCombos, "coinbase");
    loadHistoryChart();
  }

  const Stats = ({ m }) => {
    if (!m) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Final Balance</div>
          <div className="text-lg font-semibold">${m.finalBalance.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Net Profit</div>
          <div className={`text-lg font-semibold ${m.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${m.netProfit.toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <select value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}>
          {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={form.timeframe} onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))}>
          {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
        </select>

        <select value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}>
          {options.strategies?.map(st => <option key={st} value={st}>{st}</option>)}
        </select>

        <select value={form.risk} onChange={e => setForm(f => ({ ...f, risk: e.target.value }))}>
          {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={form.stopLoss} onChange={e => setForm(f => ({ ...f, stopLoss: Number(e.target.value) }))}>
          {options.stopLosses?.map(sl => <option key={sl} value={sl}>{sl}%</option>)}
        </select>

        <select value={form.takeProfit} onChange={e => setForm(f => ({ ...f, takeProfit: Number(e.target.value) }))}>
          {options.takeProfits?.map(tp => <option key={tp} value={tp}>{tp}%</option>)}
        </select>

        <select value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: Number(e.target.value) }))}>
          {options.balances?.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button onClick={handleRun} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Running..." : "Run Backtest"}
        </button>

        <button onClick={handleBatchRun} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
          {loading ? "Running..." : "Run Batch Backtests"}
        </button>
      </div>

      {/* Best result */}
      {best && (
        <div className="bg-yellow-100 p-4 rounded-2xl mt-4">
          <h2 className="font-semibold">Best Backtest</h2>
          <p>{best.symbol} • {best.strategy.name} • Profit: ${best.netProfit.toFixed(2)}</p>
        </div>
      )}

      {/* Backtest history chart */}
      {historyChart.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow mt-6">
          <h2 className="font-semibold mb-2">Backtest History</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="finalBalance" stroke="#10B981" dot={false} />
              <Line type="monotone" dataKey="profit" stroke="#F59E0B" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
