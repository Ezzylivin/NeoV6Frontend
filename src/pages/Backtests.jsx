import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../api/apiClient.js"; // your token-aware axios instance
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
    currentBacktest,
    batchResults,
    runBacktest,
    runBatchBacktests,
    defaultRealism,
    loadingSingle: hookLoadingSingle,
    loadingBatch: hookLoadingBatch,
  } = useBacktest();

  const [options, setOptions] = useState({
    symbols: [],
    strategies: [],
    timeframes: [],
    balances: [],
    risks: [],
    positions: [],
    availableDates: {},
  });

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // --- Backtest controls ---
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedTP, setSelectedTP] = useState("");
  const [selectedSL, setSelectedSL] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [strategyParams, setStrategyParams] = useState({});
  const [realism, setRealism] = useState(defaultRealism);

  // --- Strategy creator state ---
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyParams, setNewStrategyParams] = useState({ param1: 0 });
  const [strategyMessage, setStrategyMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Fetch live options from backend ---
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await axios.get("/api/backtest/options"); // endpoint returning all available symbols, strategies, timeframes, etc.
        setOptions(res.data);

        // Auto-select defaults
        const last = JSON.parse(localStorage.getItem("lastBacktestParams"));
        if (last) {
          setSelectedSymbol(last.selectedSymbol);
          setSelectedStrategy(last.selectedStrategy);
          setSelectedTimeframe(last.selectedTimeframe);
          setSelectedBalance(last.selectedBalance);
          setSelectedRisk(last.selectedRisk);
          setSelectedPosition(last.selectedPosition);
          setSelectedStartDate(last.selectedStartDate);
          setSelectedEndDate(last.selectedEndDate);
        } else if (res.data.symbols?.length && res.data.strategies?.length) {
          setSelectedSymbol(res.data.symbols[0]);
          setSelectedStrategy(res.data.strategies[0]?.name);
          setSelectedTimeframe(res.data.timeframes?.[0] || "1h");
          setSelectedBalance(res.data.balances?.[0] || 1000);
          setSelectedRisk(res.data.risks?.[0] || "Medium");
          setSelectedPosition(res.data.positions?.[0] || "Both");
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
      }
    };
    fetchOptions();
  }, []);

  // --- Update strategy parameters when selected strategy changes ---
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    const defaults = {};
    if (strat?.parameters) {
      Object.keys(strat.parameters).forEach((key) => {
        defaults[key] = strat.parameters[key]?.default ?? 0;
      });
    }
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  // --- Auto adjust start/end dates ---
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // --- Strategy Creator: Render Params ---
  const renderNewStrategyParams = () =>
    Object.keys(newStrategyParams).map((key) => (
      <div key={key} className="flex flex-col space-y-1 mt-2">
        <div className="flex justify-between items-center">
          <label className="font-medium">{key}</label>
          {Object.keys(newStrategyParams).length > 1 && (
            <button
              onClick={() => {
                const copy = { ...newStrategyParams };
                delete copy[key];
                setNewStrategyParams(copy);
              }}
              className="px-2 py-1 bg-red-500 text-white rounded text-sm"
            >
              Delete
            </button>
          )}
        </div>
        <input
          type="number"
          value={newStrategyParams[key]}
          placeholder="Enter value"
          onChange={(e) =>
            setNewStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
          }
          className="border p-1 rounded w-full"
        />
        <p className="text-xs text-gray-500">Tip: Adjust {key} to control strategy behavior.</p>
      </div>
    ));

  const handleAddParamField = () => {
    const paramName = `param${Object.keys(newStrategyParams).length + 1}`;
    setNewStrategyParams((prev) => ({ ...prev, [paramName]: 0 }));
  };

  const handleCreateStrategy = async () => {
    if (!newStrategyName) {
      setStrategyMessage("Please enter a strategy name.");
      return;
    }
    const newStrategy = { name: newStrategyName, parameters: newStrategyParams, userId };
    try {
      const response = await axios.post("/api/strategies/save", newStrategy);
      if (response.data.success) {
        setStrategyMessage("✅ Strategy created! It will appear in the dropdown.");
        setNewStrategyName("");
        setNewStrategyParams({ param1: 0 });
        setSelectedStrategy(newStrategyName);
        // Optionally refresh options to include new strategy
        const updatedOptions = await axios.get("/api/backtest/options");
        setOptions(updatedOptions.data);
      } else {
        setStrategyMessage("❌ Error creating strategy.");
      }
    } catch (err) {
      console.error(err);
      setStrategyMessage("❌ Network error while saving strategy.");
    }
  };

  // --- Run Backtests ---
  const handleRunBacktest = async () => {
    if (!userId) return alert("Login required to run backtests.");
    const strat = options.strategies?.find((s) => s.name === selectedStrategy) || {};
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: strat._id || null,
      strategy: { name: strat.name || selectedStrategy, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP || undefined,
      stopLoss: selectedSL || undefined,
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
      localStorage.setItem(
        "lastBacktestParams",
        JSON.stringify({
          selectedSymbol,
          selectedStrategy,
          selectedTimeframe,
          selectedBalance,
          selectedRisk,
          selectedPosition,
          selectedStartDate,
          selectedEndDate,
        })
      );
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleRunBatch = async () => {
    if (!userId) return alert("Login required to run batch backtests.");
    const paramCombos = options.strategies?.map((s) => ({
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: s._id,
      strategy: { name: s.name, parameters: strategyParams },
      risk: selectedRisk,
      takeProfit: selectedTP || undefined,
      stopLoss: selectedSL || undefined,
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

  // --- Render chart & summary ---
  const renderChart = (data, color = "#8884d8") =>
    data?.length ? (
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

  const renderSummary = (bt) => (
    <table className="w-full mt-2 text-sm border border-gray-300">
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
            placeholder="Mean Reversion"
            className="border p-1 rounded w-full mt-1"
          />
        </label>
        <div className="mt-2">
          <h4 className="font-medium">Parameters</h4>
          {renderNewStrategyParams()}
          <button
            onClick={handleAddParamField}
            className="mt-2 px-3 py-1 bg-green-500 text-white rounded"
          >
            + Add Parameter
          </button>
        </div>
        {strategyMessage && <p className="mt-2 text-sm text-gray-700">{strategyMessage}</p>}
        <button
          onClick={handleCreateStrategy}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save Strategy
        </button>
      </div>

      {/* Backtest Controls */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <label>
          Symbol
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
            {options.symbols?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Strategy
          <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
            {options.strategies?.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Timeframe
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
            {options.timeframes?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Balance
          <input
            type="number"
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
          />
        </label>
        <label>
          Risk
          <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
            {options.risks?.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Position
          <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            {options.positions?.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Start Date
          <input
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
          />
        </label>
        <label>
          End Date
          <input
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
          />
        </label>
      </div>

      {/* Advanced Options */}
      <button
        className="mt-2 px-3 py-1 bg-gray-300 rounded"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
      </button>
      {showAdvanced && (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <label>
            Take Profit
            <input
              type="number"
              value={selectedTP}
              onChange={(e) => setSelectedTP(Number(e.target.value))}
            />
          </label>
          <label>
            Stop Loss
            <input
              type="number"
              value={selectedSL}
              onChange={(e) => setSelectedSL(Number(e.target.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={realism.useNews}
              onChange={(e) => setRealism({ ...realism, useNews: e.target.checked })}
            />
            Use News
          </label>
          <label>
            <input
              type="checkbox"
              checked={realism.useSlippage}
              onChange={(e) => setRealism({ ...realism, useSlippage: e.target.checked })}
            />
            Use Slippage
          </label>
          <label>
            <input
              type="checkbox"
              checked={realism.useSpread}
              onChange={(e) => setRealism({ ...realism, useSpread: e.target.checked })}
            />
            Use Spread
          </label>
          <label>
            <input
              type="checkbox"
              checked={realism.useRandomEvents}
              onChange={(e) => setRealism({ ...realism, useRandomEvents: e.target.checked })}
            />
            Random Events
          </label>
        </div>
      )}

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
          {loadingBatch || hookLoadingBatch ? "Running Batch..." : "Run Batch"}
        </button>
      </div>

      {/* Single Backtest Result */}
      {currentBacktest && (
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold">Single Backtest</h3>
          {renderChart(currentBacktest.equityCurve)}
          {renderSummary(currentBacktest)}
        </div>
      )}

      {/* Batch Backtests */}
      {batchResults?.length > 0 && (
        <div className="mt-6 space-y-6">
          <h3 className="font-semibold">Batch Backtests</h3>
          {batchResults.map((bt, i) => (
            <div key={i} className="border p-2 rounded">
              <h4 className="font-medium">{bt.strategy?.name || `Strategy ${i + 1}`}</h4>
              {renderChart(bt.equityCurve, `hsl(${(i * 60) % 360},70%,50%)`)}
              {renderSummary(bt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
