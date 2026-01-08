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

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout",
  "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal", "Ichimoku Cloud": "ichimoku_cloud"
};

const DEFAULT_MODEL_OPTIONS = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" },
    { id: "sol_15m_lstm", name: "SOL 15m LSTM" }
];

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

// --- SAFE METRICS CALCULATOR ---
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return { totalReturn: 0, expectancy: 0, winRate: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0, averageWin: 0, averageLoss: 0, finalBalance: initialBalance };
    let balance = initialBalance;
    let wins = 0; let totalWin = 0; let totalLoss = 0;

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
        expectancy: Number((winRate * avgWin) - ((1 - winRate) * avgLoss)) || 0
    };
};

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState({ symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, strategyId: "", params: {...defaultFilterParams}, mlMode: "off" });
  const [comboData, setComboData] = useState({ symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, strategies: [], comboConfig: { combinationRule: "OR" }, params: {...defaultFilterParams}, mlMode: "off" });
  const [backtestResults, setBacktestResults] = useState(null);
  const [liveWinners, setLiveWinners] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scanningWinners, setScanningWinners] = useState(false);

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, []);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error("Fetch Error:", err); } finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
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
    const rawSym = (config.symbol || "BTC-USD").replace('/', '-');
    const matchedSymbol = symbolOptions.find(s => s.replace('/', '-') === rawSym) || config.symbol || symbolOptions[0];
    const matchedTF = timeframeOptions.find(t => t === config.timeframe) || config.timeframe || timeframeOptions[0];

    const strats = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "unknown");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || "", code, params: s.params || {} };
    });

    const update = { symbol: matchedSymbol, timeframe: matchedTF, mlMode: config.mlMode || "predictions", mlModel: config.mlModel, mlThreshold: config.mlThreshold || 0.5, params: { ...defaultFilterParams, ...config.params } };
    
    setFormData(p => ({ ...p, ...update, strategyId: strats[0]?.strategyId, code: strats[0]?.code }));
    setComboData(p => ({ ...p, ...update, strategies: strats }));
    setActiveTab(strats.length > 1 ? 'combo' : 'single');
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const res = activeTab === 'combo' ? await runComboBacktest(comboData) : await runNewBacktest(formData);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    const trades = (res.tradeBreakdown || res.trades || []).map(t => ({ ...t, entryTime: t.entry_time || t.entryTime, exitTime: t.exit_time || t.exitTime, profit: t.profit || 0 }));
    const curve = (res.equityCurve || []).map(p => ({ timestamp: new Date(p.timestamp || p.time).getTime(), balance: p.balance }));
    const initial = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
    const local = computeMetricsFromTrades(trades, initial);
    return { candleData: res.candleData || [], trades, curve, metrics: { ...res.metrics, ...local, totalReturn: res.metrics?.roi || local.totalReturn } };
  }, [backtestResults, activeTab]);

  return (
    <div className="backtest-container p-6">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg"> <span className="text-2xl">📈</span> </div>
              <h1 className="header" style={{fontSize:'2rem', margin:0}}>Backtesting Dashboard</h1>
            </div>
            <div className="px-4 py-2 bg-black/50 rounded-xl border border-white/10 flex items-center gap-2"><span className="text-neutral-400 text-sm">API Connected</span><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span></div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card p-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-400 font-semibold text-sm">🏆 Load Alpha Strategy</label>
                    <button type="button" onClick={fetchWinners} disabled={scanningWinners} className="text-emerald-400">🔄</button>
                </div>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                  <option value="">-- Select Alpha --</option>
                  {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${(w.roi || w.metrics?.totalReturn || 0).toFixed(0)}%)`}</option>)}
                </select>
              </div>

              <div className="tabs flex gap-2 mb-6"> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo</button> 
              </div>

              <form onSubmit={handleRun}>
                {activeTab === 'single' && (
                   <div className="setup-selector mb-4"> <label className="text-neutral-400 text-xs block mb-2">⚡ Engine</label> <select name="strategyId" value={formData.strategyId} onChange={(e) => setFormData({...formData, strategyId: e.target.value})} className={inputClass}> <option value="">-- Select TA Engine --</option> {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)} </select> </div>
                )}
                <CommonBacktestInputs data={activeTab === 'single' ? formData : comboData} onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} options={{ symbolOptions, timeframeOptions, modelOptions: options.models || DEFAULT_MODEL_OPTIONS }} />
                {activeTab === 'combo' && (
                  <div className="space-y-4 mt-6 mb-6"> 
                      <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Logic Layers</label> 
                      {comboData.strategies.map((c, i) => <ComboStrategyCard key={i} idx={i} config={c} strategies={strategyOptions} onChange={(e, idx) => {const n = [...comboData.strategies]; n[idx].strategyId = e.target.value; setComboData({...comboData, strategies: n})}} onRemove={(idx) => setComboData({...comboData, strategies: comboData.strategies.filter((_,i)=>i!==idx)})} disableRemove={comboData.strategies.length <= 1} /> )} 
                      <button type="button" onClick={() => setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: "", code: "", params:{}}]})} className="w-full py-3 bg-black/40 border border-white/10 rounded-xl text-emerald-400 text-xs hover:bg-emerald-500/10 transition-all">+ Add Layer</button> 
                  </div>
                )}
                <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-all"> {isSimulating ? 'Test is Running...' : '▶ Run Simulation'} </button>
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
              <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5 bg-transparent"> 
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl ${isSimulating ? 'animate-pulse bg-amber-500/20' : 'bg-emerald-500/10'}`}> {isSimulating ? '⏳' : '🧪'} </div> 
                <h3 className="text-white text-xl mb-2 font-bold">{isSimulating ? 'Simulation Currently Running...' : 'Strategy Sandbox Ready'}</h3> 
                <p className="text-neutral-400 text-center max-w-sm">Load an alpha strategy to begin simulation.</p> 
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

const CommonBacktestInputs = ({ data, onChange, options }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const handleParamChange = (e) => {
        onChange({ target: { name: `param_${e.target.name}`, value: e.target.value } });
    };
    const params = data.params || {};

    return (
      <div className="space-y-6">
        <div className="form-grid">
          <div className="setup-selector"> <label className="text-neutral-400 text-xs">Symbol</label> <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}> {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)} </select> </div>
          <div className="setup-selector"> <label className="text-neutral-400 text-xs">Timeframe</label> <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}> {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)} </select> </div>
          <div className="setup-selector"> <label className="text-neutral-400 text-xs">Balance</label> <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} className={inputClass} /> </div>
        </div>
        <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
          <div className="setup-selector"> <label className="text-neutral-400 text-xs">Start Date</label> <input type="date" name="startDate" value={data.startDate} onChange={onChange} className={inputClass} /> </div>
          <div className="setup-selector"> <label className="text-neutral-400 text-xs">End Date</label> <input type="date" name="endDate" value={data.endDate} onChange={onChange} className={inputClass} /> </div>
        </div>
        <div className="bot-card bg-emerald-500/5 border-emerald-500/20 p-4">
          <div className="panel-header mb-4 pb-2 border-b border-emerald-500/20"><h4 className="text-emerald-400 text-xs font-bold">ML & RISK</h4></div>
          <div className="form-grid">
            <div className="setup-selector"> <label className="text-neutral-400 text-xs">Risk Mode</label> <select name="riskManagementMode" value={data.riskManagementMode} onChange={onChange} className={inputClass}> <option value="static">Standard</option> <option value="dynamic">Dynamic</option> </select> </div>
            <div className="setup-selector"> <label className="text-neutral-400 text-xs">ML Mode</label> <select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}> <option value="off">Off</option> <option value="predictions">Hybrid</option> </select> </div>
            {data.mlMode !== 'off' && (
              <>
                <div className="setup-selector"> <label className="text-neutral-400 text-xs">Model</label> <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}> {options.modelOptions?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)} </select> </div>
                <div className="setup-selector"> <label className="text-neutral-400 text-xs">Threshold</label> <input type="number" name="mlThreshold" value={data.mlThreshold} onChange={onChange} step="0.05" className={inputClass} /> </div>
              </>
            )}
          </div>
        </div>
        <div className="bot-card p-4">
          <div className="panel-header mb-4 pb-2 border-b border-white/10"><h4 className="text-white text-xs font-bold uppercase">Advanced Filters</h4></div>
          <div className="form-grid">
             <div className="setup-selector"> <label className="text-neutral-400 text-xs">Min ATR %</label> <input type="number" name="minAtrPct" value={params.minAtrPct} onChange={(e) => onChange({target:{name:'param_minAtrPct', value:e.target.value}})} step="0.05" className={inputClass} /> </div>
             <div className="setup-selector"> <label className="text-neutral-400 text-xs">Trend Filter</label> <input type="number" name="trendFilterPeriod" value={params.trendFilterPeriod} onChange={(e) => onChange({target:{name:'param_trendFilterPeriod', value:e.target.value}})} className={inputClass} /> </div>
          </div>
        </div>
      </div>
    );
};

const MetricsDisplay = ({ metrics }) => (
    <div className="grid grid-cols-4 gap-4">
        {[{l:"ROI", v:metrics.totalReturn, f:"%"}, {l:"Expectancy", v:metrics.expectancy, f:"$"}, {l:"Win Rate", v:metrics.winRate, f:"%"}, {l:"Trades", v:metrics.totalTrades}].map((i, idx) => (
            <div key={idx} className="bot-card p-4 text-center">
                <div className="text-neutral-400 text-[10px] uppercase font-bold">{i.l}</div>
                <div className="text-xl font-bold text-white">{i.f==="$" && "$"}{i.v?.toFixed(2)}{i.f==="%" && "%"}</div>
            </div>
        ))}
    </div>
);
