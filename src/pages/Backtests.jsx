import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import api from "../api/apiClient"; 
import "./Backtests.css"; 

const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];
const REASON_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"]; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout"
};

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5 };

// --- HELPER: Compute Metrics Locally for fallback ---
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return { totalReturn: 0, winRate: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0, finalBalance: initialBalance };
    let balance = initialBalance;
    let wins = 0;
    trades.forEach(t => {
        balance += t.profit;
        if (t.profit > 0) wins++;
    });
    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        winRate: (wins / trades.length) * 100,
        totalTrades: trades.length,
        winningTrades: wins,
        losingTrades: trades.length - wins,
        finalBalance: balance
    };
};

// --- MAIN PAGE COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, resetBacktest, fetchOptions } = useBacktest(); 
  const { loading = 'idle', options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  // Form States
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState({ symbol: "", timeframe: "", startDate: "2025-01-01", endDate: "2026-01-01", initialBalance: 1000, strategyId: "", params: {...defaultFilterParams}, mlMode: "off" });
  const [comboData, setComboData] = useState({ symbol: "", timeframe: "", startDate: "2025-01-01", endDate: "2026-01-01", initialBalance: 1000, strategies: [], comboConfig: { combinationRule: "OR" }, params: {...defaultFilterParams}, mlMode: "off" });
  
  const [backtestResults, setBacktestResults] = useState(null);
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);

  // 🟢 INITIAL FETCH
  useEffect(() => {
    if (typeof fetchOptions === 'function') fetchOptions();
    const fetchMeta = async () => {
        try {
            const [w, m] = await Promise.all([
                axios.get("https://neov6backend.onrender.com/api/bot/winners"),
                axios.get("https://neov6backend.onrender.com/api/ml/available-models")
            ]);
            setLiveWinners(w.data || []);
            setAvailableModels(m.data || []);
        } catch (e) { console.error("Fetch Error", e); }
    };
    fetchMeta();
  }, []);

  // 🟢 AUTO-POPULATE DEFAULTS
  useEffect(() => {
    if (options?.symbols?.length > 0 && !formData.symbol) {
      const def = options.symbols.find(s => s.includes("BTC")) || options.symbols[0];
      setFormData(p => ({ ...p, symbol: def }));
      setComboData(p => ({ ...p, symbol: def }));
    }
    if (options?.timeframes?.length > 0 && !formData.timeframe) {
      setFormData(p => ({ ...p, timeframe: "1h" }));
      setComboData(p => ({ ...p, timeframe: "1h" }));
    }
  }, [options]);

  // 🟢 HANDLERS (Fixed ReferenceError)
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("param_")) {
        setFormData(p => ({ ...p, params: { ...p.params, [name.split("_")[1]]: value } }));
    } else {
        setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("param_")) {
        setComboData(p => ({ ...p, params: { ...p.params, [name.split("_")[1]]: value } }));
    } else {
        setComboData(p => ({ ...p, [name]: value }));
    }
  };

  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;
    const config = win.config || win;
    const sym = (config.symbol || "BTC-USD").replace("/", "-");
    const isCombo = (config.strategies?.length > 1);

    setActiveTab(isCombo ? 'combo' : 'single');
    const update = { symbol: sym, timeframe: config.timeframe || "1h", params: config.params || defaultFilterParams, mlMode: config.mlMode || "predictions", mlModel: config.mlModel };
    
    setFormData(p => ({ ...p, ...update, strategyId: config.strategies?.[0]?.code || "" }));
    setComboData(p => ({ ...p, ...update, strategies: config.strategies || [] }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    const res = activeTab === 'single' ? await runNewBacktest(formData) : await runComboBacktest(comboData);
    if (res) setBacktestResults(res.combinedResult || res);
  };

  // 🟢 METRICS SYNC
  const metrics = useMemo(() => {
    if (!backtestResults?.metrics) return null;
    const local = computeMetricsFromTrades(backtestResults.trades || [], 1000);
    return { ...backtestResults.metrics, ...local, totalReturn: backtestResults.metrics.roi || local.totalReturn };
  }, [backtestResults]);

  const pieData = useMemo(() => metrics ? [{ name: "Wins", value: metrics.winningTrades }, { name: "Losses", value: metrics.losingTrades }] : [], [metrics]);

  return (
    <div className="backtest-container p-6">
        <div className="grid grid-cols-12 gap-8">
            {/* Configuration Column */}
            <div className="col-span-12 lg:col-span-5">
                <div className="bot-card p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Configuration</h2>
                    
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                        <label className="text-emerald-400 text-sm font-bold block mb-2">🏆 Load Alpha Strategy</label>
                        <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                            <option value="">-- Select Strategy --</option>
                            {liveWinners.map(w => (
                                <option key={w.botId || w.id} value={w.botId || w.id}>
                                    {`${w.symbol || "Strategy"} (ROI: ${w.roi || 0}%)`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="tabs flex gap-2 mb-6">
                        <button onClick={() => setActiveTab('single')} className={`px-4 py-2 rounded-lg ${activeTab === 'single' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white'}`}>Single</button>
                        <button onClick={() => setActiveTab('combo')} className={`px-4 py-2 rounded-lg ${activeTab === 'combo' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white'}`}>Combo</button>
                    </div>

                    <form onSubmit={handleRun} className="space-y-4">
                        <div>
                            <label className="text-neutral-400 text-xs">Symbol</label>
                            <select name="symbol" value={activeTab === 'single' ? formData.symbol : comboData.symbol} onChange={activeTab === 'single' ? handleFormChange : handleComboChange} className={inputClass}>
                                {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all">
                            {loading !== 'idle' ? 'Processing...' : '▶ Run Simulation'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Results Column */}
            <div className="col-span-12 lg:col-span-7">
                {metrics ? (
                    <div className="space-y-6">
                        <MetricsDisplay metrics={metrics} />
                        <AdvancedMetricsDisplay metrics={metrics} />
                        <div className="bot-card p-6 h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((e, i) => <Cell key={i} fill={COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="bot-card p-20 text-center text-neutral-500">Select a strategy and run backtest to see results.</div>
                )}
            </div>
        </div>
    </div>
  );
}

// Sub-components (Simplified for brevity)
const MetricsDisplay = ({ metrics }) => (
    <div className="grid grid-cols-2 gap-4">
        <div className="bot-card p-4 text-center">
            <div className="text-neutral-400 text-xs">Total Return</div>
            <div className="text-2xl font-bold text-emerald-400">{metrics.totalReturn?.toFixed(2)}%</div>
        </div>
        <div className="bot-card p-4 text-center">
            <div className="text-neutral-400 text-xs">Win Rate</div>
            <div className="text-2xl font-bold text-violet-400">{metrics.winRate?.toFixed(2)}%</div>
        </div>
    </div>
);

const AdvancedMetricsDisplay = ({ metrics }) => (
    <div className="bot-card p-4">
        <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Total Trades</span>
            <span className="text-white font-mono">{metrics.totalTrades}</span>
        </div>
    </div>
);
