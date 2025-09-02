// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, ReferenceDot
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const {
    results,
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
    strategy: "",
    risk: "Medium",
    initialBalance: 1000,
  });

  const [batchParams, setBatchParams] = useState({
    stopLoss: [0.01, 0.02],
    takeProfit: [0.03, 0.05],
    interval: ["5m", "15m"]
  });

  const [latest, setLatest] = useState(null); // store latest equity curve & metrics
  const [historyChart, setHistoryChart] = useState([]);

  // Load options and user backtests
  useEffect(() => {
    if (!user?._id) return;
    fetchOptions();
    fetchBacktests();
  }, [user]);

  // Initialize form defaults when options load
  useEffect(() => {
    if (!options) return;
    setForm({
      symbol: options.symbols?.[0] || "BTCUSDT",
      timeframe: options.timeframes?.[0] || "1h",
      strategy: options.strategies?.[0] || "SMA",
      risk: options.risks?.[1] || "Medium",
      initialBalance: options.balances?.[2] || 1000
    });
  }, [options]);

  // Load history chart data
  useEffect(() => {
    const chartData = results.map(bt => ({
      time: new Date(bt.createdAt).toLocaleString(),
      initialBalance: bt.initialBalance,
      finalBalance: bt.finalBalance ?? bt.results?.profit + bt.initialBalance || 0,
      profit: bt.results?.profit ?? 0
    }));
    setHistoryChart(chartData);
  }, [results]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "initialBalance" ? Number(value) : value
    }));
  };

  const handleRunSingle = async () => {
    const res = await runBacktest(form);
    if (res?.backtests?.length) {
      setLatest({
        equityCurve: res.backtests[0].equityCurve || [],
        trades: res.backtests[0].trades || [],
        metrics: res.backtests[0].metrics || {}
      });
    }
  };

  const handleRunBatch = () => {
    // generate all combinations
    const combos = [];
    batchParams.stopLoss.forEach(sl => {
      batchParams.takeProfit.forEach(tp => {
        batchParams.interval.forEach(interval => {
          combos.push({ ...form, stopLoss: sl, takeProfit: tp, interval });
        });
      });
    });
    runBatchBacktests(combos);
  };

  const TradeDots = ({ trades }) => {
    if (!latest?.equityCurve?.length) return null;
    const firstTs = latest.equityCurve[0]?.time;
    const lastTs = latest.equityCurve[latest.equityCurve.length - 1]?.time;

    return trades?.map((t, idx) => {
      if (!t.exitTime) return null;
      const when = new Date(t.exitTime).getTime();
      if (when < firstTs || when > lastTs) return null;
      const near = latest.equityCurve.reduce((a, b) =>
        Math.abs(b.time - when) < Math.abs(a.time - when) ? b : a
      );
      return <ReferenceDot key={idx} x={near.time} y={near.equity} r={4} stroke="none" fill={t.profit > 0 ? "#10B981" : "#EF4444"} />;
    });
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
          <div className={`text-lg font-semibold ${m.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${m.netProfit?.toLocaleString()}
          </div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Win Rate</div>
          <div className="text-lg font-semibold">{m.winRate}%</div>
        </div>
        <div className="p-3 rounded bg-gray-100">
          <div className="text-xs text-gray-500">Max Drawdown</div>
          <div className="text-lg font-semibold">{m.maxDrawdown}%</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Backtests</h1>

      {/* Single Backtest Controls */}
      <div className="bg-gray-100 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        {["symbol","timeframe","strategy","risk","initialBalance"].map(key => (
          <div key={key}>
            <label className="block text-sm font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
            <select name={key} value={form[key]} onChange={handleChange} className="border p-1 rounded">
              {(options[key + "s"] || []).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <button onClick={handleRunSingle} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {/* Batch Optimization */}
      <div className="bg-gray-50 p-4 rounded-2xl mt-4">
        <h2 className="font-semibold">Batch Optimization</h2>
        <button onClick={handleRunBatch} className="bg-green-600 text-white px-4 py-2 rounded mt-2">
          Run Batch Backtests
        </button>
        {best && <p className="mt-2">Best Profit: ${best.results.profit.toFixed(2)} | Params: {JSON.stringify(best.params)}</p>}
      </div>

      {/* Latest Equity Curve */}
      {latest && latest.equityCurve?.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-xl font-semibold mb-2">Latest Backtest – Equity Curve</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={latest.equityCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={ts => new Date(ts).toLocaleString()} />
              <YAxis />
              <Tooltip labelFormatter={ts => new Date(ts).toLocaleString()} formatter={(v,n) => n==="equity"? `$${v.toLocaleString()}`:v} />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke="#3B82F6" dot={false} />
              <TradeDots trades={latest.trades} />
            </LineChart>
          </ResponsiveContainer>
          <Stats m={latest.metrics} />
        </div>
      )}

      {/* Historical Summary Chart */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-4">Backtests History</h2>
        {historyChart.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="initialBalance" stroke="#F59E0B" strokeWidth={2} dot />
              <Line type="monotone" dataKey="finalBalance" stroke="#3B82F6" strokeWidth={2} dot />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-gray-500">No chart data.</p>}
      </div>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
