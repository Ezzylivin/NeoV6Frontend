// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.js"; // <-- make sure this exists
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth(); // ✅ get logged-in user info
  const userId = user?.id; // ✅ backend requires this

  const {
    options,
    loading,
    error,
    currentBacktest,
    runBacktest,
    batchResults,
    runBatchBacktests,
    defaultRealism,
  } = useBacktest();

  // Selection states
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(0);
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");

  // Strategy parameters
  const [strategyParams, setStrategyParams] = useState({});

  const [realism, setRealism] = useState(defaultRealism);
  const [collapsedLogs, setCollapsedLogs] = useState({});

  // --- AUTO-SET DEFAULTS WHEN OPTIONS LOAD ---
  useEffect(() => {
    if (!options.symbols?.length) return;

    setSelectedSymbol((prev) => prev || options.symbols[0]);
    setSelectedStrategy((prev) => prev || options.strategies?.[0]?.name || "");
    setSelectedTimeframe((prev) => prev || options.timeframes?.[0] || "1h");
    setSelectedBalance((prev) => prev || options.balances?.[0] || 1000);
    setSelectedRisk((prev) => prev || options.risks?.[0] || "Medium");
    setSelectedPosition((prev) => prev || options.positions?.[0] || "Both");

    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (strat?.parameters) setStrategyParams(strat.parameters);
  }, [options]);

  // --- UPDATE STRATEGY PARAMS WHEN STRATEGY CHANGES ---
  useEffect(() => {
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    setStrategyParams(strat?.parameters || {});
  }, [selectedStrategy, options.strategies]);

  // --- AUTO-ADJUST START/END DATES WHEN SYMBOL OR TIMEFRAME CHANGES ---
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;

    setSelectedStartDate((prev) => {
      if (!prev) return available.start;
      return prev < available.start ? available.start : prev > available.end ? available.end : prev;
    });

    setSelectedEndDate((prev) => {
      if (!prev) return available.end;
      return prev > available.end ? available.end : prev < available.start ? available.start : prev;
    });
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // --- RUN SINGLE BACKTEST ---
  const handleRunBacktest = async () => {
    if (!userId) {
      alert("You must be logged in to run backtests.");
      return;
    }

    await runBacktest({
      userId, // ✅ required by backend
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: selectedBalance,
      strategy: { name: selectedStrategy, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP,
      stopLoss: selectedSL,
      position: selectedPosition,
      realism,
      startDate: selectedStartDate || undefined,
      endDate: selectedEndDate || undefined,
    });
  };

  // --- RUN BATCH BACKTESTS ---
  const handleRunBatch = async () => {
    if (!userId) {
      alert("You must be logged in to run batch backtests.");
      return;
    }

    await runBatchBacktests({
      userId, // ✅ required by backend
      symbols: options.symbols || [],
      timeframes: options.timeframes || [],
      balances: options.balances || [],
      strategies: (options.strategies || []).map((s) => ({
        name: s.name,
        parameters: s.parameters || {},
      })),
      risks: options.risks || [],
      takeProfits: options.takeProfits || [], // ✅ camelCase
      stopLosses: options.stopLosses || [],   // ✅ camelCase
      positions: options.positions || [],
      realism,
      startDate: selectedStartDate || undefined,
      endDate: selectedEndDate || undefined,
    });
  };

  // --- RENDER STRATEGY PARAMETERS ---
  const renderStrategyParams = () =>
    Object.keys(strategyParams || {}).map((key) => (
      <label key={key} className="flex flex-col text-sm">
        {key.charAt(0).toUpperCase() + key.slice(1)}
        <input
          type="number"
          value={strategyParams[key]}
          onChange={(e) =>
            setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
          }
          className="border p-1 rounded w-full"
        />
      </label>
    ));

  // --- RENDER CHART ---
  const renderChart = (data, color = "#8884d8") =>
    data?.length > 0 ? (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="equity" stroke={color} />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <p>No equity data available.</p>
    );

  // --- RENDER SUMMARY ---
  const renderSummary = (bt) => (
    <table className="w-full mt-2 text-sm border-collapse border border-gray-300">
      <tbody>
        <tr>
          <td className="border p-1 font-semibold">Total Trades</td>
          <td className="border p-1">{bt.trades?.length || 0}</td>
        </tr>
        <tr>
          <td className="border p-1 font-semibold">Final Balance</td>
          <td className="border p-1">
            ${bt.equityCurve?.slice(-1)[0]?.equity?.toFixed(2) || 0}
          </td>
        </tr>
        <tr>
          <td className="border p-1 font-semibold">Max Drawdown</td>
          <td className="border p-1">{bt.metrics?.maxDrawdown?.toFixed(2) || 0}%</td>
        </tr>
        <tr>
          <td className="border p-1 font-semibold">Profit %</td>
          <td className="border p-1">{bt.metrics?.netProfit?.toFixed(2) || 0}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Backtesting</h2>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow">
        <label className="flex flex-col text-sm">
          Symbol
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border p-1 rounded"
          >
            {options.symbols?.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Strategy
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="border p-1 rounded"
          >
            {options.strategies?.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Timeframe
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border p-1 rounded"
          >
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Balance
          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
            className="border p-1 rounded"
          >
            {options.balances?.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Risk
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="border p-1 rounded"
          >
            {options.risks?.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Take Profit
          <select
            value={selectedTP || ""}
            onChange={(e) => setSelectedTP(Number(e.target.value))}
            className="border p-1 rounded"
          >
            <option value="">None</option>
            {options.takeProfits?.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Stop Loss
          <select
            value={selectedSL || ""}
            onChange={(e) => setSelectedSL(Number(e.target.value))}
            className="border p-1 rounded"
          >
            <option value="">None</option>
            {options.stopLosses?.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Position
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="border p-1 rounded"
          >
            {options.positions?.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm">
          Start Date
          <input
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col text-sm">
          End Date
          <input
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
            className="border p-1 rounded"
          />
        </label>
      </div>

      {/* Strategy Params */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow">
        {renderStrategyParams()}
      </div>

      {/* Realism factors */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg shadow">
        {Object.keys(defaultRealism).map((key) =>
          key !== "slippage_bps" ? (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={realism[key]}
                onChange={() =>
                  setRealism((prev) => ({ ...prev, [key]: !prev[key] }))
                }
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ) : (
            <label key={key} className="text-sm flex items-center gap-2">
              Slippage Bps:
              <input
                type="number"
                min="0"
                max="100"
                value={realism.slippage_bps}
                onChange={(e) =>
                  setRealism((prev) => ({
                    ...prev,
                    slippage_bps: Number(e.target.value),
                  }))
                }
                className="border p-1 w-20 rounded"
              />
            </label>
          )
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Run Backtest
        </button>
        <button
          onClick={handleRunBatch}
          disabled={loading}
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          Run Batch Backtests
        </button>
      </div>

      {/* Current Backtest */}
      {currentBacktest && (
        <div className="bg-white p-4 shadow rounded-lg">
          <h3 className="text-lg font-bold">Current Backtest</h3>
          {renderChart(currentBacktest.equityCurve)}
          {renderSummary(currentBacktest)}
        </div>
      )}

      {/* Batch Results */}
      {batchResults?.results?.length > 0 && (
        <div className="bg-white p-4 shadow rounded-lg">
          <h3 className="text-lg font-bold">Batch Results</h3>
          {batchResults.results.map((bt, i) => (
            <div key={i} className="mb-6">
              <h4 className="font-semibold">
                {bt.saved?.symbol} - {bt.saved?.timeframe}
              </h4>
              {renderChart(bt.equityCurve, "#82ca9d")}
              {renderSummary(bt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
