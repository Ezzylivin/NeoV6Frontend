import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useBacktest } from "../hooks/useBacktest.js";

const MetricsDisplay = ({ metrics, title = "Latest Result" }) => {
  if (!metrics) return null;

  // FIX: This logic now safely handles non-numeric values for the batch summary.
  const formatValue = (value, suffix = '') => {
    if (typeof value === 'number') {
      return `${value.toFixed(2)}${suffix}`;
    }
    return value; // Return strings like 'N/A' as is.
  };

  const metricItems = [
    { label: "Total Return", value: formatValue(metrics.totalReturn, '%'), color: metrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500' },
    { label: "Win Rate", value: formatValue(metrics.winRate, '%') },
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
  
  const [form, setForm] = useState({
    strategyId: '',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0], // UPGRADE: Added End Date
    initialBalance: 1000
  });

  useEffect(() => {
    if (options.strategies?.length > 0 && !form.strategyId) {
      setForm(prev => ({ ...prev, strategyId: options.strategies[0]._id }));
    }
  }, [options.strategies]);

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
      setLatestResult(result);
    } catch (err) {
      console.error("Backtest run failed:", err);
    }
  };

  const handleRunBatch = async () => {
    setLatestResult(null);
    setBatchSummary(null);
    const batchSymbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];
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
          <form onSubmit={handleRunSingle} className="p-6 bg-gray-800 rounded-xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300">Strategy</label>
              <select name="strategyId" value={form.strategyId} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
                {options.strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
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
            </div>
            
            {/* --- UPGRADE: End Date Input Added --- */}
            <div>
              <label className="block text-sm font-medium text-gray-300">End Date</label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
            </div>

            <div className="col-span-full lg:col-span-2 flex gap-2">
              <button type="submit" disabled={loading || !form.strategyId} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md disabled:opacity-50">
                {loading ? '...' : 'Run Single Test'}
              </button>
              <button type="button" onClick={handleRunBatch} disabled={loading || !form.strategyId} className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md disabled:opacity-50">
                {loading ? '...' : 'Run Batch Test'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 bg-yellow-900/50 text-center">
            <p className="font-semibold text-yellow-200">You have no saved strategies.</p>
            <Link to="/dashboard/strategies" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white">Go to Strategies Page</Link>
          </div>
        )}
      </div>
      
      {error && <div className="p-4 bg-red-900 text-red-200">{error}</div>}
      
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
