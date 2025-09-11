import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    options,
    currentBacktest,
    batchResults,
    runBacktest,
    runBatchBacktests,
    defaultRealism,
    loadingSingle: hookLoadingSingle,
    loadingBatch: hookLoadingBatch,
  } = useBacktest();

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // --- Backtest controls ---
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [strategyParams, setStrategyParams] = useState({});
  const [realism, setRealism] = useState(defaultRealism);

  // --- Strategy Creator State ---
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyParams, setNewStrategyParams] = useState({});

  // --- Auto-set defaults when options load ---
  useEffect(() => {
    if (options.symbols?.length && options.strategies?.length) {
      setSelectedSymbol(options.symbols[0]);
      setSelectedStrategy(options.strategies[0]?.name);
      setSelectedTimeframe(options.timeframes?.[0] || "1h");
      setSelectedBalance(options.balances?.[0] || 1000);
      setSelectedRisk(options.risks?.[0] || "Medium");
      setSelectedPosition(options.positions?.[0] || "Both");
    }
  }, [options]);

  // --- Update strategy parameters when selected strategy changes ---
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    const defaults = {};
    if (strat?.parameters) {
      Object.keys(strat.parameters).forEach((key) => {
        defaults[key] = strat.parameters[key] ?? 0;
      });
    }
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  // --- Auto-adjust start/end dates ---
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // --- Create new strategy ---
  const handleCreateStrategy = async () => {
    if (!newStrategyName || Object.keys(newStrategyParams).length === 0) {
      alert("Please provide a strategy name and parameters.");
      return;
    }

    const newStrategy = {
      name: newStrategyName,
      parameters: newStrategyParams,
      userId,
    };

    try {
      // Call the backend to save the new strategy
      const response = await fetch(`/api/strategies/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStrategy),
      });

      const data = await response.json();
      if (data.success) {
        alert("Strategy created successfully!");
        // Reload strategies from the backend (you might need to update options)
      } else {
        alert("Error creating strategy.");
      }
    } catch (err) {
      console.error("Error creating strategy", err);
      alert("An error occurred while saving the strategy.");
    }
  };

  // --- Run single backtest ---
  const handleRunBacktest = async () => {
    if (!userId) return alert("You must be logged in to run backtests.");
    const strat = options.strategies?.find((s) => s.name === selectedStrategy) || {};
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: strat._id || null,
      strategy: { name: strat.name || selectedStrategy, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP ?? undefined,
      stopLoss: selectedSL ?? undefined,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition,
      tradeConfig: {},
    };

    try {
      setLoadingSingle(true);
      await runBacktest(payload);
    } finally {
      setLoadingSingle(false);
    }
  };

  // --- Run batch backtests ---
  const handleRunBatch = async () => {
    if (!userId) return alert("You must be logged in to run batch backtests.");
    const paramCombos = options.strategies?.map((s) => ({
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: s._id,
      strategy: { name: s.name, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP ?? undefined,
      stopLoss: selectedSL ?? undefined,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      useNews: realism.useNews,
      useSlippage: realism.useSlippage,
      useSpread: realism.useSpread,
      useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
      baseSlippageBps: realism.slippage_bps,
      positionSide: selectedPosition,
      tradeConfig: {},
    }));

    try {
      setLoadingBatch(true);
      await runBatchBacktests({ paramCombos });
    } finally {
      setLoadingBatch(false);
    }
  };

  // --- Render strategy parameter inputs ---
  const renderStrategyParams = () =>
    Object.keys(strategyParams || {}).map((key) => (
      <label key={key} className="flex flex-col text-sm">
        {key}
        <input
          type="number"
          value={strategyParams[key]}
          onChange={(e) =>
            setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) })) }
          className="border p-1 rounded w-full"
        />
      </label>
    ));

  // --- Render equity chart ---
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
      <p>No equity data.</p>
    );

  // --- Render batch equity comparison chart ---
  const renderBatchComparisonChart = (data) =>
    data?.length > 0 ? (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="strategyName" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="netProfit" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <p>No batch data.</p>
    );

 // --- Render summary table ---
const renderSummary = (bt) => (
  <table className="w-full mt-2 text-sm border-collapse border border-gray-300">
    <tbody>
      <tr>
        <td className="border p-1 font-semibold">Trades</td>
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
        <td className="border p-1 font-semibold">Net Profit</td>
        <td className="border p-1">{bt.metrics?.netProfit?.toFixed(2) || 0}</td>
      </tr>
    </tbody>
  </table>
);

return (
  <div className="p-6 space-y-6">
    <h2 className="text-2xl font-bold">Backtesting</h2>

    {/* Strategy Creator */}
    <div className="border p-4 rounded bg-gray-100">
      <h3 className="font-semibold">Create New Strategy</h3>
      <label>
        Strategy Name
        <input
          type="text"
          value={newStrategyName}
          onChange={(e) => setNewStrategyName(e.target.value)}
          className="border p-1 rounded w-full"
        />
      </label>

      {/* Custom strategy parameter fields */}
      <div className="mt-2">
        <h4 className="font-medium">Parameters</h4>
        <label>
          Custom Parameter 1
          <input
            type="number"
            value={newStrategyParams.customParam1 || 0}
            onChange={(e) =>
              setNewStrategyParams({ ...newStrategyParams, customParam1: Number(e.target.value) })
            }
            className="border p-1 rounded w-full"
          />
        </label>
        {/* Add more parameter fields as needed */}
      </div>

      <button
        onClick={handleCreateStrategy}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save Strategy
      </button>
    </div>

    {/* Backtest Controls */}
    <div className="grid grid-cols-2 gap-4 mt-4">
      <label>
        Symbol
        <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
          {options.symbols?.length ? (
            options.symbols.map((s) => <option key={s} value={s}>{s}</option>)
          ) : (
            <option disabled>Loading symbols...</option>
          )}
        </select>
      </label>

      <label>
        Strategy
        <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
          {options.strategies?.length ? (
            options.strategies.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)
          ) : (
            <option disabled>Loading strategies...</option>
          )}
        </select>
      </label>

      <label>
        Timeframe
        <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
          {options.timeframes?.length ? (
            options.timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)
          ) : (
            <option disabled>Loading timeframes...</option>
          )}
        </select>
      </label>

      <label>
        Balance
        <input
          type="number"
          value={selectedBalance}
          onChange={(e) => setSelectedBalance(Number(e.target.value))}
          className="border p-1 rounded w-full"
        />
      </label>

      <label>
        Risk
        <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
          {options.risks?.length ? (
            options.risks.map((r) => <option key={r} value={r}>{r}</option>)
          ) : (
            <option disabled>Loading risks...</option>
          )}
        </select>
      </label>

      <label>
        Position
        <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
          {options.positions?.length ? (
            options.positions.map((p) => <option key={p} value={p}>{p}</option>)
          ) : (
            <option disabled>Loading positions...</option>
          )}
        </select>
      </label>
    </div>

    {/* Strategy Parameters */}
    <div className="mt-4">{renderStrategyParams()}</div>

    {/* Realism Settings */}
    <div className="mt-4 grid grid-cols-3 gap-4">
      <label>
        <input
          type="checkbox"
          checked={realism.useNews}
          onChange={(e) => setRealism(prev => ({ ...prev, useNews: e.target.checked }))}
        />
        Use News
      </label>
      <label>
        <input
          type="checkbox"
          checked={realism.useSlippage}
          onChange={(e) => setRealism(prev => ({ ...prev, useSlippage: e.target.checked }))}
        />
        Use Slippage
      </label>
      <label>
        <input
          type="checkbox"
          checked={realism.useSpread}
          onChange={(e) => setRealism(prev => ({ ...prev, useSpread: e.target.checked }))}
        />
        Use Spread
      </label>
    </div>

    {/* Run Buttons */}
    <div className="mt-4 flex gap-4">
      <button
        onClick={handleRunBacktest}
        disabled={loadingSingle || hookLoadingSingle}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loadingSingle || hookLoadingSingle ? "Running..." : "Run Backtest"}
      </button>

      <button
        onClick={handleRunBatch}
        disabled={loadingBatch || hookLoadingBatch}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {loadingBatch || hookLoadingBatch ? "Running Batch..." : "Run Batch Backtests"}
      </button>
    </div>

    {/* Single Backtest Result */}
    {currentBacktest && (
      <div className="mt-6 space-y-4">
        <h3 className="font-semibold">Single Backtest</h3>
        {currentBacktest.equityCurve?.length > 0
          ? renderChart(currentBacktest.equityCurve)
          : <p>No equity data.</p>}
        {renderSummary(currentBacktest)}
      </div>
    )}

    {/* Batch Backtest Results */}
    {batchResults?.length > 0 && (
      <div className="mt-6 space-y-6">
        <h3 className="font-semibold">Batch Backtests</h3>
        {batchResults.map((bt, i) => (
          <div key={i} className="border p-2 rounded">
            <h4 className="font-medium">{bt.strategy?.name || `Strategy ${i + 1}`}</h4>
            {bt.equityCurve?.length > 0
              ? renderChart(bt.equityCurve, `hsl(${(i * 60) % 360}, 70%, 50%)`)
              : <p>No equity data.</p>}
            {renderSummary(bt)}
          </div>
        ))}
      </div>
    )}

    {/* Batch Comparison Chart */}
    {batchResults?.length > 0 && renderBatchComparisonChart(batchResults)}
  </div>
);

