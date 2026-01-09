import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

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
    minAtrPct: 0.5, 
    trendFilterPeriod: 200, 
    minAdxLevel: 10, 
    tslAtrMult: 3.5, 
    regime_threshold: 25 
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

// --- SUB-COMPONENTS (Exhaustive Restoration) ---

const CommonBacktestInputs = ({ data, onChange, options, onParamChange }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const params = data.params || {};

    return (
        <div className="space-y-6">
            {/* Core Data Group */}
            <div className="form-grid">
                <div className="setup-selector">
                    <label className="text-neutral-400 text-xs">Symbol</label>
                    <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                        <option value="">-- Select --</option>
                        {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="setup-selector">
                    <label className="text-neutral-400 text-xs">Timeframe</label>
                    <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                        <option value="">-- Select --</option>
                        {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="setup-selector">
                    <label className="text-neutral-400 text-xs">Initial Balance</label>
                    <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} className={inputClass} />
                </div>
            </div>

            {/* Date Group */}
            <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                <div><label className="text-neutral-400 text-xs">Start Date</label><input type="date" name="startDate" value={data.startDate} onChange={onChange} className={inputClass}/></div>
                <div><label className="text-neutral-400 text-xs">End Date</label><input type="date" name="endDate" value={data.endDate} onChange={onChange} className={inputClass}/></div>
            </div>

            {/* Risk & ML Configuration Block */}
            <div className="bot-card bg-emerald-500/5 border-emerald-500/20 p-4">
                <div className="panel-header mb-4 pb-2 border-b border-emerald-500/20"><h4 className="text-emerald-400 font-bold">ML & Risk Configuration</h4></div>
                <div className="form-grid">
                    <div className="setup-selector">
                        <label className="text-neutral-400 text-xs">Risk Mode</label>
                        <select name="riskManagementMode" value={data.riskManagementMode || 'static'} onChange={onChange} className={inputClass}>
                            <option value="static">Standard (Static %)</option>
                            <option value="dynamic">Dynamic (Growth Target)</option>
                        </select>
                    </div>
                    <div className="setup-selector">
                        <label className="text-neutral-400 text-xs">Risk %</label>
                        <input type="number" name="riskPercentage" value={data.riskPercentage || 1} onChange={onChange} step="0.1" className={inputClass} />
                    </div>
                    <div className="setup-selector">
                        <label className="text-neutral-400 text-xs">ML Mode</label>
                        <select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}>
                            <option value="off">Off (Pure TA)</option>
                            <option value="predictions">Hybrid (TA+ML)</option>
                        </select>
                    </div>
                    {data.mlMode !== 'off' && (
                        <>
                            <div className="setup-selector">
                                <label className="text-neutral-400 text-xs">Model</label>
                                <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                                    <option value="">-- Select Model --</option>
                                    {(options.modelOptions || DEFAULT_MODEL_OPTIONS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="setup-selector">
                                <label className="text-neutral-400 text-xs">Threshold</label>
                                <input type="number" name="mlThreshold" value={data.mlThreshold} onChange={onChange} step="0.05" className={inputClass}/>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Advanced Filters Block */}
            <div className="bot-card p-4 border-white/10">
                <div className="panel-header mb-4 pb-2 border-b border-white/10"><h4 className="text-white font-bold uppercase text-xs">Advanced TA Filters</h4></div>
                <div className="form-grid">
                    <div><label className="text-neutral-400 text-xs">Min ATR %</label><input type="number" value={params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', e.target.value)} step="0.05" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Min ADX</label><input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', e.target.value)} className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">TSL ATR Mult</label><input type="number" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', e.target.value)} step="0.1" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Trend SMA</label><input type="number" value={params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', e.target.value)} className={inputClass}/></div>
                </div>
            </div>
        </div>
    );
};

const ComboStrategyCard = ({ idx, config, strategies, onChange, onRemove }) => {
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2 text-white text-sm";
  return (
    <div className="bot-card p-3 border-emerald-500/20 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-emerald-400">Layer #{idx + 1}</span>
        <button type="button" onClick={() => onRemove(idx)} className="text-rose-400 text-xs hover:scale-110">✕</button>
      </div>
      <select value={config.strategyId} onChange={(e) => onChange(e, idx)} className={inputClass}>
        <option value="">-- Select Engine --</option>
        {strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
    </div>
  );
};

const MetricsDisplay = ({ metrics }) => (
    <div className="metrics-grid mb-6">
        {[
          { label: "Total Return", value: metrics.totalReturn, format: 'percent', color: 'text-emerald-400' },
          { label: "Profit Factor", value: metrics.profitFactor, format: 'number', color: 'text-teal-400' },
          { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent', color: 'text-amber-400' },
          { label: "Win Rate", value: metrics.winRate, format: 'percent', color: 'text-violet-400' },
          { label: "Total Trades", value: metrics.totalTrades, format: null, color: 'text-cyan-400' },
          { label: "Avg. Win", value: metrics.averageWin, format: 'currency', color: 'text-emerald-400' },
          { label: "Avg. Loss", value: metrics.averageLoss, format: 'currency', color: 'text-rose-400' },
          { label: "Final Balance", value: metrics.finalBalance, format: 'currency', color: 'text-emerald-400' }
        ].map((m, idx) => (
          <div key={idx} className="metric-item hover:shadow-lg transition-all group">
            <span className="metric-label">{m.label}</span>
            <div className={`metric-value ${m.color}`}>
              {m.format === 'currency' ? `$${m.value?.toFixed(2)}` : m.format === 'percent' ? `${m.value?.toFixed(2)}%` : m.value}
            </div>
          </div>
        ))}
    </div>
);

// --- MAIN PAGE ---

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ 
      symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, 
      initialBalance: 1000, strategyId: "", riskManagementMode: 'static', riskPercentage: 1, 
      params: {...defaultFilterParams}, mlMode: "off", mlModel: "", mlThreshold: 0.5 
  });
  const [comboData, setComboData] = useState({ 
      symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, 
      initialBalance: 1000, strategies: [{strategyId: ""}], comboConfig: { combinationRule: "OR" }, 
      riskManagementMode: 'static', riskPercentage: 1, params: {...defaultFilterParams}, mlMode: "off", mlModel: "", mlThreshold: 0.5 
  });

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, []);

  const loadWinners = useCallback(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error("Fetch Error:", err); }
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

    const update = { 
        symbol: matchedSymbol, 
        timeframe: config.timeframe || "1h", 
        mlMode: config.mlMode || "predictions", 
        mlModel: config.mlModel, 
        mlThreshold: config.mlThreshold || 0.5,
        params: { ...defaultFilterParams, ...config.params } 
    };
    
    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const data = activeTab === 'combo' ? comboData : formData;

    if (typeof runner === 'function') {
        const res = await runner(data);
        if (res) setBacktestResults(res);
    }
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    return { 
        candleData: res.candleData || [], 
        trades: res.trades || res.tradeBreakdown || [], 
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
                    <button type="button" onClick={loadWinners} className="text-emerald-400">🔄</button>
                </div>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                  <option value="">-- Select Alpha --</option>
                  {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${w.roi || 0}%)`}</option>)}
                </select>
              </div>

              <div className="tabs flex gap-2 mb-6"> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single Layer</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo Layers</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' && (
                    <div><label className="text-neutral-400 text-xs">⚡ Core TA Engine</label>
                    <select value={formData.strategyId} onChange={(e)=>setFormData({...formData, strategyId: e.target.value})} className={inputClass}>
                        <option value="">-- Select Strategy --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select></div>
                )}

                <CommonBacktestInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models || DEFAULT_MODEL_OPTIONS }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />

                {activeTab === 'combo' && (
                    <div className="space-y-3">
                        <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Strategy Logic Layers</label>
                        {comboData.strategies.map((s, i) => (
                            <ComboStrategyCard key={i} idx={i} config={s} strategies={strategyOptions} onRemove={(idx) => setComboData({...comboData, strategies: comboData.strategies.filter((_, n)=> n !== idx)})} onChange={(e, idx) => {
                                const newStrats = [...comboData.strategies];
                                newStrats[idx].strategyId = e.target.value;
                                setComboData({...comboData, strategies: newStrats});
                            }} />
                        ))}
                        <button type="button" onClick={() => setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: ""}]})} className="w-full py-2 border-dashed border border-white/20 rounded-xl text-xs text-emerald-400">+ Add New Layer</button>
                    </div>
                )}

                <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-all">
                    {isSimulating ? 'Test is Running...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-6">
            {processed ? (
              <>
                <MetricsDisplay metrics={processed.metrics} />
                <div className="bot-card p-6 h-[500px]"> 
                  <ChartIndependent results={processed} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} /> 
                </div>
              </>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5"> 
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl ${isSimulating ? 'animate-pulse bg-amber-500/20' : 'bg-emerald-500/10'}`}> {isSimulating ? '⏳' : '🧪'} </div> 
                <h3 className="text-white text-xl mb-2 font-bold">{isSimulating ? 'Simulation Currently Running...' : 'Strategy Sandbox Ready'}</h3> 
                <p className="text-neutral-400 text-center max-w-sm">Load an Alpha Strategy or chain logic layers to start.</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
