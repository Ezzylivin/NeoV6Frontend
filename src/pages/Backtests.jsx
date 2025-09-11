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
  BarChart,
  Bar,
  Cell,
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

  // Local state for selectors
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

  // New strategy state
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyParams, setNewStrategyParams] = useState({ param1: 0 });
  const [strategyMessage, setStrategyMessage] = useState("");

  const [previewBacktest, setPreviewBacktest] = useState(null);
  const [activeTab, setActiveTab] = useState("backtests");

  // Sync hook options to local state
  useEffect(() => {
    if (!hookOptions) return;

    setOptions(hookOptions);

    // Set defaults from localStorage or first available
    const last = JSON.parse(localStorage.getItem("lastBacktestParams") || "{}");
    setSelectedSymbol(last.selectedSymbol || hookOptions.symbols?.[0] || "");
    setSelectedStrategy(last.selectedStrategy || hookOptions.strategies?.[0]?.name || "");
    setSelectedTimeframe(last.selectedTimeframe || hookOptions.timeframes?.[0] || "1h");
    setSelectedBalance(last.selectedBalance || hookOptions.balances?.[0] || 1000);
    setSelectedRisk(last.selectedRisk || hookOptions.risks?.[0] || "Medium");
    setSelectedPosition(last.selectedPosition || hookOptions.positions?.[0] || "Both");
    setSelectedTP(last.selectedTP || hookOptions.takeProfits?.[0] || "");
    setSelectedSL(last.selectedSL || hookOptions.stopLosses?.[0] || "");
  }, [hookOptions]);

  // Update strategy params when selection changes
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (!strat?.params) {
      setStrategyParams({});
      return;
    }
    const defaults = {};
    Object.keys(strat.params).forEach((k) => {
      defaults[k] = strat.params[k]?.default ?? 0;
    });
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  // Auto adjust dates if available
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // New strategy param handling
  const renderNewStrategyParams = () =>
    Object.keys(newStrategyParams).map((key) => {
      const template = options.strategies?.find((s) => s.name === selectedStrategy);
      const paramInfo = template?.params?.[key] ?? {};
      const desc = paramInfo?.description || "Adjust this parameter.";
      const example =
        paramInfo?.example !== undefined
          ? `Example: ${paramInfo.example}`
          : paramInfo?.default !== undefined
          ? `Example: ${paramInfo.default}`
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
            onChange={(e) =>
              setNewStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
            }
            className="border p-1 rounded w-full"
          />
          <p className="text-xs text-gray-500">{desc} {example}</p>
        </div>
      );
    });

  const renderSelectedStrategyParams = () =>
    Object.keys(strategyParams).map((key) => {
      const strat = options.strategies?.find((s) => s.name === selectedStrategy);
      const paramInfo = strat?.params?.[key] ?? {};
      const desc = paramInfo?.description || "Adjust this parameter.";
      const example =
        paramInfo?.example !== undefined
          ? `Example: ${paramInfo.example}`
          : paramInfo?.default !== undefined
          ? `Example: ${paramInfo.default}`
          : "";
      return (
        <div key={key} className="flex flex-col mt-1">
          <label className="text-sm">
            <div className="flex justify-between items-center">
              <span>{key}</span>
              <span className="text-xs text-gray-500">{example}</span>
            </div>
            <div className="text-xs text-gray-500 mb-1">{desc}</div>
            <input
              type="number"
              value={strategyParams[key]}
              onChange={(e) =>
                setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
              }
              className="border p-1 rounded w-full"
            />
          </label>
        </div>
      );
    });

  const handleAddNewStrategyParam = () => {
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
      if (response?.data?.success) {
        setStrategyMessage("✅ Strategy created! It will appear in the dropdown.");
        setNewStrategyName("");
        setNewStrategyParams({ param1: 0 });
        try {
          const updated = await axios.get("/backtests/options");
          const payload = updated.data || updated.data?.data || updated;
          setOptions(payload);
        } catch {}
      } else {
        setStrategyMessage("❌ Error creating strategy.");
      }
    } catch (err) {
      console.error(err);
      setStrategyMessage("❌ Network error while saving strategy.");
    }
  };

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
      const res = await axios.post("/backtests/preview-strategy", payload);
      setPreviewBacktest(res.data || res);
    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewBacktest(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRunBacktest = async () => {
    if (!userId) return alert("Login required to run backtests.");
    const matched = options.strategies?.find((s) => s.name === selectedStrategy) || {};
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance) || 1000,
      strategyId: matched._id || null,
      strategy: { name: matched.name || selectedStrategy, parameters: strategyParams },
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
          selectedTP,
          selectedSL,
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
    })) || [];

    try {
      setLoadingBatch(true);
      await runBatchBacktests({ paramCombos });
    } catch (err) {
      console.error("Batch failed:", err);
    } finally {
      setLoadingBatch(false);
    }
  };

  const formatTimestamp = (ts) => (ts ? new Date(ts).toLocaleString() : "");

  const renderChart = (data) => {
    if (!data || !data.length) return null;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
          <YAxis />
          <Tooltip labelFormatter={formatTimestamp} />
          <Legend />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="balance" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderBatchChart = (batchData) => {
    if (!batchData || !batchData.length) return null;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={batchData}>
          <XAxis dataKey="strategy" />
          <YAxis />
          <Tooltip />
          <Legend />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <Bar dataKey="finalBalance">
            {batchData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill="#82ca9d" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Backtests</h1>

      {/* Tabs */}
      <div className="flex space-x-2">
        <button
          className={`px-4 py-2 rounded ${activeTab === "backtests" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("backtests")}
        >
          Single Backtest
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "batch" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("batch")}
        >
          Batch Backtests
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "strategy" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("strategy")}
        >
          New Strategy
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "backtests" && (
        <div className="space-y-2">
          <label>
            Symbol
            <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
              {options.symbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Strategy
            <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
              {options.strategies.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </label>
          {renderSelectedStrategyParams()}

          <label>
            Timeframe
            <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
              {options.timeframes.map((tf) => (
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
              {options.risks.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Position
            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
              {options.positions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Take Profit
            <select value={selectedTP} onChange={(e) => setSelectedTP(e.target.value)}>
              {options.takeProfits.map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </label>
          <label>
            Stop Loss
            <select value={selectedSL} onChange={(e) => setSelectedSL(e.target.value)}>
              {options.stopLosses.map((sl) => (
                <option key={sl} value={sl}>{sl}</option>
              ))}
            </select>
          </label>
          <div className="space-x-2 mt-2">
            <button
              onClick={handleRunBacktest}
              disabled={loadingSingle}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              {loadingSingle ? "Running..." : "Run Backtest"}
            </button>
            <button
              onClick={handlePreviewStrategy}
              disabled={loadingPreview}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              {loadingPreview ? "Previewing..." : "Preview Strategy"}
            </button>
          </div>

          {previewBacktest && (
            <div className="mt-4">
              <h2 className="font-bold">Strategy Preview</h2>
              {renderChart(previewBacktest.balanceOverTime)}
            </div>
          )}

          {currentBacktest && (
            <div className="mt-4">
              <h2 className="font-bold">Backtest Result</h2>
              {renderChart(currentBacktest.balanceOverTime)}
            </div>
          )}
        </div>
      )}

      {activeTab === "batch" && (
        <div className="space-y-2">
          <button
            onClick={handleRunBatch}
            disabled={loadingBatch}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            {loadingBatch ? "Running Batch..." : "Run Batch Backtests"}
          </button>
          {batchResults && batchResults.length > 0 && (
            <div className="mt-4">
              <h2 className="font-bold">Batch Results</h2>
              {renderBatchChart(batchResults)}
            </div>
          )}
        </div>
      )}

      {activeTab === "strategy" && (
        <div className="space-y-2">
          <label>
            Strategy Name
            <input
              type="text"
              value={newStrategyName}
              onChange={(e) => setNewStrategyName(e.target.value)}
              className="border p-1 rounded w-full"
            />
          </label>
          {renderNewStrategyParams()}
          <button
            onClick={handleAddNewStrategyParam}
            className="px-3 py-1 bg-gray-300 rounded text-sm mt-2"
          >
            + Add Parameter
          </button>
          <div className="mt-2 space-x-2">
            <button
              onClick={handleCreateStrategy}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Create Strategy
            </button>
            <button
              onClick={handlePreviewStrategy}
              disabled={loadingPreview}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              {loadingPreview ? "Previewing..." : "Preview Strategy"}
            </button>
          </div>
          {strategyMessage && <p className="mt-2 text-sm">{strategyMessage}</p>}
          {previewBacktest && (
            <div className="mt-4">
              <h2 className="font-bold">Strategy Preview</h2>
              {renderChart(previewBacktest.balanceOverTime)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
