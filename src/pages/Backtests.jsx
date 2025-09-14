import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useBacktest } from "../hooks/useBacktest.js";

const MetricsDisplay = ({ metrics, title = "Latest Result" }) => {
  if (!metrics) return null;
  const metricItems = [
    { label: "Total Return", value: `${metrics.totalReturn?.toFixed(2)}%`, color: metrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500' },
    { label: "Win Rate", value: `${metrics.winRate?.toFixed(2)}%` },
    { label: "Total Trades", value: metrics.totalTrades },
  ];
  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricItems.map(item => (
          <div key={item.label}>
            <p className="text-sm text-gray-400">{item.label}</p>
            <p className={`text-xl font-bold ${item.color || ''}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Backtests() {
  const { options, loading, error, runNewBacktest, runNewBatchBacktest } = useBacktest();
  const [latestResult, setLatestResult] = useState(null);
  const [batchSummary, setBatchSummary] = useState(null);
  
  // --- THIS IS THE FIX ---
  // Default symbol is now a cryptocurrency pair.
  const [form, setForm] = useState({
    strategyId: '',
    symbol: 'BTC/USDT',
    startDate: '2024-01-01',
    initialBalance: 10000
  });

  useEffect(() => {
    if (options.strategies?.length > 0) {
      setForm(prev => ({
        ...prev,
        strategyId: prev.strategyId || options.strategies[0]._id,
      }));
    }
  }, [options.strategies]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleRunSingle = async (e) => {
    e.preventDefault();
    setLatestResult(null);
    setBatchSummary(null);
    try {
      const result = await runNewBacktest(form);
      setLatestResult(result);
    } catch (err) {
      console.error("Backtest run failed:", err);
    }
  };

  const handleRunBatch = async () => {
    setLatestResult(null);
    setBatchSummary(null);
    // A predefined list of major cryptocurrencies for the batch test
    const batchSymbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT'];
    const configs = batchSymbols.map(symbol => ({ ...form, symbol }));
    try {
      const result = await runNewBatchBacktest(configs);
      setBatchSummary(result.summary);
    } catch (err) {
      console.error("Batch backtest run failed:", err);
    }
  };
  
  const hasStrategies = options.strategies && options.strategies.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Run a Crypto Backtest</h1>
        {hasStrategies ? (
          <form onSubmit={handleRunSingle} className="p-6 bg-gray-800 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300">Strategy</label>
              <select name="strategyId" value={form.strategyId} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
                {options.strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Symbol</label>
              <select name="symbol" value={form.symbol} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
                {/* --- THIS IS THE FIX --- */}
                {/* The dropdown now shows popular crypto pairs. */}
                {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT'].map(sym => <option key={sym} value={sym}>{sym}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading || !form.strategyId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">
                {loading ? '...' : 'Run Single'}
              </button>
              <button type="button" onClick={handleRunBatch} disabled={loading || !form.strategyId} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">
                {loading ? '...' : 'Run Batch'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 bg-yellow-900/50 border border-yellow-700 rounded-xl text-center">
            <p className="font-semibold text-yellow-200">You have no saved strategies.</p>
            <p className="text-yellow-300 mt-2">Please create a strategy first.</p>
            <Link to="/dashboard/strategies" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Go to Strategies</Link>
          </div>
        )}
      </div>
      
      {error && <div className="p-4 bg-red-900 rounded-md text-red-200">{error}</div>}
      
      {latestResult && <MetricsDisplay metrics={latestResult.metrics} />}

      {batchSummary && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Batch Test Summary</h2>
          <MetricsDisplay 
            title={`Best Result (${batchSummary.bestStrategyConfig?.name || 'N/A'})`} 
            metrics={{ totalReturn: (batchSummary.bestNetProfit / form.initialBalance * 100) || 0, totalTrades: 'N/A', winRate: 'N/A' }} 
          />
        </div>
      )}
    </div>
  );
}
