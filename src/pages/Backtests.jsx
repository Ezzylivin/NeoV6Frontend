import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx";
import "./Backtests.css"; 

// --- 🟢 FULL REGISTRY SYNC (Strict match with Python strategies.py) ---
const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", 
  "RSI Threshold": "rsi_threshold", 
  "MACD Crossover": "macd_crossover",
  "RSI Divergence": "rsi_divergence", 
  "Bollinger Break": "bollinger_break", 
  "ATR Breakout": "atr_breakout",
  "Stochastic": "stoch_crossover", 
  "ADX Trend": "adx_trend", 
  "Ichimoku Cloud": "ichimoku_break",
  "Volume Spike": "volume_spike"
};

const DEFAULT_MODEL_OPTIONS = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" }
];

const defaultFilterParams = { 
    minAtrPct: 0.5, 
    trendFilterPeriod: 200, 
    minAdxLevel: 20, 
    tslAtrMult: 3.0, 
    commission: 0.001,
    slippage: 0.0005,
    regime_threshold: 25 
};

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none hover:border-white/20";

// --- SUB-COMPONENTS ---

const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
            { l: "ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Total Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Expectancy", v: `$${(metrics.expectancy || 0).toFixed(2)}`, c: "text-amber-500" },
            { l: "Sharpe", v: (metrics.sharpeRatio || 0).toFixed(2), c: "text-indigo-400" },
            { l: "Avg Win", v: `$${(metrics.averageWin || 0).toFixed(2)}`, c: "text-emerald-500" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center bg-black/40 border border-white/5 rounded-2xl shadow-xl">
                <div className="text-neutral-500 text-[9px] uppercase font-black tracking-[0.2em] mb-1">{m.l}</div>
                <div className={`text-lg font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);

const CommonInputs = ({ data, onChange, options, onParamChange }) => {
    const params = data.params || defaultFilterParams;
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Symbol</label>
                  <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                      <option value="BTC-USD">BTC-USD</option>
                      <option value="ETH-USD">ETH-USD</option>
                      <option value="SOL-USD">SOL-USD</option>
                      {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Timeframe</label>
                  <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                      <option value="1h">1h</option>
                      <option value="15m">15m</option>
                      <option value="4h">4h</option>
                  </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Start Date</label>
                  <input type="date" name="startDate" value={data.startDate} onChange={onChange} className={inputClass} />
                </div>
                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">End Date</label>
                  <input type="date" name="endDate" value={data.endDate} onChange={onChange} className={inputClass} />
                </div>
            </div>

            <div className={`bot-card p-5 rounded-2xl border transition-all duration-500 ${data.mlMode !== 'off' ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-black/40 border-white/5'}`}>
                <h4 className="text-emerald-400 font-black uppercase text-[10px] tracking-widest mb-4 border-b border-emerald-500/10 pb-2">Intelligence & Sizing</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase mb-1 block">Initial Balance</label>
                      <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} className={inputClass} />
                    </div>
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase mb-1 block">Risk % (ATR Sizing)</label>
                      <input type="number" name="risk_percentage" value={data.risk_percentage} onChange={onChange} step="0.1" className={inputClass} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase mb-1 block">ML Filter</label>
                      <select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}>
                          <option value="off">Off (TA Only)</option>
                          <option value="predictions">Hybrid (ML Veto)</option>
                      </select>
                    </div>
                    {data.mlMode !== 'off' && (
                        <div className="animate-in fade-in zoom-in duration-300">
                          <label className="text-neutral-400 text-[10px] uppercase mb-1 block">Intelligence Model</label>
                          <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                              <option value="">-- Choose Model --</option>
                              {(options.modelOptions || DEFAULT_MODEL_OPTIONS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="bot-card p-5 border border-white/5 bg-white/5 rounded-2xl">
                <h4 className="text-white font-black uppercase text-[10px] tracking-widest mb-4 border-b border-white/5 pb-2">Trend Regime & Execution</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-neutral-500 text-[10px] uppercase mb-1 block">Min ATR %</label><input type="number" value={params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', parseFloat(e.target.value))} step="0.1" className={inputClass}/></div>
                    <div><label className="text-neutral-500 text-[10px] uppercase mb-1 block">TSL ATR Mult</label><input type="number" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} step="0.1" className={inputClass}/></div>
                    <div><label className="text-neutral-500 text-[10px] uppercase mb-1 block">ADX Regime Level</label><input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                    <div><label className="text-neutral-500 text-[10px] uppercase mb-1 block">Trend Filter SMA</label><input type="number" value={params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                </div>
            </div>
        </div>
    );
};

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
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, strategyId: "", code: "", risk_mode: 'static', risk_percentage: 1, 
    params: {...defaultFilterParams}, mlMode: "off", mlModel: "" 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, strategies: [{strategyId: "", code: ""}], comboConfig: { combinationRule: "OR" }, 
    risk_mode: 'static', risk_percentage: 1, params: {...defaultFilterParams}, mlMode: "off"
  });

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, [fetchOptions]);

  const loadWinners = useCallback(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
            headers: { Authorization: `Bearer ${token}` }
        });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error("Winner load failed - log in required:", err); }
  }, []);

  useEffect(() => { loadWinners(); }, [loadWinners]);

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => ({ _id: `base-${code}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  // 🟢 🎯 THE MASTER AUTO-POPULATOR & TAB-SWITCHER
  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    if (!id) return;
    
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;
    
    const config = win.config || win;
    
    const resolvedStrats = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "sma_crossover");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || `base-${code}`, code: code, params: s.params || {} };
    });

    const update = { 
        symbol: config.symbol || "BTC-USD", 
        timeframe: config.timeframe || "1h", 
        startDate: config.startDate || "2025-01-01",
        endDate: config.endDate || "2026-01-01",
        initialBalance: config.initialBalance || 1000,
        risk_mode: config.risk_mode || 'static',
        risk_percentage: config.risk_percentage || 1.0,
        mlMode: config.mlMode || (config.mlModel ? "predictions" : "off"), 
        mlModel: config.mlModel || "",
        params: { 
            ...defaultFilterParams, 
            ...(config.params || {}),
            minAdxLevel: config.params?.minAdxLevel || config.params?.min_adx || 20,
            trendFilterPeriod: config.params?.trendFilterPeriod || 200,
            tslAtrMult: config.params?.tslAtrMult || 3.0,
            minAtrPct: config.params?.minAtrPct || 0.5
        },
        strategyId: resolvedStrats[0]?.strategyId || "",
        code: resolvedStrats[0]?.code || "sma_crossover" 
    };

    // Update state objects
    setFormData(prev => ({ ...prev, ...update }));
    setComboData(prev => ({ ...prev, ...update, strategies: resolvedStrats }));
    
    // 🟢 FORCED TAB SWITCH
    if (resolvedStrats.length > 1) {
        setActiveTab('combo');
    } else {
        setActiveTab('single');
    }
    
    console.log(`✅ ALPHA SYNC: ${resolvedStrats.length} Layer(s) | Tab: ${resolvedStrats.length > 1 ? 'Hybrid' : 'Atomic'}`);
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 

    const activeData = activeTab === 'combo' ? { ...comboData } : { ...formData };
    if (!activeData.code && activeData.strategyId) {
        const opt = strategyOptions.find(o => o._id === activeData.strategyId);
        activeData.code = opt?.code || "";
    }

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const res = await runner(activeData);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const raw = backtestResults.combinedResult || backtestResults;
    const trades = raw.trades || [];
    const wins = trades.filter(t => t.profit > 0).length;
    const losses = trades.filter(t => t.profit <= 0).length;

    const monthlyData = trades.reduce((acc, trade) => {
        const ts = trade.time || (trade.entryTime ? new Date(trade.entryTime).getTime()/1000 : 0);
        const m = new Date(ts * 1000).toLocaleString('default', { month: 'short' });
        acc[m] = (acc[m] || 0) + trade.profit;
        return acc;
    }, {});

    return { 
        candleData: raw.candleData || [], 
        trades, 
        metrics: raw.metrics || {},
        pieData: [{ name: 'Wins', value: wins }, { name: 'Losses', value: losses }],
        barData: Object.entries(monthlyData).map(([name, pnl]) => ({ name, pnl }))
    };
  }, [backtestResults]);

  return (
    <div className="backtest-container p-6 md:p-10 space-y-10 max-w-[1800px] mx-auto bg-[#030303]">
        <div className="grid grid-cols-12 gap-10">
          
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-7 bg-black/60 border border-white/5 rounded-[32px] sticky top-10 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-white font-black text-xs tracking-[0.3em] uppercase">🧪 Strategy Sandbox</h2>
                <button type="button" onClick={loadWinners} className="text-emerald-400 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Sync Alpha</button>
              </div>

              <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass + " mb-8"}>
                <option value="">-- Load Winning Alpha Configuration --</option>
                {liveWinners.map(w => <option key={w.id} value={w.id}>{`${w.symbol} (ROI: ${w.roi}%)`}</option>)}
              </select>

              <div className="tabs flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl"> 
                <button type="button" className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black shadow-lg' : 'text-neutral-500'}`} onClick={() => setActiveTab('single')}>Atomic</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black shadow-lg' : 'text-neutral-500'}`} onClick={() => setActiveTab('combo')}>Hybrid</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-8">
                {activeTab === 'single' ? (
                   <div><label className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-3 block">Primary Logic</label>
                    <select value={formData.strategyId} onChange={(e) => {
                        const opt = strategyOptions.find(o => o._id === e.target.value);
                        setFormData({...formData, strategyId: e.target.value, code: opt?.code || ""});
                    }} className={inputClass}>
                        <option value="">-- Choose Technical Core --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select></div>
                ) : (
                    <div className="space-y-4">
                        <label className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-1 block">Weighted Layers</label>
                        {comboData.strategies.map((s, i) => (
                            <div key={i} className="flex gap-2">
                                <select className={inputClass} value={s.strategyId} onChange={(e) => {
                                    const opt = strategyOptions.find(o => o._id === e.target.value);
                                    const n = [...comboData.strategies]; n[i] = {strategyId: e.target.value, code: opt?.code || ""};
                                    setComboData({...comboData, strategies: n});
                                }}><option value="">-- Signal Layer --</option>{strategyOptions.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select>
                                <button type="button" onClick={()=>setComboData({...comboData, strategies: comboData.strategies.filter((_, idx)=>idx!==i)})} className="text-rose-500 px-2 text-xl hover:scale-110 transition-transform">✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={()=>setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: "", code: ""}]})} className="w-full py-3 border-dashed border-2 border-white/10 rounded-2xl text-[9px] text-emerald-400 uppercase font-black tracking-widest hover:bg-emerald-500/5 transition-all">+ Add Decision Layer</button>
                    </div>
                )}

                <CommonInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />
                
                <button type="submit" disabled={isSimulating} className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all ${isSimulating ? 'bg-neutral-800 text-neutral-500 animate-pulse' : 'bg-emerald-500 text-black hover:scale-[1.02] active:scale-95'}`}>
                    {isSimulating ? '🔬 CRUNCHING HISTORY...' : '▶ EXECUTE VERIFICATION'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-8">
            {processed ? (
              <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] opacity-60">Verification Report: {formData.symbol}</h3>
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <button onClick={() => setDisplayMode('static')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${displayMode === 'static' ? 'bg-white/10 text-white shadow-lg' : 'text-neutral-500'}`}>Static</button>
                        <button onClick={() => setDisplayMode('replay')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${displayMode === 'replay' ? 'bg-white/10 text-white shadow-lg' : 'text-neutral-500'}`}>Replay</button>
                    </div>
                </div>

                <MetricsGrid metrics={processed.metrics} />

                <div className="grid grid-cols-12 gap-8 mb-8">
                    <div className="col-span-12 md:col-span-4 bot-card p-7 bg-black/40 border border-white/5 h-[340px] rounded-[32px]">
                        <h4 className="text-neutral-500 font-black text-[9px] uppercase tracking-widest mb-6">Win Distribution</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={processed.pieData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                                    <Cell fill="#10b981" stroke="none" />
                                    <Cell fill="#ef4444" stroke="none" />
                                </Pie>
                                <RechartTooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '9px', textTransform: 'uppercase', fontWeight: '900'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="col-span-12 md:col-span-8 bot-card p-7 bg-black/40 border border-white/5 h-[340px] rounded-[32px]">
                        <h4 className="text-neutral-500 font-black text-[9px] uppercase tracking-widest mb-6">Equity Momentum (Monthly)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processed.barData}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#ffffff03" vertical={false} />
                                <XAxis dataKey="name" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <RechartTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                                <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
                                    {processed.barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl > 0 ? '#10b981' : '#ef4444'} fillOpacity={0.6} stroke={entry.pnl > 0 ? '#10b981' : '#ef4444'} strokeWidth={1.5} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="bot-card p-5 h-[680px] border border-white/5 relative bg-black/40 rounded-[32px] overflow-hidden shadow-2xl">
                  {displayMode === 'static' ? <ChartIndependent results={processed} symbol={formData.symbol} /> : <ChartReplay results={processed} symbol={formData.symbol} />}
                </div>

              </div>
            ) : (
              <div className="bot-card p-24 flex flex-col items-center justify-center min-h-[900px] border-2 border-dashed border-white/5 bg-black/20 text-center rounded-[48px]"> 
                <div className="w-28 h-28 rounded-full flex items-center justify-center mb-10 text-5xl bg-emerald-500/5 border border-emerald-500/20 animate-pulse shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)]">🔬</div> 
                <h3 className="text-white text-2xl mb-5 font-black uppercase tracking-[0.2em]">Ready for Verification</h3> 
                <p className="text-neutral-500 max-w-md text-sm leading-relaxed font-medium">Select an Alpha logic layer and timeframe to calculate risk-adjusted alpha against historical market cycles.</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
