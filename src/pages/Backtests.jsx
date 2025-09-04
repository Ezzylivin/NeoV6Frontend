// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const { runBacktest, runBatchBacktests } = useBacktest();

  const [results, setResults] = useState([]); // stores all results (single + batch)
  const [view, setView] = useState("charts"); // charts | tables
  const [expanded, setExpanded] = useState({}); // collapsible panels

  // Run single backtest
  const handleSingleRun = async (params) => {
    const res = await runBacktest(params);
    if (res) {
      setResults((prev) => [...prev, res]);
    }
  };

  // Run batch backtests
  const handleBatchRun = async (params) => {
    const batch = await runBatchBacktests(params);
    if (batch?.results?.length) {
      // mark each with batch index
      const labeled = batch.results.map((r, i) => ({ ...r, batchIndex: i + 1 }));
      setResults((prev) => [...prev, ...labeled]);
    }
  };

  // Combined equity chart for batch runs
  const renderCombinedEquity = () => {
    const batchRuns = results.filter((r) => r.batchIndex);

    if (!batchRuns.length) return null;

    // build equity curves data per run
    const chartData = {};
    batchRuns.forEach((run, i) => {
      run.trades?.forEach((t, idx) => {
        if (!chartData[idx]) chartData[idx] = { step: idx };
        chartData[idx][`Batch ${run.batchIndex}`] = t.equity;
      });
    });

    const merged = Object.values(chartData);

    return (
      <div className="bg-[#1a1a1a] rounded-2xl p-4 shadow mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">
          Combined Batch Equity Curves
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={merged}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="step" stroke="#bbb" />
            <YAxis stroke="#bbb" />
            <Tooltip />
            <Legend />
            {batchRuns.map((r) => (
              <Line
                key={r.batchIndex}
                type="monotone"
                dataKey={`Batch ${r.batchIndex}`}
                stroke={`hsl(${(r.batchIndex * 60) % 360},70%,60%)`}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Panel per result
  const renderResult = (res, idx) => {
    const id = res._id || idx;
    const isOpen = expanded[id] ?? true;

    return (
      <div
        key={id}
        className="bg-[#1a1a1a] rounded-2xl p-4 shadow mb-4 text-white"
      >
        {/* Header */}
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setExpanded((prev) => ({ ...prev, [id]: !isOpen }))}
        >
          <h3 className="font-semibold">
            {res.symbol} ({res.strategy?.name || "N/A"}){" "}
            {res.batchIndex ? `(Batch #${res.batchIndex})` : ""}
          </h3>
          <span>{isOpen ? "[-]" : "[+]"}</span>
        </div>

        {isOpen && (
          <div className="mt-3 space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#222] p-3 rounded-xl shadow">
                <p className="text-sm text-gray-400">Net Profit</p>
                <p
                  className={`text-lg font-bold ${
                    res.metrics?.netProfit > 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {res.metrics?.netProfit ?? "N/A"}
                </p>
              </div>
              <div className="bg-[#222] p-3 rounded-xl shadow">
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-lg font-bold">
                  {res.metrics?.winRate ?? "N/A"}%
                </p>
              </div>
              <div className="bg-[#222] p-3 rounded-xl shadow">
                <p className="text-sm text-gray-400">Max Drawdown</p>
                <p className="text-lg font-bold">
                  {res.metrics?.maxDrawdown ?? "N/A"}%
                </p>
              </div>
              <div className="bg-[#222] p-3 rounded-xl shadow">
                <p className="text-sm text-gray-400">Trades</p>
                <p className="text-lg font-bold">
                  {res.metrics?.trades ?? "N/A"}
                </p>
              </div>
            </div>

            {/* Params */}
            <div className="text-sm text-gray-400">
              Strategy = {res.strategy?.name} | Risk = {res.risk} | TP ={" "}
              {res.takeProfit ?? "—"} | SL = {res.stopLoss ?? "—"}
            </div>

            {/* Charts or Table */}
            {view === "charts" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={res.trades || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="exitTime" stroke="#bbb" hide />
                    <YAxis stroke="#bbb" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#8884d8"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={res.trades || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="exitTime" stroke="#bbb" hide />
                    <YAxis stroke="#bbb" />
                    <Tooltip />
                    <Bar dataKey="profit" fill="#4ade80" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white text-black rounded-xl shadow">
                  <thead>
                    <tr className="bg-gray-200 text-left">
                      <th className="p-2">Exit Time</th>
                      <th className="p-2">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.trades?.map((t, i) => (
                      <tr
                        key={i}
                        className={
                          t.profit > 0
                            ? "bg-green-100"
                            : t.profit < 0
                            ? "bg-red-100"
                            : ""
                        }
                      >
                        <td className="p-2">{t.exitTime}</td>
                        <td
                          className={`p-2 font-semibold ${
                            t.profit > 0
                              ? "text-green-600"
                              : t.profit < 0
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {t.profit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Controls (your selectors stay unchanged) */}
      <div className="flex gap-3 mb-6">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
          onClick={() =>
            handleSingleRun({
              symbol: "BTCUSDT",
              timeframe: "1h",
              initialBalance: 1000,
              strategy: { name: "SMA", parameters: {} },
              risk: "Medium",
              takeProfit: 2,
              stopLoss: 1,
            })
          }
        >
          Run Single Backtest
        </button>

        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          onClick={() =>
            handleBatchRun({
              symbol: "BTCUSDT",
              timeframe: "1h",
              initialBalance: 1000,
            })
          }
        >
          Run Batch Backtests
        </button>

        <button
          className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700"
          onClick={() => setView(view === "charts" ? "tables" : "charts")}
        >
          Switch to {view === "charts" ? "Tables" : "Charts"}
        </button>
      </div>

      {/* Combined Batch Chart */}
      {renderCombinedEquity()}

      {/* Results */}
      <div>{results.map((res, i) => renderResult(res, i))}</div>
    </div>
  );
}
