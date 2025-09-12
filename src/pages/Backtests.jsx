// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Backtests() {
  const { user } = useAuth();
  const userId = user?.id;

  // Use state and functions directly from the hook for a single source of truth
  const {
    options,
    loadingSingle,
    error,
    currentBacktest,
    runBacktest,
    runBatchBacktests, // Assuming this will be added to the hook
    defaultRealism,
  } = useBacktest();

  const [loadingBatch, setLoadingBatch] = useState(false);

  // Form selections managed by the component's state
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(10000);
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedPosition, setSelectedPosition] = useState("Both");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [strategyParams, setStrategyParams] = useState({});
  const [realism, setRealism] = useState(defaultRealism);
  const [activeTab, setActiveTab] = useState("presets");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchStrategies, setSelectedBatchStrategies] = useState([]);

  const beginnerPresets = [
    { name: "Conservative BTC Swing", symbol: "BTC/USDT", strategy: { name: "SMA", type: "SMA" }, timeframe: "4h", balance: 10000, risk: "Low", position: "Long Only", takeProfit: 5, stopLoss: 2, params: { fast: 10, slow: 50 } },
    { name: "Aggressive ETH Day Trade", symbol: "ETH/USDT", strategy: { name: "RSI", type: "RSI" }, timeframe: "1h", balance: 10000, risk: "High", position: "Both", takeProfit: 10, stopLoss: 5, params: { period: 14, overbought: 70, oversold: 30 } },
  ];

  // Effect to populate form with default options from the hook
  useEffect(() => {
    if (!options) return;
    setSelectedSymbol(options.symbols?.[0] || "");
    setSelectedStrategy(options.strategies?.[0]?.name || "");
    setSelectedTimeframe(options.timeframes?.[0] || "1h");
    setSelectedBalance(options.balances?.[0] || 10000);
    setSelectedRisk(options.risks?.[0] || "Medium");
    setSelectedPosition(options.positions?.[0] || "Both");
  }, [options]);

  // Effect to update strategy parameters when the selected strategy changes
  useEffect(() => {
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (strat?.params) {
        setStrategyParams(strat.params);
    }
  }, [selectedStrategy, options.strategies]);

  const applyPreset = (preset) => {
    setSelectedSymbol(preset.symbol);
    setSelectedStrategy(preset.strategy.name);
    setSelectedTimeframe(preset.timeframe);
    setSelectedBalance(preset.balance);
    setSelectedRisk(preset.risk);
    setSelectedPosition(preset.position);
    setSelectedTP(preset.takeProfit);
    setSelectedSL(preset.stopLoss);
    setStrategyParams(preset.params);
    setActiveTab('strategy'); // Switch to strategy tab after applying
  };
  
  const handleRunBacktest = async () => {
    if (!userId) return alert("Login required to run backtests.");
    const matched = options.strategies?.find((s) => s.name === selectedStrategy) || {};
    const payload = {
      userId,
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      initialBalance: Number(selectedBalance),
      strategy: {
        name: matched.name,
        type: matched.strategyType,
        parameters: strategyParams,
      },
      risk: selectedRisk,
      takeProfit: selectedTP,
      stopLoss: selectedSL,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      positionSide: selectedPosition,
      ...realism
    };
    try {
      await runBacktest(payload);
    } catch (err) {
      console.error("Backtest failed:", err);
      // You can show a toast notification here
    }
  };

  const formatTimestamp = (ts) => (ts ? new Date(ts).toLocaleDateString() : "");

  const renderChart = (data) => {
    if (!data || data.length < 2) return <p className="text-center text-gray-500 mt-4">Not enough data to display chart.</p>;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
            <YAxis domain={['dataMin', 'dataMax']} allowDecimals={false} />
            <ChartTooltip labelFormatter={formatTimestamp} formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">Backtester</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          {/* Tabs */}
          <div className="flex space-x-1 border-b mb-4">
            {['presets', 'strategy', 'advanced'].map(tabName => (
              <button
                key={tabName}
                className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tabName ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab(tabName)}
              >
                {tabName}
              </button>
            ))}
          </div>

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Beginner Presets
                <select
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  onChange={(e) => {
                    const preset = beginnerPresets.find((p) => p.name === e.target.value);
                    if (preset) applyPreset(preset);
                  }}
                >
                  <option value="">Select a preset...</option>
                  {beginnerPresets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* Strategy Tab */}
          {activeTab === 'strategy' && (
            <div className="space-y-4">
              {/* All form controls will go here */}
              <label className="block text-sm font-medium text-gray-700">Symbol
                <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  {options.symbols.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">Strategy
                <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  {options.strategies.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </label>
              {/* Dynamic parameters render here */}
            </div>
          )}
          
          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
             <div className="space-y-3">
                <h3 className="text-md font-medium text-gray-900">Realism Settings</h3>
                <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={realism.useSlippage} onChange={(e) => setRealism({ ...realism, useSlippage: e.target.checked })} className="rounded"/>
                    <span>Use Slippage</span>
                </label>
                 <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={realism.useSpread} onChange={(e) => setRealism({ ...realism, useSpread: e.target.checked })} className="rounded"/>
                    <span>Use Spread</span>
                </label>
             </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleRunBacktest}
              disabled={loadingSingle}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loadingSingle ? "Running..." : "Run Backtest"}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Results</h2>
          {loadingSingle && <p>Loading results...</p>}
          {currentBacktest ? (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
                  <div><p className="text-sm text-gray-500">Final Balance</p><p className="text-lg font-semibold">${currentBacktest.finalBalance?.toFixed(2)}</p></div>
                  <div><p className="text-sm text-gray-500">Net Profit</p><p className="text-lg font-semibold">${currentBacktest.profit?.toFixed(2)}</p></div>
                  <div><p className="text-sm text-gray-500">Win Rate</p><p className="text-lg font-semibold">{currentBacktest.metrics?.winRate?.toFixed(1)}%</p></div>
                  <div><p className="text-sm text-gray-500">Total Trades</p><p className="text-lg font-semibold">{currentBacktest.totalTrades}</p></div>
              </div>
              {renderChart(currentBacktest.equityCurve)}
            </div>
          ) : (
            <p className="text-center text-gray-500 pt-16">Run a backtest to see results here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
