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

// --- 🟢 SYNCED CONSTANTS (Strict match with strategies.py Registry) ---
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
    tslAtrMult: 3.0, 
    minAdxLevel: 20, // Regime Filter trigger
    commission: 0.001,
    slippage: 0.0005
};

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors disabled:opacity-50";

// --- SUB-COMPONENTS (Analytics Dashboard) ---

const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
            { l: "Total ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Trade Count", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Sharpe Ratio", v: (metrics.sharpeRatio || 0).toFixed(2), c: "text-amber-400" },
            { l: "Expectancy", v: `$${(metrics.expectancy || 0).toFixed(2)}`, c: "text-neutral-300" },
            { l: "Avg Win", v: `$${(metrics.averageWin || 0).toFixed(2)}`, c: "text-emerald-500" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center border-white/5 bg-black/40 shadow-xl rounded-2xl border">
                <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mb-1">{m.l}</div>
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
                <div><label className="text-neutral-400 text-[10px] uppercase font-bold">Trading Pair</label>
                <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                    <option value="BTC-USD">BTC-USD</option>
                    <option value="ETH-USD">ETH-USD</option>
                    <option value="SOL-USD">SOL-USD</option>
                </select></div>
                <div><label className="text-neutral-400 text-[10px] uppercase font-bold">Timeframe</label>
                <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                    <option value="1h">1h (Standard)</option>
                    <option value="15m">15m (Scalp)</option>
                </select></div>
            </div>

            <div className="bot-card bg-emerald-500/5 border-emerald-500/20 p-4 rounded-2xl border">
                <div className="panel-header mb-4 pb-2 border-b border-emerald-500/20">
                    <h4 className="text-emerald-400 font-bold uppercase text-[10px]">ATR Risk Engine</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold">Account Risk %</label>
                        <input type="number" name="risk_percentage" value={data.risk_percentage} onChange={onChange} step="0.1" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold">ML Veto Filter</label>
                        <select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}>
                            <option value="off">Off</option>
                            <option value="predictions">Active</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bot-card p-4 border-white/10 rounded-2xl border bg-black/20">
                <div className="panel-header mb-4 pb-2 border-b border-white/10">
                    <h4 className="text-white font-bold uppercase text-[10px]">Regime Controls</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-neutral-400 text-[10px] uppercase font-bold">Trailing Stop</label><input type="number" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} step="0.1" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-[10px] uppercase font-bold">Chop Filter (ADX)</label><input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
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
    symbol: "BTC-USD", timeframe: "1h", initialBalance: 1000, 
    strategyId: "", code: "", risk_mode: 'static', risk_percentage: 1.0, 
    params: {...defaultFilterParams}, mlMode: "off", mlModel: "" 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "BTC-USD", timeframe: "1h", initialBalance: 1000, 
    strategies: [{strategyId: "", code: ""}], comboConfig: { combinationRule: "OR" }, 
    risk_mode: 'static', risk_percentage: 1.0, params: {...defaultFilterParams}, mlMode: "off"
  });

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, [fetchOptions]);

  // 🟢 401 AUTH FIX: Fetch winners with JWT
  const loadWinners = useCallback(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const winnersData = Array.isArray(res.data) ? res.data : (res.data.winners || []);
        setLiveWinners(winnersData);
        console.log("✅ Dropdown Synced:", winnersData.length, "alpha files found.");
      } catch (err) { 
          console.error("❌ Winner Authorization Failed. Please Log In Again."); 
      }
  }, []);

  useEffect(() => { loadWinners(); }, [loadWinners]);

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => ({ _id: `base-${code}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 

    const activeData = activeTab === 'combo' ? { ...comboData } : { ...formData };
    
    if (activeTab === 'single' && !activeData.code && activeData.strategyId) {
        const opt = strategyOptions.find(o => o._id === activeData.strategyId);
        activeData.code = opt?.code || "";
    }

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const res = await runner(activeData);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  // 🟢 📊 COMPREHENSIVE ANALYTICS MAPPING
  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const candles = backtestResults.candleData || backtestResults.combinedResult?.candleData || [];
    const trades = backtestResults.trades || backtestResults.combinedResult?.trades || [];
    const metrics = backtestResults.metrics || backtestResults.combinedResult?.metrics || {};

    // Win/Loss Pie Distribution
    const wins = trades.filter(t => t.profit > 0).length;
    const losses = trades.filter(t => t.profit <= 0).length;
    const pieData = [
        { name: 'Wins', value: wins },
        { name: 'Losses', value: losses }
    ];

    // Monthly Profit Grouping
    const monthlyData = trades.reduce((acc, trade) => {
        const ts = trade.time || (trade.entryTime ? new Date(trade.entryTime).getTime()/1000 : 0);
        const month = new Date(ts * 1000).toLocaleString('default', { month: 'short' });
        if (!acc[month]) acc[month] = 0;
        acc[month] += trade.profit;
        return acc;
    }, {});
    const barData = Object.entries(monthlyData).map(([name, pnl]) => ({ name, pnl }));

    return { candleData: candles, trades, metrics, pieData, barData };
  }, [backtestResults]);

  return (
    <div className="backtest-container p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT: CONTROL PANEL */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-6 bg-black/60 border-emerald-500/10 rounded-3xl sticky top-8 border shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-bold text-sm tracking-tight uppercase">🧪 Strategy Sandbox</h2>
                <button type="button" onClick={loadWinners} className="text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/10 px-3 py-1 rounded-full transition-all">🔄 Sync Database</button>
              </div>

              <select value={selectedWinnerId} onChange={(e) => setSelectedWinnerId(e.target.value)} className={inputClass + " mb-6 text-xs"}>
                <option value="">-- Load High-Alpha Strategy --</option>
                {liveWinners.map(w => <option key={w.id} value={w.id}>{`${w.symbol} (ROI: ${w.roi}%)`}</option>)}
              </select>

              <div className="tabs flex gap-2 mb-6 bg-white/5 p-1 rounded-xl"> 
                <button type="button" className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black' : 'text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single Core</button> 
                <button type="button" className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black' : 'text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Hybrid Combo</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' ? (
                   <div><label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Technical Engine</label>
                    <select value={formData.strategyId} onChange={(e) => {
                        const opt = strategyOptions.find(o => o._id === e.target.value);
                        setFormData({...formData, strategyId: e.target.value, code: opt?.code || ""});
                    }} className={inputClass}>
                        <option value="">-- Select Strategy --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select></div>
                ) : (
                    <div className="space-y-3">
                        <label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Signal Weighting Layers</label>
                        {comboData.strategies.map((s, i) => (
                            <div key={i} className="flex gap-2">
                                <select className={inputClass + " text-xs"} value={s.strategyId} onChange={(e) => {
                                    const opt = strategyOptions.find(o => o._id === e.target.value);
                                    const n = [...comboData.strategies]; n[i] = {strategyId: e.target.value, code: opt?.code || ""};
                                    setComboData({...comboData, strategies: n});
                                }}><option value="">-- Engine --</option>{strategyOptions.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select>
                                <button type="button" onClick={()=>setComboData({...comboData, strategies: comboData.strategies.filter((_, idx)=>idx!==i)})} className="text-rose-400 px-1">✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={()=>setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: "", code: ""}]})} className="w-full py-2 border-dashed border border-white/20 rounded-xl text-[10px] text-emerald-400 uppercase font-bold hover:bg-white/5">+ Add Hybrid Layer</button>
                    </div>
                )}

                <CommonInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />
                
                <button type="submit" disabled={isSimulating} className={`w-full py-4 font-bold rounded-2xl shadow-xl transition-all ${isSimulating ? 'bg-neutral-800 text-neutral-500 animate-pulse cursor-wait' : 'bg-emerald-500 text-black hover:scale-[1.02] active:scale-95'}`}>
                    {isSimulating ? '🔬 PROCESSING MARKET DATA...' : '▶ RUN EXECUTIVE BACKTEST'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: ANALYTICS & RESULTS */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {processed ? (
              <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold uppercase tracking-widest text-xs opacity-70">Mathematical Verification: {formData.symbol}</h3>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setDisplayMode('static')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${displayMode === 'static' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}>Static Report</button>
                        <button onClick={() => setDisplayMode('replay')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${displayMode === 'replay' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}>Market Replay</button>
                    </div>
                </div>

                <MetricsGrid metrics={processed.metrics} />

                {/* 📊 ADVANCED ANALYTICS ROW */}
                <div className="grid grid-cols-12 gap-6 mb-6">
                    <div className="col-span-12 md:col-span-4 bot-card p-6 bg-black/40 border-white/5 h-[320px] rounded-3xl border">
                        <h4 className="text-white font-bold text-[10px] uppercase mb-4 opacity-50">Equity Split</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={processed.pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                    <Cell fill="#10b981" stroke="none" />
                                    <Cell fill="#ef4444" stroke="none" />
                                </Pie>
                                <RechartTooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '15px', fontSize: '11px' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', textTransform: 'uppercase'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="col-span-12 md:col-span-8 bot-card p-6 bg-black/40 border-white/5 h-[320px] rounded-3xl border">
                        <h4 className="text-white font-bold text-[10px] uppercase mb-4 opacity-50">Consistency (Monthly PnL)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processed.barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <RechartTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '15px' }} />
                                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                                    {processed.barData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl > 0 ? '#10b981' : '#ef4444'} fillOpacity={0.6} stroke={entry.pnl > 0 ? '#10b981' : '#ef4444'} strokeWidth={1} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* 📈 MAIN OHLC CHART */}
                <div className="bot-card p-4 h-[650px] border-white/5 relative bg-black/40 rounded-3xl border overflow-hidden shadow-2xl">
                  {displayMode === 'static' ? <ChartIndependent results={processed} symbol={formData.symbol} /> : <ChartReplay results={processed} symbol={formData.symbol} />}
                </div>

              </div>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[900px] border-dashed border-2 border-white/5 bg-black/20 text-center rounded-[40px]"> 
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 text-5xl bg-emerald-500/5 border border-emerald-500/20 animate-pulse shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]">🔬</div> 
                <h3 className="text-white text-2xl mb-4 font-bold uppercase tracking-tight">Executive Simulation Environment</h3> 
                <p className="text-neutral-500 max-w-sm text-sm leading-relaxed">Select a high-alpha strategy to run a mathematically infallible verification against historical market cycles.</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
