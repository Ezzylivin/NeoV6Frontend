import React, { useState, useEffect, createContext, useContext } from "react";
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



const useBacktest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const defaultRealism = { useSlippage: true, useSpread: true, useNews: false, slippage_bps: 10, randomEventProb: 0.1 };
  
  // A helper to generate mock equity curves based on a start balance
  const generateMockEquityCurve = (initialBalance) => {
    const data = [];
    let currentEquity = initialBalance;
    const time = new Date("2023-01-01T00:00:00Z");
    for (let i = 0; i < 12; i++) {
      currentEquity += (Math.random() - 0.5) * currentEquity * 0.1; // Random growth/loss
      data.push({ time: new Date(time).toISOString(), equity: currentEquity });
      time.setMonth(time.getMonth() + 1);
    }
    return data;
  };
  
  // A helper to calculate mock metrics
  const calculateMetrics = (equityCurve, initialBalance) => {
    if (!equityCurve || equityCurve.length === 0) {
      return { finalBalance: initialBalance, netProfit: 0, winRate: 0, totalTrades: 0 };
    }

    const finalBalance = equityCurve[equityCurve.length - 1].equity;
    const netProfit = finalBalance - initialBalance;
    const totalTrades = Math.floor(Math.random() * 50) + 10;
    const winRate = Math.random() * 100;

    return {
      finalBalance,
      netProfit,
      winRate: isNaN(winRate) ? 0 : winRate,
      totalTrades,
      maxDrawdown: Math.random() * 20,
    };
  };

  const runBacktest = async (payload) => {
    setLoading(true);
    setError(null);
    setCurrentBacktest(null);
    setBatchResults([]);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Generate new mock data for each run
    const equityCurve = generateMockEquityCurve(payload.initialBalance);
    const metrics = calculateMetrics(equityCurve, payload.initialBalance);

    const result = {
      ...payload,
      ...metrics,
      equityCurve,
      trades: [], // Simplified for this example
    };

    setLoading(false);
    setCurrentBacktest(result);
  };

  const runBatchBacktests = async (payload) => {
    setLoading(true);
    setError(null);
    setCurrentBacktest(null);
    setBatchResults([]);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Generate new mock data for each batch
    const results = payload.paramCombos.map(combo => {
      const equityCurve = generateMockEquityCurve(combo.initialBalance);
      const metrics = calculateMetrics(equityCurve, combo.initialBalance);
      return {
        ...combo,
        ...metrics,
        equityCurve,
        trades: [],
      };
    });

    setLoading(false);
    setBatchResults(results);
  };

  return {
    options: mockOptions,
    loading,
    error,
    currentBacktest,
    runBacktest,
    batchResults,
    runBatchBacktests,
    defaultRealism,
  };
};

// --- A single function to create the backtest payload, reducing code duplication. ---
const createPayload = (userId, state, options) => {
  const { selectedSymbol, selectedTimeframe, selectedBalance, selectedStrategy,
    selectedRisk, selectedTP, selectedSL, selectedPosition, selectedStartDate, selectedEndDate,
    strategyParams, realism } = state;

  const strat = options.strategies?.find((s) => s.name === selectedStrategy);

  return {
    userId,
    symbol: selectedSymbol,
    timeframe: selectedTimeframe,
    initialBalance: selectedBalance > 0 ? selectedBalance : 1000,
    strategyId: strat?._id || null,
    strategy: { name: strat?.name || selectedStrategy, parameters: strategyParams },
    risk: selectedRisk || "Medium",
    takeProfit: selectedTP ?? undefined,
    stopLoss: selectedSL ?? undefined,
    startDate: selectedStartDate || undefined,
    endDate: selectedEndDate || undefined,
    useNews: realism.useNews,
    useSlippage: realism.useSlippage,
    useSpread: realism.useSpread,
    useRandomEvents: realism.useRandomEvents ?? realism.randomEventProb > 0,
    baseSlippageBps: realism.slippage_bps,
    positionSide: selectedPosition || "Both",
    tradeConfig: {},
  };
};

export default function Backtests() {
  const { user } = useAuth();
  const userId = user?.id;

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

  // --- State for all backtest controls ---
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(10000);
  const [selectedRisk, setSelectedRisk] = useState("");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [strategyParams, setStrategyParams] = useState({});
  const [realism, setRealism] = useState(defaultRealism);
  const [activeTab, setActiveTab] = useState("presets");

  // A set of pre-configured options for new users
  const beginnerPresets = [
    { name: "Conservative BTC Swing", symbol: "BTC/USDT", strategy: { name: "SMA", type: "SMA" }, timeframe: "4h", balance: 10000, risk: "Low", position: "Long Only", takeProfit: 5, stopLoss: 2, params: { fast: 10, slow: 50 } },
    { name: "Aggressive ETH Day Trade", symbol: "ETH/USDT", strategy: { name: "RSI", type: "RSI" }, timeframe: "1h", balance: 10000, risk: "High", position: "Both", takeProfit: 10, stopLoss: 5, params: { period: 14, overbought: 70, oversold: 30 } },
  ];

  // --- Effects to auto-populate form with defaults from the backend ---
  useEffect(() => {
    if (!options) return;
    setSelectedSymbol(options.symbols?.[0] || "");
    setSelectedStrategy(options.strategies?.[0]?.name || "");
    setSelectedTimeframe(options.timeframes?.[0] || "1h");
    setSelectedBalance(options.balances?.[0] || 10000);
    setSelectedRisk(options.risks?.[0] || "Medium");
    setSelectedPosition(options.positions?.[0] || "Both");
    
    // Set initial strategy parameters
    const initialStrat = options.strategies?.find((s) => s.name === options.strategies[0].name);
    setStrategyParams(initialStrat?.parameters || {});
  }, [options]);

  useEffect(() => {
    const strat = options.strategies?.find((s) => s.name === selectedStrategy);
    if (strat?.parameters) {
      setStrategyParams(strat.parameters);
    }
  }, [selectedStrategy, options.strategies]);

  // --- Auto-adjust start/end dates based on selected symbol/timeframe ---
  useEffect(() => {
    if (!selectedSymbol || !selectedTimeframe || !options.availableDates) return;
    const available = options.availableDates[selectedSymbol]?.[selectedTimeframe];
    if (available) {
      setSelectedStartDate(available.start);
      setSelectedEndDate(available.end);
    }
  }, [selectedSymbol, selectedTimeframe, options.availableDates]);

  // --- Functions to handle form actions ---
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
    setActiveTab('strategy');
  };

  const handleRunBacktest = async () => {
    if (!userId) {
      alert("Login required to run backtests.");
      return;
    }
    const payload = createPayload(userId, {
      selectedSymbol, selectedTimeframe, selectedBalance, selectedStrategy,
      selectedRisk, selectedTP, selectedSL, selectedPosition, selectedStartDate, selectedEndDate,
      strategyParams, realism
    }, options);

    try {
      await runBacktest(payload);
    } catch (err) {
      console.error("Backtest failed:", err);
    }
  };

  const handleRunBatch = async () => {
    if (!userId) {
      alert("Login required to run batch backtests.");
      return;
    }

    const paramCombos = options.strategies?.map((s) =>
      createPayload(userId, {
        selectedSymbol, selectedTimeframe, selectedBalance, selectedStrategy: s.name,
        selectedRisk, selectedTP, selectedSL, selectedPosition, selectedStartDate, selectedEndDate,
        strategyParams: s.parameters, realism
      }, options)
    );
    
    const payload = { userId, paramCombos };

    try {
      await runBatchBacktests(payload);
    } catch (err) {
      console.error("Batch backtest failed:", err);
    }
  };

  // --- Render helpers for cleaner JSX ---
  const renderStrategyParams = () =>
    Object.keys(strategyParams || {}).map((key) => (
      <label key={key} className="flex flex-col text-sm font-medium text-gray-700">
        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
        <input
          type="number"
          value={strategyParams[key]}
          onChange={(e) => setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        />
      </label>
    ));

  const renderChart = (data, color = "#8884d8") => {
    if (!data || data.length < 2) return <p className="text-center text-gray-500 mt-4">Not enough data to display chart.</p>;
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['dataMin', 'dataMax']} allowDecimals={false} />
            <ChartTooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="equity" stroke={color} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderSummary = (bt) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
      <div><p className="text-sm text-gray-500">Final Balance</p><p className="text-lg font-semibold">${bt.finalBalance?.toFixed(2) || 0}</p></div>
      <div><p className="text-sm text-gray-500">Net Profit</p><p className="text-lg font-semibold">${bt.netProfit?.toFixed(2) || 0}</p></div>
      <div><p className="text-sm text-gray-500">Win Rate</p><p className="text-lg font-semibold">{bt.winRate?.toFixed(1) || 0}%</p></div>
      <div><p className="text-sm text-gray-500">Total Trades</p><p className="text-lg font-semibold">{bt.totalTrades || 0}</p></div>
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-900">Backtest Dashboard</h1>
      <p className="text-gray-600">Analyze and optimize your trading strategies with historical data.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- Backtest Controls & Settings Panel --- */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-lg">
          
          {/* Tabs */}
          <div className="flex space-x-1 border-b mb-4">
            {['presets', 'strategy', 'advanced'].map(tabName => (
              <button
                key={tabName}
                className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg ${activeTab === tabName ? "border-b-2 border-blue-500 text-blue-600 font-bold" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab(tabName)}
              >
                {tabName}
              </button>
            ))}
          </div>

          {/* Presets Tab Content */}
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

          {/* Strategy Tab Content */}
          {activeTab === 'strategy' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Symbol
                <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  {options.symbols?.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">Strategy
                <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  {options.strategies?.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">Timeframe
                <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  {options.timeframes?.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">Start Date
                  <input type="date" value={selectedStartDate} onChange={(e) => setSelectedStartDate(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" />
                </label>
                <label className="block text-sm font-medium text-gray-700">End Date
                  <input type="date" value={selectedEndDate} onChange={(e) => setSelectedEndDate(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">Balance
                  <input type="number" value={selectedBalance} onChange={(e) => setSelectedBalance(Number(e.target.value))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" />
                </label>
                <label className="block text-sm font-medium text-gray-700">Risk
                  <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    {options.risks?.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">Take Profit
                  <select value={selectedTP || ""} onChange={(e) => setSelectedTP(Number(e.target.value) || null)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="">None</option>
                    {options.takeProfits?.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">Stop Loss
                  <select value={selectedSL || ""} onChange={(e) => setSelectedSL(Number(e.target.value) || null)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="">None</option>
                    {options.stopLosses?.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">Position
                <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  {options.positions?.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {renderStrategyParams()}
              </div>
            </div>
          )}

          {/* Advanced Tab Content */}
          {activeTab === 'advanced' && (
            <div className="space-y-3">
              <h3 className="text-md font-medium text-gray-900">Realism Settings</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={realism.useSlippage} onChange={(e) => setRealism({ ...realism, useSlippage: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Use Slippage</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={realism.useSpread} onChange={(e) => setRealism({ ...realism, useSpread: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Use Spread</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={realism.useNews} onChange={(e) => setRealism({ ...realism, useNews: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>Use News</span>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Slippage Bps:
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={realism.slippage_bps}
                  onChange={(e) => setRealism((prev) => ({ ...prev, slippage_bps: Number(e.target.value) }))}
                  className="border p-1 w-20 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-2">
            <button
              onClick={handleRunBacktest}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {loading ? "Running Single..." : "Run Single Backtest"}
            </button>
            <button
              onClick={handleRunBatch}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              {loading ? "Running Batch..." : "Run Batch Backtests"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* --- Results Panel --- */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4">Backtest Results</h2>
          {loading && <p className="text-center text-gray-500 pt-16">Loading results...</p>}

          {/* Single Backtest Result */}
          {currentBacktest && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800">Current Backtest</h3>
              {renderSummary(currentBacktest)}
              {renderChart(currentBacktest.equityCurve)}
            </div>
          )}

          {/* Batch Backtest Results */}
          {batchResults?.length > 0 && (
            <div className="mt-6 space-y-6">
              <h3 className="font-semibold text-lg text-gray-800">Batch Backtests</h3>
              {batchResults.map((bt, i) => (
                <div key={i} className="border p-4 rounded-lg shadow-sm space-y-2">
                  <h4 className="font-medium text-gray-700">{bt.strategy?.name || `Strategy ${i + 1}`}</h4>
                  {renderSummary(bt)}
                  {renderChart(bt.equityCurve, `hsl(${(i * 60) % 360}, 70%, 50%)`)}
                </div>
              ))}
            </div>
          )}

          {/* Initial state message */}
          {!currentBacktest && !batchResults?.length && !loading && (
            <p className="text-center text-gray-500 pt-16">Run a backtest to see results here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
