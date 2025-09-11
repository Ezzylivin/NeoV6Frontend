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

  const [activeTab, setActiveTab] = useState("backtests");

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

  /**
   * Sync options provided by the hook into local state.
   * Also pre-select sensible defaults (first items) if nothing chosen.
   */
  useEffect(() => {
    if (!hookOptions) return;
    setOptions(hookOptions);

    const last = JSON.parse(localStorage.getItem("lastBacktestParams"));
    if (last) {
      setSelectedSymbol(last.selectedSymbol || hookOptions.symbols?.[0] || "");
      setSelectedStrategy(last.selectedStrategy || hookOptions.strategies?.[0]?.name || "");
      setSelectedTimeframe(last.selectedTimeframe || hookOptions.timeframes?.[0] || "1h");
      setSelectedBalance(last.selectedBalance || hookOptions.balances?.[0] || 1000);
      setSelectedRisk(last.selectedRisk || hookOptions.risks?.[0] || "Medium");
      setSelectedPosition(last.selectedPosition || hookOptions.positions?.[0] || "Both");
      setSelectedStartDate(last.selectedStartDate || "");
      setSelectedEndDate(last.selectedEndDate || "");
    } else {
      setSelectedSymbol(hookOptions.symbols?.[0] || "");
      setSelectedStrategy(hookOptions.strategies?.[0]?.name || "");
      setSelectedTimeframe(hookOptions.timeframes?.[0] || "1h");
      setSelectedBalance(hookOptions.balances?.[0] || 1000);
      setSelectedRisk(hookOptions.risks?.[0] || "Medium");
      setSelectedPosition(hookOptions.positions?.[0] || "Both");
    }
  }, [hookOptions]);

  /**
   * When selected strategy changes, initialize strategyParams with defaults
   * and show beginner-friendly description + example if available.
   */
  useEffect(() => {
    if (!selectedStrategy) return;
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    const defaults = {};
    if (strat?.params) {
      Object.keys(strat.params).forEach((key) => {
        // prefer explicit default value, fallback to 0
        defaults[key] = strat.params[key]?.default ?? 0;
      });
    }
    setStrategyParams(defaults);
  }, [selectedStrategy, options.strategies]);

  /**
   * Auto adjust start/end dates when symbol/timeframe changes and we have availability info
   */
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe) return;
    const available = options.availableDates?.[selectedSymbol]?.[selectedTimeframe];
    if (!available) return;
    setSelectedStartDate(available.start);
    setSelectedEndDate(available.end);
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  /**
   * Render parameter inputs for the Strategy Creator (newStrategyParams)
   * and include the user-friendly description and an example.
   */
  const renderNewStrategyParams = () =>
    Object.keys(newStrategyParams).map((key) => {
      // Try to find a description/example from the currently selected strategy template
      const template = options.strategies?.find((s) => s.name === selectedStrategy);
      const paramInfo = template?.params?.[key] ?? {};
      const desc = paramInfo?.description || "Adjust this parameter to change strategy behavior.";
      // Prefer an explicit example field; otherwise show the default value as the example
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

  /**
   * Helper to render parameter inputs for the selected strategy inside the Backtests form.
   * Shows description + example next to each parameter.
   */
  const renderSelectedStrategyParams = () =>
    Object.keys(strategyParams).map((key) => {
      const strat = options.strategies?.find((s) => s.name === selectedStrategy);
      const paramInfo = strat?.params?.[key] ?? {};
      const desc = paramInfo?.description || "Adjust this parameter.";
      const example =
        paramInfo?.example !== undefined ? `Example: ${paramInfo.example}` : paramInfo?.default !== undefined ? `Example: ${paramInfo.default}` : "";
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
        // refresh options from backend to include the newly created strategy
        try {
          const updated = await axios.get("/backtests/options");
          const payload = updated.data || updated.data?.data || updated;
          setOptions(payload);
        } catch (refreshErr) {
          // ignore - the new strategy will appear on next load
        }
      } else {
        setStrategyMessage("❌ Error creating strategy.");
      }
    } catch (err) {
      console.error(err);
      setStrategyMessage("❌ Network error while saving strategy.");
    }
  };

  /**
   * Preview a strategy quickly (lightweight preview endpoint expected)
   */
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

  /**
   * Run a single backtest (uses hook's runBacktest)
   */
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

  /**
   * Run a batch of backtests (one per saved strategy by default)
   */
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

  /**
   * Generic chart renderer that detects whether data uses `equity` or `balance`.
   */
  const renderChart = (data) => {
    if (!data || !data.length) return <p className="text-sm text-gray-500">No equity data.</p>;
    const sample = data[0] || {};
    const key = "equity" in sample ? "equity" : "balance" in sample ? "balance" : Object.keys(sample).find(k => typeof sample[k] === "number") || "value";
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={(t) => {
            try { return new Date(t).toLocaleString(); } catch { return t; }
          }} />
          <YAxis />
          <Tooltip labelFormatter={(l) => (l ? new Date(l).toLocaleString() : l)} />
          <Legend />
          <Line type="monotone" dataKey={key} stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderSummary = (bt) => {
    if (!bt) return null;
    const final = bt.equityCurve?.slice(-1)[0]?.equity ?? bt.equityCurve?.slice(-1)[0]?.balance ?? bt.metrics?.finalBalance ?? 0;
    const trades = bt.trades?.length ?? 0;
    const maxDd = bt.metrics?.maxDrawdown ?? bt.metrics?.maxDrawdownPct ?? 0;
    const netProfit = bt.metrics?.netProfit ?? bt.metrics?.profit ?? 0;
    return (
      <table className="w-full mt-2 text-sm border border-gray-300">
        <tbody>
          <tr>
            <td className="border p-1 font-semibold">Trades</td>
            <td className="border p-1">{trades}</td>
          </tr>
          <tr>
            <td className="border p-1 font-semibold">Final Balance</td>
            <td className="border p-1">${Number(final).toFixed(2)}</td>
          </tr>
          <tr>
            <td className="border p-1 font-semibold">Max Drawdown</td>
            <td className="border p-1">{Number(maxDd).toFixed(2)}%</td>
          </tr>
          <tr>
            <td className="border p-1 font-semibold">Net Profit</td>
            <td className="border p-1">${Number(netProfit).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Backtesting</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b pb-2">
        <button
          onClick={() => setActiveTab("backtests")}
          className={`py-2 px-4 ${activeTab === "backtests" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
        >
          Backtests
        </button>
        <button
          onClick={() => setActiveTab("strategies")}
          className={`py-2 px-4 ${activeTab === "strategies" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
        >
          Strategies
        </button>
      </div>

      {/* Backtests Tab */}
      {activeTab === "backtests" && (
        <>
          <div className="border p-4 rounded space-y-2">
            <h3 className="font-semibold">Run Backtests</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium">Symbol</span>
                <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="border p-1 rounded">
                  {options.symbols?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium">Strategy</span>
                <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)} className="border p-1 rounded">
                  {options.strategies?.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium">Timeframe</span>
                <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} className="border p-1 rounded">
                  {options.timeframes?.map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* render selected strategy params with descriptions */}
            <div className="mt-3 space-y-2">
              {renderSelectedStrategyParams()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <label className="flex flex-col">
                <span className="text-sm font-medium">Balance</span>
                <input type="number" value={selectedBalance} onChange={(e) => setSelectedBalance(Number(e.target.value))} className="border p-1 rounded" />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium">Risk</span>
                <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)} className="border p-1 rounded">
                  {options.risks?.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium">Position</span>
                <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="border p-1 rounded">
                  {options.positions?.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <label className="flex flex-col">
                <span className="text-sm font-medium">Start Date</span>
                <input type="date" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} className="border p-1 rounded" />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium">End Date</span>
                <input type="date" value={selectedEndDate} onChange={(e) => setSelectedEndDate(e.target.value)} className="border p-1 rounded" />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium">Take Profit (%)</span>
                <input type="number" value={selectedTP} onChange={(e) => setSelectedTP(e.target.value)} className="border p-1 rounded" />
              </label>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="space-x-2">
                <button onClick={handleRunBacktest} disabled={loadingSingle} className="px-4 py-2 bg-green-600 text-white rounded">
                  {loadingSingle ? "Running..." : "Run Single Backtest"}
                </button>
                <button onClick={handleRunBatch} disabled={loadingBatch} className="px-4 py-2 bg-purple-600 text-white rounded">
                  {loadingBatch ? "Running Batch..." : "Run Batch Backtests"}
                </button>
              </div>

              <div className="text-sm text-gray-500">
                Realism: {realism.useNews ? "News " : ""}{realism.useSlippage ? "Slippage " : ""}{realism.useSpread ? "Spread" : ""}
              </div>
            </div>
          </div>

          {/* Current Backtest Chart & Summary */}
          {currentBacktest && (
            <div className="border p-4 rounded">
              <h3 className="font-semibold">Single Backtest Result</h3>
              {renderChart(currentBacktest.equityCurve)}
              {renderSummary(currentBacktest)}
            </div>
          )}

          {/* Batch Backtest Results */}
          {batchResults?.length > 0 && (
            <div className="border p-4 rounded">
              <h3 className="font-semibold">Batch Backtest Results</h3>
              <div className="space-y-3">
                {batchResults.map((bt, idx) => (
                  <div key={idx} className="p-2 border rounded bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{bt.strategy?.name || `Strategy ${idx + 1}`}</div>
                      <div className="text-sm text-gray-600">Profit: ${Number(bt.metrics?.netProfit ?? bt.profit ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="mt-2">{renderChart(bt.equityCurve)}</div>
                    <div className="mt-2">{renderSummary(bt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Strategies Tab */}
      {activeTab === "strategies" && (
        <>
          <div className="border p-4 rounded space-y-2">
            <h3 className="font-semibold">Create / Preview Strategy</h3>

            <label className="flex flex-col">
              <span className="text-sm font-medium">Strategy Name</span>
              <input type="text" value={newStrategyName} onChange={(e) => setNewStrategyName(e.target.value)} placeholder="Enter strategy name" className="border p-1 rounded w-full" />
            </label>

            {/* Show parameter editor for new strategy */}
            <div className="mt-2">{renderNewStrategyParams()}</div>

            <div className="flex space-x-2 mt-3">
              <button onClick={handleAddNewStrategyParam} className="px-3 py-1 bg-gray-300 rounded">Add Param</button>
              <button onClick={handleCreateStrategy} className="px-3 py-1 bg-green-600 text-white rounded">Save Strategy</button>
              <button onClick={handlePreviewStrategy} className="px-3 py-1 bg-yellow-500 text-white rounded">{loadingPreview ? "Previewing..." : "Preview Strategy"}</button>
            </div>

            {strategyMessage && <p className="mt-2">{strategyMessage}</p>}
          </div>

          {/* Preview Results */}
          {previewBacktest && (
            <div className="border p-4 rounded">
              <h3 className="font-semibold">Preview Results</h3>
              {renderChart(previewBacktest.equityCurve || previewBacktest.equity || previewBacktest.data)}
              <pre className="mt-2 text-sm bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(previewBacktest.metrics ?? previewBacktest.summary ?? previewBacktest, null, 2)}</pre>
            </div>
          )}

          {/* List available built-in strategy parameter descriptions (beginner-friendly examples) */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold">Parameter Help (examples)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {options.strategies?.map((s) => (
                <div key={s.name} className="p-2 border rounded">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-600 mt-1">Beginner-friendly parameter descriptions and examples:</div>
                  <ul className="mt-2 text-sm space-y-1">
                    {s.params && Object.keys(s.params).length ? (
                      Object.keys(s.params).map((k) => {
                        const p = s.params[k];
                        const example = p.example !== undefined ? p.example : p.default !== undefined ? p.default : "";
                        return (
                          <li key={k}>
                            <strong>{k}:</strong> {p.description ?? "No description provided."} {example ? <span className="text-gray-500"> (Example: {example})</span> : null}
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-sm text-gray-500">No parameter info available for this strategy.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
