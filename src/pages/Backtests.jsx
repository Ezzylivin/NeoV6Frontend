import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useBacktest } from "../hooks/useBacktest.js";

// A component to display metrics neatly
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;
  const metricItems = [
    { label: "Total Return", value: `${metrics.totalReturn?.toFixed(2)}%`, color: metrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500' },
    { label: "Win Rate", value: `${metrics.winRate?.toFixed(2)}%` },
    { label: "Total Trades", value: metrics.totalTrades },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-800 rounded-lg">
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
  
  const [form, setForm] = useState({
    strategyId: '',
    symbol: '',
    timeframe: '1h',
    initialBalance: 10000,
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
  });

 // FIX: Simplified and more reliable effect to set default strategy
  useEffect(() => {
    if (options.strategies?.length > 0) {
      setForm(prev => ({
        ...prev,
        strategyId: prev.strategyId || options.strategies[0]._id,
        symbol: prev.symbol || options.symbols[0],
      }));
    }
  }, [options.strategies, options.symbols]); // This now only depends on the options themselves


  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
  
  const hasStrategies = options.strategies && options.strategies.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Run New Backtest</h1>
        {hasStrategies ? (
          <form onSubmit={handleRun} className="p-6 bg-gray-800 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300">Strategy</label>
              <select name="strategyId" value={form.strategyId} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
                {options.strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Symbol</label>
              <select name="symbol" value={form.symbol} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
                {options.symbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
            </div>
            <button type="submit" disabled={loading || !form.strategyId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">
              {loading ? 'Running...' : 'Run Backtest'}
            </button>
          </form>
        ) : (
          <div className="p-6 bg-yellow-900/50 border border-yellow-700 rounded-xl text-center">
            <p className="font-semibold text-yellow-200">You have no saved strategies.</p>
            <p className="text-yellow-300 mt-2">Please create a strategy first before running a backtest.</p>
            <Link to="/dashboard/strategies" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Go to Strategies Page
            </Link>
          </div>
        )}
      </div>
      
      {error && <div className="p-4 bg-red-900 rounded-md text-red-200">{error}</div>}
      
      {latestResult && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Latest Result</h2>
          <MetricsDisplay metrics={latestResult.metrics} />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Past Backtests</h2>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {loading && <p className="p-4 text-gray-400">Loading history...</p>}
          
          {/* --- THIS IS THE FIX --- */}
          {/* Show a message if loading is done and there are no results. */}
          {!loading && pastBacktests.results.length === 0 && (
            <p className="p-4 text-gray-400">You have not run any backtests yet. Your past results will appear here.</p>
          )}

          {/* Map and display the results only if they exist. */}
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
