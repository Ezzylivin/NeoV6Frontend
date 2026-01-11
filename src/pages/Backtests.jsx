import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend 
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx";
import "./Backtests.css"; 

// --- CONSTANTS ---
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

const defaultFilterParams = { minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 10, tslAtrMult: 3.5, regime_threshold: 25 };
const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"];
const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors disabled:opacity-50";

// --- SUB-COMPONENTS ---

const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-4 gap-4 mb-6">
        {[
            { l: "Total Return", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Total Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Avg Win", v: `$${(metrics.averageWin || 0).toFixed(2)}`, c: "text-emerald-500" },
            { l: "Avg Loss", v: `$${(metrics.averageLoss || 0).toFixed(2)}`, c: "text-rose-500" },
            { l: "Expectancy", v: `$${(metrics.expectancy || 0).toFixed(2)}`, c: "text-amber-400" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center border-white/5 bg-black/40 shadow-xl">
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">{m.l}</div>
                <div className={`text-xl font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);

const CommonInputs = ({ data, onChange, options, onParamChange }) => {
    const params = data.params || defaultFilterParams;
    return (
        <div className="space-y-6">
            <div className="form-grid">
                <div><label className="text-neutral-400 text-xs font-bold">Symbol</label>
                <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                    <option value="">-- Select Symbol --</option>
                    {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
                <div><label className="text-neutral-400 text-xs font-bold">Timeframe</label>
                <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                    <option value="">-- Select TF --</option>
                    {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
                <div><label className="text-neutral-400 text-xs font-bold">Initial Balance</label>
                <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} className={inputClass} /></div>
            </div>

            <div className="bot-card bg-emerald-500/5 border-emerald-500/20 p-4">
                <div className="panel-header mb-4 pb-2 border-b border-emerald-500/20"><h4 className="text-emerald-400 font-bold uppercase text-[10px]">ML & Risk Engine</h4></div>
                <div className="form-grid">
                    <div><label className="text-neutral-400 text-xs">Risk Mode</label>
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={onChange} className={inputClass}>
                        <option value="static">Standard (Static %)</option>
                        <option value="dynamic">Dynamic (Growth)</option>
                    </select></div>
                    <div><label className="text-neutral-400 text-xs">Risk %</label><input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" className={inputClass} /></div>
                    <div><label className="text-neutral-400 text-xs">ML Mode</label>
                    <select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}>
                        <option value="off">Off (TA Only)</option>
                        <option value="predictions">Hybrid (TA+ML)</option>
                    </select></div>
                    {data.mlMode !== 'off' && (
                        <div><label className="text-neutral-400 text-xs">Model</label>
                        <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                            <option value="">-- Select Model --</option>
                            {(options.modelOptions || DEFAULT_MODEL_OPTIONS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select></div>
                    )}
                </div>
            </div>

            <div className="bot-card p-4 border-white/10">
                <div className="panel-header mb-4 pb-2 border-b border-white/10"><h4 className="text-white font-bold uppercase text-[10px]">Advanced TA Filters</h4></div>
                <div className="form-grid">
                    <div><label className="text-neutral-400 text-xs">Min ATR %</label><input type="number" value={params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', parseFloat(e.target.value))} step="0.05" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Trend SMA</label><input type="number" value={params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">TSL Mult</label><input type="number" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} step="0.1" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Min ADX</label><input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [displayMode, setDisplayMode] = useState('static');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ 
    symbol: "", timeframe: "", startDate: "2025-01-11", endDate: "2026-01-11", 
    initialBalance: 1000, strategyId: "", code: "", riskManagementMode: 'static', riskPercentage: 1, 
    params: {...defaultFilterParams}, mlMode: "off", mlModel: "" 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "", timeframe: "", startDate: "2025-01-11", endDate: "2026-01-11", 
    initialBalance: 1000, strategies: [{strategyId: "", code: ""}], comboConfig: { combinationRule: "OR" }, 
    riskManagementMode: 'static', riskPercentage: 1, params: {...defaultFilterParams}, mlMode: "off"
  });

  const loadWinners = useCallback(async () => {
      try {
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { 
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
        });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { 
      if (typeof fetchOptions === 'function') fetchOptions(); 
      loadWinners();
  }, [fetchOptions, loadWinners]);

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
    const matchedSymbol = options.symbols?.find(s => s.replace('/', '-') === rawSym) || rawSym;
    
    // 🟢 RESOLVE STRATEGY ENGINE & CODE
    const resolvedStrats = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "unknown");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || "", code, params: s.params || {} };
    });

    const update = { 
        symbol: matchedSymbol, 
        timeframe: config.timeframe || "1h", 
        initialBalance: config.initialBalance || 1000,
        riskManagementMode: config.riskManagementMode || 'static',
        riskPercentage: config.riskPercentage || 1,
        mlMode: config.mlMode || "off",
        mlModel: config.mlModel || "",
        params: { ...defaultFilterParams, ...(config.params || {}) },
        strategyId: resolvedStrats[0]?.strategyId || "",
        code: resolvedStrats[0]?.code || ""
    };

    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update, strategies: resolvedStrats.length > 0 ? resolvedStrats : [{strategyId: "", code: ""}] }));
    setActiveTab(resolvedStrats.length > 1 ? 'combo' : 'single');
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const data = activeTab === 'combo' ? comboData : formData;
    const res = await runner(data);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    return { candleData: res.candleData || [], trades: res.trades || res.tradeBreakdown || [], metrics: { ...res.metrics } };
  }, [backtestResults]);

  return (
    <div className="backtest-container p-6 space-y-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-6 bg-black/60 border-emerald-500/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-bold text-sm tracking-tight">🧪 Strategy Sandbox</h2>
                <button type="button" onClick={loadWinners} className="text-emerald-400 text-xs">🔄 Refresh Alpha</button>
              </div>

              <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass + " mb-6"}>
                <option value="">-- Load Alpha Strategy --</option>
                {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${w.roi}%)`}</option>)}
              </select>

              <div className="tabs flex gap-2 mb-6 bg-white/5 p-1 rounded-xl"> 
                <button type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black' : 'text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single Layer</button> 
                <button type="button" className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black' : 'text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo Layers</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' ? (
                   <div><label className="text-neutral-400 text-xs">TA Engine</label>
                    <select value={formData.strategyId} onChange={(e) => {
                        const opt = strategyOptions.find(o => o._id === e.target.value);
                        setFormData({...formData, strategyId: e.target.value, code: opt?.code || ""});
                    }} className={inputClass}>
                        <option value="">-- Select Strategy --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select></div>
                ) : (
                    <div className="space-y-3">
                        {comboData.strategies.map((s, i) => (
                            <div key={i} className="flex gap-2">
                                <select className={inputClass + " text-xs"} value={s.strategyId} onChange={(e) => {
                                    const opt = strategyOptions.find(o => o._id === e.target.value);
                                    const n = [...comboData.strategies]; n[i] = {strategyId: e.target.value, code: opt?.code || ""};
                                    setComboData({...comboData, strategies: n});
                                }}><option value="">-- Select Engine --</option>{strategyOptions.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select>
                                <button type="button" onClick={()=>setComboData({...comboData, strategies: comboData.strategies.filter((_, idx)=>idx!==i)})} className="text-rose-400 px-1">✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={()=>setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: "", code: ""}]})} className="w-full py-2 border-dashed border border-white/20 rounded-xl text-[10px] text-emerald-400 uppercase font-bold">+ Add Layer</button>
                    </div>
                )}

                <CommonInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models || DEFAULT_MODEL_OPTIONS }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />
                
                <button type="submit" disabled={isSimulating} className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all ${isSimulating ? 'bg-neutral-800 text-neutral-500 animate-pulse' : 'bg-emerald-500 text-black hover:scale-105'}`}>
                    {isSimulating ? 'Processing Test...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            {processed ? (
              <div className="animate-in fade-in zoom-in duration-500">
                <MetricsGrid metrics={processed.metrics} />
                <div className="bot-card p-6 h-[500px] border-white/5 relative">
                  {displayMode === 'static' ? <ChartIndependent results={processed} symbol={formData.symbol} /> : <ChartReplay results={processed} symbol={formData.symbol} />}
                </div>
              </div>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[700px] border-dashed border-2 border-white/5 bg-black/20 text-center"> 
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 text-5xl bg-emerald-500/5 border border-emerald-500/20">🧪</div> 
                <h3 className="text-white text-2xl mb-4 font-bold">Strategy Sandbox Ready</h3> 
                <p className="text-neutral-500 max-w-sm text-sm">Select an Alpha or define your logic to start.</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
