import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx"; 
import api from "../api/apiClient"; 
import "./Backtests.css"; 

const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];
const REASON_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"]; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout",
  "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal", "Ichimoku Cloud": "ichimoku_cloud"
};

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : `${date.getMonth()+1}/${date.getDate()}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return { totalReturn: 0, expectancy: 0, winningTrades: 0, losingTrades: 0, totalTrades: 0 };
    let balance = initialBalance;
    let wins = 0;
    let totalWin = 0;
    let totalLoss = 0;

    trades.forEach(t => {
        balance += t.profit;
        if (t.profit > 0) { wins++; totalWin += t.profit; }
        else { totalLoss += Math.abs(t.profit); }
    });

    const winRate = wins / trades.length;
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = (trades.length - wins) > 0 ? totalLoss / (trades.length - wins) : 0;

    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        winRate: winRate * 100,
        totalTrades: trades.length,
        winningTrades: wins,
        losingTrades: trades.length - wins,
        averageWin: avgWin,
        averageLoss: avgLoss,
        finalBalance: balance,
        expectancy: (winRate * avgWin) - ((1 - winRate) * avgLoss)
    };
};

const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 1, mlMode: "off", mlModel: "", mlThreshold: 0.5
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "", params: { tslAtrMult: 3.5 } } ],
  params: { ...defaultFilterParams, maxPyramiding: 1 }, 
  comboConfig: { strategyCodes: [], combinationRule: 'AND' },
  symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000,
  riskManagementMode: 'static', riskPercentage: 1, mlMode: "off", mlModel: "", mlThreshold: 0.5
};

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState(null);
  const [liveWinners, setLiveWinners] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scanningWinners, setScanningWinners] = useState(false);

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, []);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const [resWinners, resModels] = await Promise.all([
            axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } }),
            axios.get("https://neov6backend.onrender.com/api/ml/available-models", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLiveWinners(Array.isArray(resWinners.data) ? resWinners.data : (resWinners.data.winners || []));
        setAvailableModels(resModels.data || []);
      } catch (err) { console.error("Fetch Error:", err); } finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;
    const config = win.config || win;
    const symbol = (config.symbol || "BTC-USD").replace('/', '-');
    const timeframe = config.timeframe || "1h";

    const strategies = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "unknown");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || "", code, params: s.params || {} };
    });

    setActiveTab(strategies.length > 1 ? 'combo' : 'single');
    const update = { symbol, timeframe, mlMode: config.mlMode || "predictions", mlModel: config.mlModel, mlThreshold: config.mlThreshold || 0.5, params: { ...defaultFilterParams, ...config.params } };
    setFormData(p => ({ ...p, ...update, strategyId: strategies[0]?.strategyId, code: strategies[0]?.code }));
    setComboData(p => ({ ...p, ...update, strategies: strategies, comboConfig: config.comboConfig || { combinationRule: 'OR' } }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const res = activeTab === 'combo' ? await runComboBacktest(comboData) : await runNewBacktest(formData);
    if (res) setBacktestResults(res.combinedResult || res);
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const trades = (backtestResults.tradeBreakdown || backtestResults.trades || []).map(t => ({ ...t, entryTime: t.entry_time || t.entryTime, exitTime: t.exit_time || t.exitTime, profit: t.profit || 0 }));
    const initial = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
    const local = computeMetricsFromTrades(trades, initial);
    return { ...backtestResults, trades, metrics: { ...backtestResults.metrics, ...local, totalReturn: backtestResults.metrics?.roi || local.totalReturn } };
  }, [backtestResults, activeTab, formData, comboData]);

  return (
    <div className="backtest-container p-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card p-6">
              <h2 className="text-xl font-bold text-white mb-6">Configuration</h2>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-400 font-semibold text-sm">🏆 Load Alpha Strategy</label>
                    <button type="button" onClick={fetchWinners} disabled={scanningWinners} className="text-emerald-400">🔄</button>
                </div>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                  <option value="">-- Select Alpha --</option>
                  {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${(w.roi || w.metrics?.totalReturn || 0).toFixed(0)}%)`}</option>)}
                </select>
              </div>
              <form onSubmit={handleRun}>
                  <div className="tabs flex gap-2 mb-6"> 
                    <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single</button> 
                    <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo</button> 
                  </div>
                  <CommonBacktestInputs data={activeTab === 'single' ? formData : comboData} onChange={activeTab === 'single' ? (e)=>setFormData({...formData, [e.target.name]: e.target.value}) : (e)=>setComboData({...comboData, [e.target.name]: e.target.value})} options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes }} />
                  <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg mt-6"> {isSimulating ? 'Processing Sequence...' : '▶ Run Simulation'} </button>
              </form>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {processed ? (
              <>
                <MetricsDisplay metrics={processed.metrics} />
                <div className="bot-card p-6 h-[500px]"> <ChartIndependent results={processed} symbol={formData.symbol} /> </div>
              </>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5"> 
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl ${isSimulating ? 'animate-pulse bg-amber-500/20' : 'bg-emerald-500/10'}`}>
                    {isSimulating ? '⏳' : '🧪'}
                </div> 
                <h3 className="text-white text-xl mb-2 font-bold">{isSimulating ? 'Test is Running...' : 'Strategy Sandbox Ready'}</h3> 
                <p className="text-neutral-400 text-center max-w-sm">{isSimulating ? 'Processing historical data and ML predictions...' : 'Load an alpha strategy to begin simulation.'}</p> 
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Components
const CommonBacktestInputs = ({ data, onChange, options }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-neutral-400 text-xs">Symbol</label><select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>{options.symbolOptions?.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-neutral-400 text-xs">Timeframe</label><select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>{options.timeframeOptions?.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-neutral-400 text-xs">Start Date</label><input type="date" name="startDate" value={data.startDate} onChange={onChange} className={inputClass}/></div>
                <div><label className="text-neutral-400 text-xs">End Date</label><input type="date" name="endDate" value={data.endDate} onChange={onChange} className={inputClass}/></div>
            </div>
        </div>
    );
};

const MetricsDisplay = ({ metrics }) => (
    <div className="grid grid-cols-4 gap-4">
        {[{l: "ROI", v: metrics.totalReturn, f:"%"}, {l:"Expectancy", v: metrics.expectancy, f:"$"}, {l:"Win Rate", v: metrics.winRate, f:"%"}, {l:"Trades", v: metrics.totalTrades}].map((item, i) => (
            <div key={i} className="bot-card p-4 text-center">
                <div className="text-neutral-400 text-[10px] uppercase">{item.l}</div>
                <div className="text-xl font-bold text-white">{item.f==="$" && "$"}{item.v?.toFixed(2)}{item.f==="%" && "%"}</div>
            </div>
        ))}
    </div>
);
