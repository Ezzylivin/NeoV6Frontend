import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

// --- Constants ---
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

const defaultFilterParams = { 
    minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 10, 
    tslAtrMult: 3.5, regime_threshold: 25 
};

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors disabled:opacity-50";

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

// --- Sub-Components ---

const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;
  const items = [
    { label: "ROI", value: `${(metrics.roi || 0).toFixed(2)}%`, color: "text-emerald-400" },
    { label: "Win Rate", value: `${(metrics.winRate || 0).toFixed(2)}%`, color: "text-violet-400" },
    { label: "Trades", value: metrics.totalTrades || 0, color: "text-cyan-400" },
    { label: "Expectancy", value: `$${(metrics.expectancy || 0).toFixed(2)}`, color: "text-amber-400" }
  ];
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {items.map((item, idx) => (
        <div key={idx} className="bot-card p-4 text-center bg-black/40 border border-white/5 shadow-xl">
          <div className="text-neutral-400 text-[10px] uppercase font-bold mb-1 tracking-wider">{item.label}</div>
          <div className={`text-xl font-mono font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
};

const CommonBacktestInputs = ({ data, onChange, options, onParamChange }) => {
    const params = data.params || defaultFilterParams;
    return (
        <div className="space-y-6">
            <div className="form-grid">
                <div><label className="text-neutral-400 text-xs">Symbol</label>
                <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                    <option value="">-- Select Symbol --</option>
                    {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
                <div><label className="text-neutral-400 text-xs">Timeframe</label>
                <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                    <option value="">-- Select TF --</option>
                    {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
                <div><label className="text-neutral-400 text-xs">Initial Balance</label>
                <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} className={inputClass} /></div>
            </div>

            <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                <div><label className="text-neutral-400 text-xs">Start Date</label><input type="date" name="startDate" value={data.startDate} onChange={onChange} className={inputClass}/></div>
                <div><label className="text-neutral-400 text-xs">End Date</label><input type="date" name="endDate" value={data.endDate} onChange={onChange} className={inputClass}/></div>
            </div>

            <div className="bot-card bg-emerald-500/5 border-emerald-500/20 p-4">
                <div className="panel-header mb-4 pb-2 border-b border-emerald-500/20 flex justify-between"><h4 className="text-emerald-400 font-bold uppercase text-[10px]">ML & Risk Engine</h4></div>
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
                        <>
                            <div><label className="text-neutral-400 text-xs">Model</label>
                            <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                                <option value="">-- Select Model --</option>
                                {options.modelOptions?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select></div>
                            <div><label className="text-neutral-400 text-xs">Confidence</label>
                            <input type="number" name="mlThreshold" value={data.mlThreshold} onChange={onChange} step="0.05" className={inputClass}/></div>
                        </>
                    )}
                </div>
            </div>

            <div className="bot-card p-4 border-white/10">
                <div className="panel-header mb-4 pb-2 border-b border-white/10"><h4 className="text-white font-bold uppercase text-[10px]">Advanced TA Filters</h4></div>
                <div className="form-grid">
                    <div><label className="text-neutral-400 text-xs">Min ATR %</label><input type="number" value={params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', parseFloat(e.target.value))} step="0.05" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Min ADX</label><input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">TSL Mult</label><input type="number" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} step="0.1" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Trend SMA</label><input type="number" value={params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);
  const [scanningWinners, setScanningWinners] = useState(false);

  const [formData, setFormData] = useState({ 
    symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, 
    initialBalance: 1000, strategyId: "", code: "", riskManagementMode: 'static', riskPercentage: 1, 
    params: {...defaultFilterParams}, mlMode: "off", mlModel: "", mlThreshold: 0.5 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, 
    initialBalance: 1000, strategies: [{strategyId: "", code: ""}], comboConfig: { combinationRule: "OR" }, 
    riskManagementMode: 'static', riskPercentage: 1, params: {...defaultFilterParams}, mlMode: "off", mlModel: "", mlThreshold: 0.5 
  });

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, []);

  const loadWinners = useCallback(async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error("Fetch Error:", err); } finally { setScanningWinners(false); }
  }, []);

  useEffect(() => { loadWinners(); }, [loadWinners]);

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
    const matchedTF = options.timeframes?.find(t => t === config.timeframe) || config.timeframe || "1h";

    const strats = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "unknown");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || "", code, params: s.params || {} };
    });

    const update = { 
        symbol: matchedSymbol, timeframe: matchedTF, 
        initialBalance: config.initialBalance || 1000,
        riskManagementMode: config.riskManagementMode || 'static',
        riskPercentage: config.riskPercentage || 1,
        mlMode: config.mlMode || "predictions", 
        mlModel: config.mlModel || "", 
        mlThreshold: config.mlThreshold || 0.5,
        params: { ...defaultFilterParams, ...(config.params || {}) },
        strategyId: strats[0]?.strategyId || "",
        code: strats[0]?.code || ""
    };
    
    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update, strategies: strats.length > 0 ? strats : [{strategyId: "", code: ""}] }));
    setActiveTab(strats.length > 1 ? 'combo' : 'single');
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const activeData = activeTab === 'combo' ? comboData : formData;

    if (typeof runner === 'function') {
        const res = await runner(activeData);
        if (res) setBacktestResults(res);
    }
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    return { 
        candleData: backtestResults.candleData || res.candleData || [], 
        trades: backtestResults.trades || res.trades || res.tradeBreakdown || [], 
        metrics: { ...res.metrics, totalReturn: res.metrics?.roi || 0 } 
    };
  }, [backtestResults]);

  return (
    <div className="backtest-container p-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card p-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-400 font-semibold text-sm">🏆 Load Alpha Strategy</label>
                    <button type="button" onClick={loadWinners} disabled={scanningWinners} className="text-emerald-400">🔄</button>
                </div>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                  <option value="">-- Select Alpha --</option>
                  {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${Number(w.roi || w.metrics?.roi || 0).toFixed(1)}%)`}</option>)}
                </select>
              </div>

              <div className="tabs flex gap-2 mb-6"> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single Layer</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo Layers</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' ? (
                   <div><label className="text-neutral-400 text-xs">⚡ Core TA Engine</label>
                    <select value={formData.strategyId} onChange={(e) => {
                        const opt = strategyOptions.find(o => o._id === e.target.value);
                        setFormData({...formData, strategyId: e.target.value, code: opt?.code || ""});
                    }} className={inputClass}>
                        <option value="">-- Select Strategy --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select></div>
                ) : (
                    <div className="space-y-3">
                        <label className="text-emerald-400 text-xs font-bold uppercase">Strategy Layers</label>
                        {comboData.strategies.map((s, i) => (
                            <div key={i} className="flex gap-2">
                                <select className={inputClass} value={s.strategyId} onChange={(e) => {
                                    const opt = strategyOptions.find(o => o._id === e.target.value);
                                    const n = [...comboData.strategies]; n[i] = {strategyId: e.target.value, code: opt?.code || ""};
                                    setComboData({...comboData, strategies: n});
                                }}><option value="">-- Select Engine --</option>{strategyOptions.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select>
                                <button type="button" onClick={()=>setComboData({...comboData, strategies: comboData.strategies.filter((_, idx)=>idx!==i)})} className="text-rose-400 px-2">✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={()=>setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: "", code: ""}]})} className="w-full py-2 bg-white/5 border border-dashed border-white/20 rounded-xl text-xs text-emerald-400">+ Add Layer</button>
                        <select name="combinationRule" value={comboData.comboConfig.combinationRule} onChange={(e)=>setComboData({...comboData, comboConfig: {combinationRule: e.target.value}})} className={inputClass}><option value="OR">Rule: OR (Any fire)</option><option value="AND">Rule: AND (All fire)</option></select>
                    </div>
                )}

                <CommonBacktestInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models || DEFAULT_MODEL_OPTIONS }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />
                
                <button type="submit" disabled={isSimulating} className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all ${isSimulating ? 'bg-neutral-800 text-neutral-500' : 'bg-emerald-500 text-black'}`}>
                    {isSimulating ? 'Test is Running...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-6">
            {processed ? (
              <div className="animate-in fade-in duration-500">
                <MetricsDisplay metrics={processed.metrics} />
                <div className="bot-card p-6 h-[500px]"><ChartIndependent results={processed} symbol={formData.symbol} /></div>
              </div>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5 bg-transparent"> 
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl ${isSimulating ? 'animate-pulse bg-amber-500/20' : 'bg-emerald-500/10'}`}> {isSimulating ? '⏳' : '🧪'} </div> 
                <h3 className="text-white text-xl mb-2 font-bold">{isSimulating ? 'Simulation Currently Running...' : 'Strategy Sandbox Ready'}</h3> 
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
