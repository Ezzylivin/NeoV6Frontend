import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
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
                                {options.modelOptions?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    )}
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

  useEffect(() => { fetchOptions?.(); }, []);

  const loadWinners = useCallback(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        setLiveWinners(Array.isArray(res.data) ? res.data : (res.data.winners || []));
      } catch (err) { console.error("Fetch Error:", err); }
  }, []);

  useEffect(() => { loadWinners(); }, [loadWinners]);

  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;

    const config = win.config || win;
    const rawSym = (config.symbol || "").replace('/', '-');
    const matchedSymbol = options.symbols?.find(s => s.replace('/', '-') === rawSym) || rawSym;
    const matchedTF = options.timeframes?.find(t => t === config.timeframe) || config.timeframe || "1h";

    const update = { 
        symbol: matchedSymbol, timeframe: matchedTF, 
        initialBalance: config.initialBalance || 1000,
        riskManagementMode: config.riskManagementMode || 'static',
        riskPercentage: config.riskPercentage || 1,
        mlMode: config.mlMode || "predictions", 
        mlModel: config.mlModel || "", 
        params: { ...defaultFilterParams, ...(config.params || {}) } 
    };
    
    setFormData(p => ({ ...p, ...update }));
    setComboData(p => ({ ...p, ...update }));
  };

  // 🟢 Extraction Fix: Maps both root and nested result objects
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
              <div className="flex justify-between items-center mb-4">
                  <label className="text-emerald-400 font-bold text-sm">🏆 Load Alpha Strategy</label>
                  <button type="button" onClick={loadWinners} className="text-emerald-400">🔄</button>
              </div>
              <select value={selectedWinnerId} onChange={handleWinnerSelect} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white mb-6">
                <option value="">-- Select Alpha --</option>
                {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol} (ROI: ${Number(w.roi || w.metrics?.roi || 0).toFixed(1)}%)`}</option>)}
              </select>
              <CommonBacktestInputs data={formData} onChange={(e) => setFormData({...formData, [e.target.name]: e.target.value})} options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models }} onParamChange={(name, val) => setFormData({...formData, params: {...formData.params, [name]: val}})} />
              <button onClick={async () => { setIsSimulating(true); const res = await runNewBacktest(formData); setBacktestResults(res); setIsSimulating(false); }} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl mt-6">
                  {isSimulating ? 'Test is Running...' : '▶ Run Simulation'}
              </button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7">
            {processed ? <ChartIndependent results={processed} symbol={formData.symbol} /> : <div className="bot-card p-20 text-center">Ready for Simulation</div>}
          </div>
        </div>
    </div>
  );
}
