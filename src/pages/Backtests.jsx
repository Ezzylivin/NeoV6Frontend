// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

// A small component to display metrics neatly
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <p>No metrics available.</p>;
  const metricItems = [
    { label: "Total Return", value: `${metrics.totalReturn?.toFixed(2)}%`, color: metrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500' },
    { label: "Win Rate", value: `${metrics.winRate?.toFixed(2)}%` },
    { label: "Total Trades", value: metrics.totalTrades },
    { label: "Profit Factor", value: metrics.profitFactor?.toFixed(2) || 'N/A' },
    { label: "Max Drawdown", value: `${metrics.maxDrawdown?.toFixed(2)}%`, color: 'text-red-500' },
    { label: "Sharpe Ratio", value: metrics.sharpeRatio?.toFixed(2) || 'N/A' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-800 rounded-lg">
      {metricItems.map(item => (
        <div key={item.label}>
          <p className="text-sm text-gray-400">{item.label}</p>
          <p className={`text-lg font-bold ${item.color || ''}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default function Backtests() {
  const { options, pastBacktests, loading, error, runNewBacktest } = useBacktest();
  const [latestResult, setLatestResult] = useState(null);
  
  // Form state includes all configurable options
  const [form, setForm] = useState({
    strategyId: '',
    symbol: '',
    timeframe: '1h',
    initialBalance: 10000,
    risk: 'Medium', // <-- Added risk
    startDate: '2024-01-01',
    endDate: '2024-03-31',
  });

  // Pre-populate the form with default values once options are fetched
  useEffect(() => {
    if (options.strategies?.length && !form.strategyId) {
      setForm(prev => ({ ...prev, strategyId: options.strategies[0]._id }));
    }
    if (options.symbols?.length && !form.symbol) {
      setForm(prev => ({ ...prev, symbol: options.symbols[0] }));
    }
    // Set default timeframe and risk if available
    if (options.timeframes?.length) {
        setForm(prev => ({ ...prev, timeframe: '1h' }));
    }
    if (options.risks?.length) {
        setForm(prev => ({ ...prev, risk: 'Medium' }));
    }
  }, [options, form.strategyId, form.symbol]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setLatestResult(null);
    try {
      const result = await runNewBacktest(form);
      setLatestResult(result);
    } catch (err) {
      console.error("Backtest run failed:", err);
    }
  };

  // Define balances for the dropdown
  const balanceOptions = [1000, 5000, 10000, 25000, 50000, 100000];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Run New Backtest</h1>
        <form onSubmit={handleRun} className="p-6 bg-gray-800 rounded-xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Strategy Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Strategy</label>
            <select name="strategyId" value={form.strategyId} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2">
              {options.strategies?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          {/* Symbol Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Symbol</label>
            <select name="symbol" value={form.symbol} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2">
              {options.symbols?.map(sym => <option key={sym} value={sym}>{sym}</option>)}
            </select>
          </div>
          {/* Timeframe Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Timeframe</label>
            <select name="timeframe" value={form.timeframe} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2">
              {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          
          {/* --- NEW: Initial Balance Dropdown --- */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Initial Balance</label>
            <select name="initialBalance" value={form.initialBalance} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2">
              {balanceOptions.map(b => <option key={b} value={b}>${b.toLocaleString()}</option>)}
            </select>
          </div>

          {/* --- NEW: Risk Dropdown --- */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Risk Level</label>
            <select name="risk" value={form.risk} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2">
              {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Date Inputs */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Start Date</label>
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">End Date</label>
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"/>
          </div>
          
          {/* Submit Button */}
          <div className="w-full">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50">
              {loading ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="p-4 bg-red-900 border border-red-700 rounded-md text-red-200">{error}</div>}
      
      {latestResult && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Latest Result</h2>
          <MetricsDisplay metrics={latestResult.metrics} />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Past Backtests ({pastBacktests.total})</h2>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {pastBacktests.results.map(bt => (
            <div key={bt._id} className="p-4 border-b border-gray-700 grid grid-cols-4 gap-4 items-center">
              <div>
                <p className="font-bold">{bt.symbol}</p>
                <p className="text-sm text-gray-400">{bt.strategy.name}</p>
              </div>
              <p className={bt.profit > 0 ? 'text-green-500' : 'text-red-500'}>Profit: ${bt.profit?.toFixed(2)}</p>
              <p>Win Rate: {bt.metrics?.winRate?.toFixed(1)}%</p>
              <p className="text-sm text-gray-500">{new Date(bt.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
