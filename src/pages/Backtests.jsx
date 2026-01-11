import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout"
};

const DEFAULT_MODEL_OPTIONS = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" }
];

const defaultFilterParams = { minAtrPct: 0.5, trendFilterPeriod: 200, minAdxLevel: 10, tslAtrMult: 3.5 };

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
};

// --- SUB-COMPONENTS ---

const CommonBacktestInputs = ({ data, onChange, options, onParamChange }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const params = data.params || defaultFilterParams;
    return (
        <div className="space-y-6">
            <div className="form-grid">
                <div className="setup-selector">
                    <label className="text-neutral-400 text-xs">Symbol</label>
                    <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                        <option value="">-- Select Symbol --</option>
                        {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="setup-selector">
                    <label className="text-neutral-400 text-xs">Timeframe</label>
                    <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                        <option value="">-- Select TF --</option>
                        {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="setup-selector">
                    <label className="text-neutral-400 text-xs">Initial Balance</label>
                    <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} className={inputClass} />
                </div>
            </div>
            <div className="bot-card bg-emerald-500/5 border-emerald-500/20 p-4">
                <div className="panel-header mb-4 pb-2 border-b border-emerald-500/20"><h4 className="text-emerald-400 font-bold uppercase text-xs">ML & Risk</h4></div>
                <div className="form-grid">
                    <div className="setup-selector">
                        <label className="text-neutral-400 text-xs">Risk Mode</label>
                        <select name="riskManagementMode" value={data.riskManagementMode} onChange={onChange} className={inputClass}>
                            <option value="static">Standard</option>
                            <option value="dynamic">Dynamic</option>
                        </select>
                    </div>
                    <div className="setup-selector">
                        <label className="text-neutral-400 text-xs">Risk %</label>
                        <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" className={inputClass} />
                    </div>
                    <div className="setup-selector">
                        <label className="text-neutral-400 text-xs">ML Mode</label>
                        <select name="mlMode" value={data.mlMode} onChange={onChange} className={inputClass}>
                            <option value="off">Off</option>
                            <option value="predictions">Hybrid</option>
                        </select>
                    </div>
                    {data.mlMode !== 'off' && (
                        <div className="setup-selector">
                            <label className="text-neutral-400 text-xs">Model</label>
                            <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                                {(options.modelOptions || DEFAULT_MODEL_OPTIONS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>
            <div className="bot-card p-4 border-white/10">
                <div className="panel-header mb-4 pb-2 border-b border-white/10"><h4 className="text-white font-bold uppercase text-xs">Advanced Filters</h4></div>
                <div className="form-grid">
                    <div><label className="text-neutral-400 text-xs">Min ATR %</label><input type="number" value={params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', e.target.value)} step="0.05" className={inputClass}/></div>
                    <div><label className="text-neutral-400 text-xs">Trend SMA</label><input type="number" value={params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', e.target.value)} className={inputClass}/></div>
                </div>
            </div>
        </div>
    );
};

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, strategyId: "", riskManagementMode: 'static', riskPercentage: 1, params: {...defaultFilterParams}, mlMode: "off", mlModel: "", mlThreshold: 0.5 });
  const [comboData, setComboData] = useState({ symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000, strategies: [{strategyId: ""}], comboConfig: { combinationRule: "OR" }, riskManagementMode: 'static', riskPercentage: 1, params: {...defaultFilterParams}, mlMode: "off", mlModel: "", mlThreshold: 0.5 });

  useEffect(() => { 
    console.info("🔍 [Backtest] Initializing Dashboard Options...");
    if (typeof fetchOptions === 'function') fetchOptions(); 
  }, [fetchOptions]);

  const loadWinners = useCallback(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        console.log("✅ [Backtest] API Response (Winners):", res.data);
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error("❌ [Backtest] Fetch Error:", err); }
  }, []);

  useEffect(() => { loadWinners(); }, [loadWinners]);

  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;

    console.group("🎯 [Backtest] Auto-Populating Alpha Strategy");
    console.log("Input Configuration:", win.config || win);

    const config = win.config || win;
    const rawSym = (config.symbol || "BTC-USD").replace('/', '-');
    const matchedSymbol = options.symbols?.find(s => s.replace('/', '-') === rawSym) || rawSym;

    const update = { 
        symbol: matchedSymbol, 
        timeframe: config.timeframe || "1h", 
        initialBalance: config.initialBalance || 1000,
        riskManagementMode: config.riskManagementMode || 'static',
        riskPercentage: config.riskPercentage || 1,
        mlMode: config.mlMode || "predictions", 
        mlModel: config.mlModel || "", 
        mlThreshold: config.mlThreshold || 0.5,
        params: { ...defaultFilterParams, ...(config.params || {}) } 
    };
    
    console.log("State Update Applied:", update);
    console.groupEnd();

    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    console.log("🚀 [Backtest] Sending Simulation Request:", formData);
    setBacktestResults(null);
    setIsSimulating(true); 

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const data = activeTab === 'combo' ? comboData : formData;

    if (typeof runner === 'function') {
        const res = await runner(data);
        console.log("📊 [Backtest] Raw Simulation Results:", res);
        if (res) setBacktestResults(res);
    }
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults) return null;
    const res = backtestResults.combinedResult || backtestResults;
    console.log("💎 [Backtest] Mapping Data for Charts - Candle Count:", res.candleData?.length || 0);
    return { candleData: res.candleData || [], trades: res.trades || res.tradeBreakdown || [], metrics: { ...res.metrics, totalReturn: res.metrics?.roi || 0 } };
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
                  {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${Number(w.roi || 0).toFixed(1)}%)`}</option>)}
                </select>
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                <CommonBacktestInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => activeTab === 'single' ? setFormData({...formData, [e.target.name]: e.target.value}) : setComboData({...comboData, [e.target.name]: e.target.value})} 
                    options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models }}
                    onParamChange={(name, val) => activeTab === 'single' ? setFormData({...formData, params: {...formData.params, [name]: val}}) : setComboData({...comboData, params: {...comboData.params, [name]: val}})}
                />
                <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg">
                    {isSimulating ? 'Test is Running...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-6">
            {processed ? (
              <div className="bot-card p-6 h-[600px]"><ChartIndependent results={processed} symbol={formData.symbol} /></div>
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
