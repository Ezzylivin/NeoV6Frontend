import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout"
};

const defaultFilterParams = { minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 10, tslAtrMult: 3.5 };

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

// --- SUB-COMPONENTS (Defined here to fix ReferenceErrors) ---

const CommonBacktestInputs = ({ data, onChange, options, onParamChange }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-neutral-400 text-xs">Symbol</label>
                <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                    <option value="">-- Select --</option>
                    {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
                <div><label className="text-neutral-400 text-xs">Timeframe</label>
                <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                    <option value="">-- Select --</option>
                    {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-neutral-400 text-xs">Start Date</label><input type="date" name="startDate" value={data.startDate} onChange={onChange} className={inputClass}/></div>
                <div><label className="text-neutral-400 text-xs">End Date</label><input type="date" name="endDate" value={data.endDate} onChange={onChange} className={inputClass}/></div>
            </div>
            <div className="bot-card p-4 border-emerald-500/20 bg-emerald-500/5">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-neutral-400 text-xs">ML Mode</label><select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}><option value="off">Off</option><option value="predictions">Hybrid</option></select></div>
                    {data.mlMode !== 'off' && (
                        <div><label className="text-neutral-400 text-xs">Threshold</label><input type="number" name="mlThreshold" value={data.mlThreshold} onChange={onChange} step="0.05" className={inputClass}/></div>
                    )}
                </div>
            </div>
            <div className="bot-card p-4 border-white/5">
                <label className="text-white text-xs font-bold mb-3 block uppercase">Advanced Filters</label>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-neutral-400 text-xs">Min ATR %</label><input type="number" value={data.params?.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', e.target.value)} step="0.05" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Trend Filter</label><input type="number" value={data.params?.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', e.target.value)} className={inputClass}/></div>
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
        <button type="button" onClick={() => onRemove(idx)} className="text-rose-400 text-xs">✕</button>
      </div>
      <select value={config.strategyId} onChange={(e) => onChange(e, idx)} className={inputClass}>
        <option value="">-- Select Engine --</option>
        {strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
    </div>
  );
};

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

  const [formData, setFormData] = useState({ symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, strategyId: "", params: {...defaultFilterParams}, mlMode: "off" });
  const [comboData, setComboData] = useState({ symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, strategies: [{strategyId: ""}], comboConfig: { combinationRule: "OR" }, params: {...defaultFilterParams}, mlMode: "off" });

  // Load Initial Options
  useEffect(() => { fetchOptions(); }, []);

  // Fetch Winners (Wrapper to prevent infinite loops)
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

    const update = { symbol: matchedSymbol, timeframe: config.timeframe || "1h", mlMode: config.mlMode || "predictions", mlModel: config.mlModel, params: { ...defaultFilterParams, ...config.params } };
    
    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update }));
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
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{`${w.symbol} (ROI: ${w.roi || 0}%)`}</option>)}
                </select>
              </div>

              <div className="tabs flex gap-2 mb-6"> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' && (
                    <div><label className="text-neutral-400 text-xs">⚡ Engine</label>
                    <select value={formData.strategyId} onChange={(e)=>setFormData({...formData, strategyId: e.target.value})} className={inputClass}>
                        <option value="">-- Select --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select></div>
                )}

                <CommonBacktestInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />

                {activeTab === 'combo' && (
                    <div className="space-y-2">
                        <label className="text-emerald-400 text-xs font-bold uppercase">Logic Layers</label>
                        {comboData.strategies.map((s, i) => (
                            <ComboStrategyCard key={i} idx={i} config={s} strategies={strategyOptions} onRemove={(idx) => setComboData({...comboData, strategies: comboData.strategies.filter((_, n)=> n !== idx)})} onChange={(e, idx) => {
                                const newStrats = [...comboData.strategies];
                                newStrats[idx].strategyId = e.target.value;
                                setComboData({...comboData, strategies: newStrats});
                            }} />
                        ))}
                        <button type="button" onClick={() => setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: ""}]})} className="w-full py-2 border-dashed border border-white/20 rounded-xl text-xs text-emerald-400">+ Add Layer</button>
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
                <div className="grid grid-cols-4 gap-4">
                    {[{l:"ROI", v:processed.metrics.totalReturn, f:"%"}, {l:"Expectancy", v:processed.metrics.expectancy, f:"$"}, {l:"Win Rate", v:processed.metrics.winRate, f:"%"}, {l:"Trades", v:processed.metrics.totalTrades}].map((i, idx) => (
                        <div key={idx} className="bot-card p-4 text-center">
                            <div className="text-neutral-400 text-[10px] uppercase font-bold">{i.l}</div>
                            <div className="text-xl font-bold text-white">{i.f==="$" && "$"}{i.v?.toFixed(2)}{i.f==="%" && "%"}</div>
                        </div>
                    ))}
                </div>
                <div className="bot-card p-6 h-[500px]"> 
                  <ChartIndependent results={processed} symbol={formData.symbol} /> 
                </div>
              </>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5"> 
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl ${isSimulating ? 'animate-pulse bg-amber-500/20' : 'bg-emerald-500/10'}`}> {isSimulating ? '⏳' : '🧪'} </div> 
                <h3 className="text-white text-xl mb-2 font-bold">{isSimulating ? 'Simulation Currently Running...' : 'Strategy Sandbox Ready'}</h3> 
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
