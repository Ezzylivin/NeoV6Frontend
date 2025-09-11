// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "../api/apiClient.js";
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
  const { user } = useAuth();
  const userId = user?.id;

  const {
    options: hookOptions,
    currentBacktest,
    batchResults,
    runBacktest,
    runBatchBacktests,
    defaultRealism,
  } = useBacktest();

  const [options, setOptions] = useState({
    symbols: [],
    strategies: [],
    timeframes: [],
    balances: [],
    risks: [],
    positions: [],
    takeProfits: [],
    stopLosses: [],
    availableDates: {},
  });

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // Backtest controls
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

  // Strategy creator
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyParams, setNewStrategyParams] = useState({ param1: 0 });
  const [strategyMessage, setStrategyMessage] = useState("");

  // Sync options from hook
  useEffect(() => {
    if (!hookOptions) return;
    setOptions(hookOptions);

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
    } else if (hookOptions.symbols?.length && hookOptions.strategies?.length) {
      setSelectedSymbol(hookOptions.symbols[0]);
      setSelectedStrategy(hookOptions.strategies[0]?.name);
      setSelectedTimeframe(hookOptions.timeframes?.[0] || "1h");
      setSelectedBalance(hookOptions.balances?.[0] || 1000);
      setSelectedRisk(hookOptions.risks?.[0] || "Medium");
      setSelectedPosition(hookOptions.positions?.[0] || "Both");
    }
  }, [hookOptions]);

  // Update strategy params
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    const defaults = {};
    if (strat?.params) {
      Object.keys(strat.params).forEach((key) => {
        defaults[key] = strat.params[key]?.default ?? 0;
      });
    }
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  // Auto adjust dates
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // Strategy Creator render
  const renderNewStrategyParams = () =>
    Object.keys(newStrategyParams).map((key) => {
      const strat = options.strategies?.find((s) => s.name === selectedStrategy);
      const desc = strat?.params?.[key]?.description || "Adjust this parameter.";
      const example =
        strat?.params?.[key]?.example !== undefined
          ? `Example: ${strat.params[key].example}`
          : "";
      return (
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
          <p className="text-xs text-gray-500">
            {desc} {example}
          </p>
        </div>
      );
    });

  const handleAddParamField = () => {
    const paramName = `param${Object.keys(newStrategyParams).length + 1}`;
    setNewStrategyParams((prev) => ({ ...prev, [paramName]: 0 }));
  };

  const handleCreateStrategy = async () => {
    if (!newStrategyName) {
      setStrategyMessage("Please enter a strategy name.");
      return;
    }
    const newStrategy = { name: newStrategyName, params: newStrategyParams, userId };
    try {
      const response = await axios.post("/strategies/save", newStrategy);
      if (response.data.success) {
        setStrategyMessage("✅ Strategy created! It will appear in the dropdown.");
        setNewStrategyName("");
        setNewStrategyParams({ param1: 0 });
        setSelectedStrategy(newStrategyName);
        const updatedOptions = await axios.get("/backtests/options");
        setOptions(updatedOptions.data);
      } else {
        setStrategyMessage("❌ Error creating strategy.");
      }
    } catch (err) {
      console.error(err);
      setStrategyMessage("❌ Network error while saving strategy.");
    }
  };

  // Run single backtest
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
      baseSlippageBps: realism.baseSlippageBps,
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

  // Run batch backtest
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
      baseSlippageBps: realism.baseSlippageBps,
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
          <td className="border p-1">{bt.maxDrawdown?.toFixed(2) || 0}%</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="p-4 space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4">
        <button className="px-4 py-2 border rounded bg-blue-100">Single Backtest</button>
        <button className="px-4 py-2 border rounded bg-blue-100">Batch Backtest</button>
        <button className="px-4 py-2 border rounded bg-blue-100">Create Strategy</button>
      </div>

      {/* Backtest Controls */}
      <div className="border p-4 rounded space-y-2">
        <h3 className="font-semibold">Run Backtests</h3>

        <label className="flex flex-col">
          <span>Symbol</span>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border p-1 rounded"
          >
            {options.symbols?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span>Strategy</span>
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

        <label className="flex flex-col">
          <span>Timeframe</span>
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

        <label className="flex flex-col">
          <span>Balance</span>
          <input
            type="number"
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col">
          <span>Risk</span>
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

        <label className="flex flex-col">
          <span>Position Side</span>
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="border p-1 rounded"
          >
            {options.positions?.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span>Take Profit</span>
          <input
            type="number"
            value={selectedTP}
            onChange={(e) => setSelectedTP(Number(e.target.value))}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col">
          <span>Stop Loss</span>
          <input
            type="number"
            value={selectedSL}
            onChange={(e) => setSelectedSL(Number(e.target.value))}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col">
          <span>Start Date</span>
          <input
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col">
          <span>End Date</span>
          <input
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
            className="border p-1 rounded"
          />
        </label>

        <div className="flex space-x-2 mt-2">
          <button
            onClick={handleRunBacktest}
            disabled={loadingSingle}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            {loadingSingle ? "Running..." : "Run Single Backtest"}
          </button>

          <button
            onClick={handleRunBatch}
            disabled={loadingBatch}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {loadingBatch ? "Running..." : "Run Batch Backtests"}
          </button>
        </div>
      </div>

      {/* Strategy Creator */}
      <div className="border p-4 rounded space-y-2">
        <h3 className="font-semibold">Create New Strategy</h3>
        <label className="flex flex-col">
          <span>Strategy Name</span>
          <input
            type="text"
            value={newStrategyName}
            onChange={(e) => setNewStrategyName(e.target.value)}
            className="border p-1 rounded"
          />
        </label>

        {renderNewStrategyParams()}

        <div className="flex space-x-2 mt-2">
          <button
            onClick={handleAddParamField}
            className="px-3 py-1 bg-gray-300 rounded text-sm"
          >
            + Add Param
          </button>

          <button
            onClick={handleCreateStrategy}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Create Strategy
          </button>
        </div>

        {strategyMessage && <p className="text-sm mt-1">{strategyMessage}</p>}
      </div>

      {/* Current Backtest */}
      {currentBacktest && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold">Current Backtest</h3>
          {renderChart(currentBacktest.equityCurve)}
          {renderSummary(currentBacktest)}
        </div>
      )}

      {/* Batch Results */}
      {batchResults?.length > 0 && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="font-semibold">Batch Results</h3>
          {batchResults.map((bt, idx) => (
            <div key={idx} className="mt-2">
              <h4 className="font-medium">{bt.strategyName}</h4>
              {renderChart(bt.equityCurve, "#82ca9d")}
              {renderSummary(bt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
