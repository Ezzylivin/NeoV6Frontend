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
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  // Preview results
  const [previewBacktest, setPreviewBacktest] = useState(null);

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
      const example = strat?.params?.[key]?.example !== undefined ? `Example: ${strat.params[key].example}` : "";
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
          <p className="text-xs text-gray-500">{desc} {example}</p>
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

  // Preview strategy
  const handlePreviewStrategy = async () => {
    if (!userId) return alert("Login required to preview strategy.");
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategy: { name: newStrategyName || selectedStrategy, parameters: newStrategyParams },
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
      setLoadingPreview(true);
      const response = await axios.post("/backtests/preview-strategy", payload);
      setPreviewBacktest(response.data);
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setLoadingPreview(false);
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
    setLoadingSingle(true);
    try {
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
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setLoadingSingle(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backtest Controls */}
      <div className="border p-4 rounded space-y-2">
        <h3 className="font-semibold">Run Backtests</h3>

        <label>
          Symbol
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
            {options.symbols?.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          Strategy
          <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
            {options.strategies?.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>

        <label>
          Timeframe
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </label>

        <label>
          Balance
          <input type="number" value={selectedBalance} onChange={(e) => setSelectedBalance(Number(e.target.value))} />
        </label>

        <label>
          Risk
          <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
            {options.risks?.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <button
          onClick={handleRunBacktest}
          className="px-4 py-2 bg-blue-500 text-white rounded"
          disabled={loadingSingle}
        >
          {loadingSingle ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {/* Strategy Creator */}
      <div className="border p-4 rounded space-y-2">
        <h3 className="font-semibold">Create / Preview Strategy</h3>
        <label>
          Strategy Name
          <input
            type="text"
            value={newStrategyName}
            onChange={(e) => setNewStrategyName(e.target.value)}
            placeholder="Enter strategy name"
            className="border p-1 rounded w-full"
          />
        </label>

        {renderNewStrategyParams()}

        <div className="flex space-x-2 mt-2">
          <button
            onClick={handleAddParamField}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            Add Param
          </button>
          <button
            onClick={handleCreateStrategy}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Save Strategy
          </button>
          <button
            onClick={handlePreviewStrategy}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
          >
            {loadingPreview ? "Previewing..." : "Preview Strategy"}
          </button>
        </div>

        {strategyMessage && <p className="mt-2">{strategyMessage}</p>}
      </div>

      {/* Preview Results */}
      {previewBacktest && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold">Preview Results</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={previewBacktest.equityCurve}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <CartesianGrid stroke="#f0f0f0" />
              <Line type="monotone" dataKey="balance" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
          <pre className="mt-2 text-sm">{JSON.stringify(previewBacktest.summary, null, 2)}</pre>
        </div>
      )}

      {/* Current Backtest Results */}
      {currentBacktest && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold">Backtest Results</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentBacktest.equityCurve}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <CartesianGrid stroke="#f0f0f0" />
              <Line type="monotone" dataKey="balance" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Batch Backtest Results */}
      {batchResults?.length > 0 && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold">Batch Backtest Results</h3>
          <ul>
            {batchResults.map((res, idx) => (
              <li key={idx}>{res.strategy}: {res.profit.toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
