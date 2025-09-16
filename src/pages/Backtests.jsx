// ./pages/Backtests.jsx
// UPGRADED:
// 1. Fixed 'toFixed' crash in HistoryTable
// 2. Fixed 'handleRunBatch' to send a 'configs' array

import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useBacktest } from "../hooks/useBacktest.js";

// This sub-component displays the results from a single or batch backtest
const MetricsDisplay = ({ metrics, title = "Latest Result" }) => {
  if (!metrics) return null;
  const formatValue = (value, suffix = '') => {
    if (typeof value === 'number') return `${value.toFixed(2)}${suffix}`;
    return value; 
  };
  const metricItems = [
    { label: "Total Return", value: formatValue(metrics.totalReturn, '%'), color: metrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500' },
    { label: "Win Rate / Sharpe", value: formatValue(metrics.winRate, '') },
    { label: "Total Trades", value: metrics.totalTrades },
  ];
  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-lg">
      <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricItems.map(item => (
          <div key={item.label}>
            <p className="text-sm text-gray-400">{item.label}</p>
            <p className={`text-xl font-bold ${item.color || 'text-white'}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- HistoryTable Component (FIXED) ---
const HistoryTable = ({ backtests, onPageChange }) => {
    if (!backtests || backtests.results.length === 0) {
        return <p className="text-gray-400 text-center mt-6">No past backtests found.</p>;
    }
    return (
        <div className="mt-8 rounded-xl bg-gray-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Backtest History</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-300">
                    <thead className="border-b border-gray-600">
                        <tr>
                            <th className="px-4 py-2">Strategy</th>
                            <th className="px-4 py-2">Symbol</th>
                            <th className="px-4 py-2">Return %</th>
                            <th className="px-4 py-2">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backtests.results.map(bt => {
                        {/* --- 'toFixed' FIX --- */}
                        const initial = bt.initialBalance || 0;
                        const final = bt.finalBalance || 0;
                        let totalReturn = 0;
                        if (initial > 0) {
                            totalReturn = ((final - initial) / initial) * 100;
                        }
                        return (
                            <tr key={bt._id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-medium text-white">{bt.strategy?.name || 'N/A'}</td>
                                <td className="px-4 py-2">{bt.symbol}</td>
                T             <td className={`px-4 py-2 ${totalReturn > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {totalReturn.toFixed(2)}%
                                </td>
                                <td className="px-4 py-2">{new Date(bt.createdAt).toLocaleDateString()}</td>
                            </tr>
                        );
                      })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export default function Backtests() {
  const { options, pastBacktests, loading, error, runNewBacktest, runNewBatchBacktest, getPastBacktests } = useBacktest();
  const [latestResult, setLatestResult] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);
  
  const [form, setForm] = useState({
    strategyId: '',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
    initialBalance: 1000
  });

  useEffect(() => {
    const allStrategies = [{ _id: 'python_sma_crossover', name: 'SMA Crossover (Python Engine)' }, ...(options.strategies || [])];
    if (allStrategies.length > 0 && !form.strategyId) {
      setForm(prev => ({ ...prev, strategyId: allStrategies[0]._id }));
    }
  }, [options.strategies, form.strategyId]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'initialBalance' ? Number(value) : value }));
  };

  const handleRunSingle = async (e) => {
    e.preventDefault();
    setLatestResult(null);
    setBatchSummary(null);
    try {
      const result = await runNewBacktest(form);
      // The hook (useBacktest.js) now checks if it was a python result
      // and only shows metrics. We just set the result here.
      setLatestResult(result);
    } catch (err) {
      console.error("Backtest run failed:", err);
    }
  };

  // --- 'handleRunBatch' FIX ---
  const handleRunBatch = async (e) => {
    e.preventDefault();
    setLatestResult(null);
    setBatchSummary(null);

    // 1. Check if symbols are loaded
    if (!options.symbols || options.symbols.length === 0) {
      setError("Cannot run batch: Symbols list not loaded."); // Use the hook's setError
      return;
    }

    // 2. Create the 'configs' array
    // This runs the selected strategy against ALL available symbols
    const configs = options.symbols.map(symbol => ({
      ...form, // Spread the base form (dates, balance, etc.)
      symbol: symbol, // Override the symbol for this specific run
    }));
    
    try {
      // 3. Pass the 'configs' array to your hook
      const result = await runNewBatchBacktest(configs);
      // 4. Set the 'summary' part of the result to state
      setBatchSummary(result.summary);
    } catch (err) {
      console.error("Batch backtest run failed:", err);
    }
  };
  
  const allStrategies = [
    { _id: 'python_sma_crossover', name: 'SMA Crossover (Python Engine)' },
    ...(options.strategies || [])
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">Run a Crypto Backtest</h1>
        <form onSubmit={handleRunSingle} className="p-6 bg-gray-800 rounded-xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Strategy</label>
            <select name="strategyId" value={form.strategyId} onChange={handleChange} className="mt-1 block w-full bg-gray-700 text-white rounded-md p-2">
              {allStrategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Symbol</label>
            <select name="symbol" value={form.symbol} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
              {options.symbols?.map(sym => <option key={sym} value={sym}>{sym}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Timeframe</label>
            <select name="timeframe" value={form.timeframe} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
              {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Initial Balance</label>
            <select name="initialBalance" value={form.initialBalance} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
              {[100, 300, 500, 1000, 10000].map(b => <option key={b} value={b}>${b.toLocaleString()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Start Date</label>
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
s       </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">End Date</label>
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
  s     </div>

          <div className="col-span-full lg:col-span-2 flex gap-2">
            <button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md disabled:opacity-50">
              {loading ? 'Running...' : 'Run Single Test'}
            </button>
            <button type="button" onClick={handleRunBatch} disabled={loading || form.strategyId === 'python_sma_crossover'} className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md disabled:opacity-50 disabled:bg-gray-500">
Click           {loading ? '...' : 'Run Batch Test'}
            </button>
          </div>
      S </form>
      </div>
      
      {loading && <div className="text-center text-gray-400">Running backtest...</div>}
      {error && <div className="p-4 bg-red-900/70 text-red-200 rounded-lg">{error}</div>}
      
      {latestResult && <MetricsDisplay metrics={latestResult.metrics} />}
      
      {batchSummary && (
        <div>
          <h2 className="text-2xl font-bold mb-2 text-white">Batch Test Summary</h2>
          <MetricsDisplay 
            title={`Best Result (${batchSummary.bestStrategyConfig?.name || 'N/A'})`}s
            metrics={{ totalReturn: (batchSummary.bestNetProfit / form.initialBalance * 100) || 0, totalTrades: 'N/A', winRate: 'N/A' }} 
          />
        </div>
      )}

      <HistoryTable backtests={pastBacktests} onPageChange={getPastBacktests} />
    </div>
  );
}
