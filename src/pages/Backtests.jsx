// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: Split View Replay + Robust Param Loading + Active Config Debugger

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Brush
} from "recharts";
import { ChartReplay } from "../components/ChartReplay.jsx";
import "../components/ChartReplay.css";
import "./Backtests.css";
import api from "../api/apiClient"; 

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

// --- 1. CONSTANTS ---
const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover",
  "RSI": "rsi_divergence",
  "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover",
  "CCI": "cci_oversold",
  "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud",
  "ATR": "atr_breakout", 
  "On-Balance Volume": "obv_signal",
  "Parabolic SAR": "psar_signal"
};

const STRATEGY_PREFIXES = {
    'macd_crossover': 'macd', 
    'rsi_divergence': 'rsi', 
    'bollinger_bands': 'bb',
    'stochastic_crossover': 'stoch', 
    'atr_breakout': 'atr', 
    'cci_oversold': 'cci',
    'ichimoku_cloud': 'ich', 
    'psar_signal': 'psar', 
    'obv_signal': 'obv', 
    'sma_crossover': 'sma'
};

const PARAM_MAPPING = {
    'min_adx': 'minAdxLevel',
    'tsl_mult': 'tslAtrMult',
    'regime_threshold': 'regime_threshold',
    'min_atr_pct': 'minAtrPct',
    'trend_filter_period': 'trendFilterPeriod',
    
    'atr_p': 'atr_period',
    'atr_m': 'atr_multiplier',
    'rsi_len': 'rsi_length',
    'rsi_os': 'oversold_level',
    'rsi_ob': 'overbought_level',
    'bb_len': 'bb_length',
    'bb_std': 'bb_std',
    'cci_len': 'cci_length',
    'cci_os': 'cci_oversold',
    'cci_ob': 'cci_overbought',
    'k_period': 'k_period',
    'd_period': 'd_period',
    'sma_1': 'sma_fast_period',
    'sma_2': 'sma_slow_period',
    'macd_f': 'macd_fast_period',
    'macd_s': 'macd_slow_period',
    'macd_sig': 'macd_signal_period'
};

// --- 2. HELPER FUNCTIONS ---
const normalizeParams = (rawParams) => {
    const normalized = {};
    if (!rawParams) return normalized;
    Object.entries(rawParams).forEach(([key, val]) => {
        const uiKey = PARAM_MAPPING[key] || key; 
        normalized[uiKey] = val;
    });
    return normalized;
};

const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};
const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// --- 3. DEFAULT DATA ---
const defaultFilterParams = {
    minAtrPct: 0, 
    trendFilterPeriod: 200, 
    minAdxLevel: 0,
    tslAtrMult: 0, // Default to 0 to prevent accidental TSL
    regime_threshold: 25 
};

const initialFormData = {
  strategyId: "", 
  code: "", 
  symbol: "BTC-USD",
  timeframe: "1h",
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  params: { ...defaultFilterParams },
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off", 
  mlModel: "", 
  mlThreshold: 0.5,
  mlHorizon: 1
};

const initialComboData = {
  strategies: [ 
    { strategyId: "", code: "", params: {} },
    { strategyId: "", code: "", params: {} }
  ],
  params: { ...defaultFilterParams },
  comboConfig: { strategyCodes: [], combinationRule: 'AND' },
  symbol: "BTC-USD",
  timeframe: "1h", 
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off",
  mlModel: "",
  mlThreshold: 0.5,
  mlHorizon: 1
};

// --- 4. STRATEGY PARSING LOGIC ---
function rebuildStrategiesFromParams(raw) {
  if (Array.isArray(raw.strategies) && raw.strategies.length > 0) return raw.strategies; 
  if (typeof raw.strategies === "string") {
      return raw.strategies.split(",").map(code => ({ code: code.trim(), params: {} }));
  }
  if (Array.isArray(raw)) {
      const expanded = [];
      raw.forEach(item => {
          const p = item.params || item; 
          if (p.trend_strategy || p.range_strategy) {
              if (p.trend_strategy) expanded.push({ code: p.trend_strategy, params: p });
              if (p.range_strategy) expanded.push({ code: p.range_strategy, params: p });
          } else {
              const code = item.code || detectCodeFromParams(p) || "unknown";
              expanded.push({ code: code, params: p });
          }
      });
      return expanded;
  }
  const detectedCodes = new Set();
  const params = raw.params || raw; 
  if (params.trend_strategy) detectedCodes.add(params.trend_strategy);
  if (params.range_strategy) detectedCodes.add(params.range_strategy);
  Object.keys(params).forEach(key => {
      for (const [prefix, code] of Object.entries(STRATEGY_PREFIXES)) {
          if (key.startsWith(prefix)) {
              detectedCodes.add(code);
              break; 
          }
      }
  });
  if (detectedCodes.size > 0) {
      return Array.from(detectedCodes).map(code => ({ code, params: {} }));
  }
  return [];
}

function detectCodeFromParams(params) {
    if (params.trend_strategy) return params.trend_strategy;
    if (params.range_strategy) return params.range_strategy;
    for (const key of Object.keys(params)) {
        for (const [prefix, code] of Object.entries(STRATEGY_PREFIXES)) {
            if (key.startsWith(prefix)) return code;
        }
    }
    return null;
}

// --- 5. COMPONENTS ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const formatValue = (value, format) => {
       if (value === undefined || value === null || isNaN(value)) return "N/A";
       switch (format) {
           case 'currency': return `$${value.toFixed(2)}`;
           case 'percent': return `${value.toFixed(2)}%`;
           case 'number': return value.toFixed(2);
           default: return value;
       }
  };
  const items = [
    { label: "Total Return", value: metrics.totalReturn, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades, format: null },
    { label: "Avg. Win", value: metrics.averageWin, format: 'currency' },
    { label: "Avg. Loss", value: metrics.averageLoss, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance, format: 'currency' }
  ];
  return (
    <div className="metrics-grid">
      {items.map(m => (
        <div key={m.label} className="metric-item">
          <span className="metric-label">{m.label}</span>
          <span className="metric-value">{formatValue(m.value, m.format)}</span>
        </div>
      ))}
    </div>
  );
};

// 🆕 NEW COMPONENT: Trade Logs Table (The big one at the bottom)
const TradeLogsTable = ({ trades }) => {
    if (!trades || trades.length === 0) return <div className="no-trades-msg" style={{padding:'20px', textAlign:'center', color:'#888'}}>No trades found in this backtest.</div>;
    
    // Sort trades by entry time descending
    const sortedTrades = [...trades].sort((a, b) => new Date(a.entry_time || a.entryTime) - new Date(b.entry_time || b.entryTime));

    const formatDateFull = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    };

    const formatPrice = (p) => p ? `$${parseFloat(p).toFixed(2)}` : '-';

    return (
        <div className="trade-logs-container" style={{ marginTop: '30px', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155', height: '400px' }}>
            <h3 style={{ color: 'white', marginBottom: '10px' }}>Full Trade History</h3>
            <div style={{ overflowX: 'auto', height: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', color: '#e2e8f0' }}>
                    <thead style={{ background: '#1e293b', position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr>
                            <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Entry Time</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Entry Price</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Exit Time</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Exit Price</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>PnL ($)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTrades.map((t, i) => {
                            const profit = t.profit || t.pnl || 0;
                            const isWin = profit > 0;
                            const direction = t.direction || t.type || t.position || 'LONG';
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #334155', background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                                    <td style={{ padding: '8px' }}>{i + 1}</td>
                                    <td style={{ padding: '8px', color: direction.toLowerCase().includes('short') ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
                                        {direction.toUpperCase()}
                                    </td>
                                    <td style={{ padding: '8px' }}>{formatDateFull(t.entry_time || t.entryTime)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatPrice(t.entry_price || t.entryPrice || t.price)}</td>
                                    <td style={{ padding: '8px' }}>{formatDateFull(t.exit_time || t.exitTime)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatPrice(t.exit_price || t.exitPrice)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', color: isWin ? '#4ade80' : '#f87171' }}>
                                        {profit > 0 ? '+' : ''}{profit.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// 🆕 NEW COMPONENT: Compact Logs for Split View
const CompactTradeLogs = ({ trades }) => {
    if (!trades || trades.length === 0) return <div style={{padding:'20px', color:'#666', textAlign:'center'}}>No trades yet.</div>;
    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryTime || a.entry_time) - new Date(b.entryTime || b.entry_time));
    
    return (
        <div style={{height: '100%', overflowY: 'auto', background: '#161621'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem'}}>
                <thead style={{position: 'sticky', top: 0, background: '#25263a', zIndex: 2}}>
                    <tr>
                        <th style={{padding: '8px', textAlign: 'left', color: '#9ca3af'}}>Type</th>
                        <th style={{padding: '8px', textAlign: 'right', color: '#9ca3af'}}>Price</th>
                        <th style={{padding: '8px', textAlign: 'right', color: '#9ca3af'}}>PnL</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTrades.map((t, i) => (
                        <tr key={i} style={{borderBottom: '1px solid #333'}}>
                            <td style={{padding: '8px', color: (t.position || t.type) === 'short' ? '#f87171' : '#4ade80'}}>
                                {(t.position || t.type || 'LONG').toUpperCase()}
                            </td>
                            <td style={{padding: '8px', textAlign: 'right', color: '#cbd5e1'}}>
                                ${(t.entryPrice || t.price || 0).toFixed(0)}
                            </td>
                            <td style={{padding: '8px', textAlign: 'right', color: (t.profit || 0) > 0 ? '#4ade80' : '#f87171'}}>
                                {(t.profit || 0).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CommonBacktestInputs = ({ data, onChange, options, availableModelData, isCombo = false }) => {
    const symbolOptions = options?.symbolOptions || [];
    const timeframeOptions = options?.timeframeOptions || [];
    const allModelOptions = options?.modelOptions || []; 

    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        let val = value;
        if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent);
    };
    const handleGlobalChange = (e) => { onChange(e); };

    const params = data.params || {};
    const processedSymbolOptions = useMemo(() => {
        if (!symbolOptions.length) return [];
        if (data.mlMode === 'off') return symbolOptions.map(s => ({ value: s, name: s, isAvailable: true }));
        const { availableSymbols } = availableModelData;
        return [...symbolOptions].sort((a, b) => (availableSymbols.has(b) ? 1 : 0) - (availableSymbols.has(a) ? 1 : 0))
            .map(s => ({ value: s, name: availableSymbols.has(s) ? s : `${s} (No models)`, isAvailable: availableSymbols.has(s) }));
    }, [data.mlMode, symbolOptions, availableModelData]);

    const processedTimeframeOptions = useMemo(() => {
        if (!timeframeOptions.length) return [];
        if (data.mlMode === 'off') return timeframeOptions.map(t => ({ value: t, name: t, isAvailable: true }));
        if (!data.symbol) return timeframeOptions.map(t => ({ value: t, name: `${t} (Select Symbol)`, isAvailable: false }));
        const { lookup } = availableModelData;
        return [...timeframeOptions].sort((a, b) => (lookup.has(`${data.symbol}_${b}`) ? 1 : 0) - (lookup.has(`${data.symbol}_${a}`) ? 1 : 0))
            .map(t => ({ value: t, name: lookup.has(`${data.symbol}_${t}`) ? t : `${t} (No model)`, isAvailable: lookup.has(`${data.symbol}_${t}`) }));
    }, [data.mlMode, data.symbol, timeframeOptions, availableModelData]);

    return (
        <>
            <label>Symbol:
                <select name="symbol" value={data.symbol} onChange={handleGlobalChange} disabled={!processedSymbolOptions.length}>
                    <option value="">-- Select Symbol --</option>
                    {processedSymbolOptions.map(s => (
                        <option key={s.value} value={s.value} disabled={data.mlMode !== 'off' && !s.isAvailable} style={{ color: (data.mlMode !== 'off' && !s.isAvailable) ? '#888' : 'white' }}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </label>
            <label>Timeframe:
                <select name="timeframe" value={data.timeframe} onChange={handleGlobalChange} disabled={!processedTimeframeOptions.length}>
                    <option value="">-- Select Timeframe --</option>
                    {processedTimeframeOptions.map(t => <option key={t.value} value={t.value} disabled={data.mlMode !== 'off' && !t.isAvailable} style={{color: (data.mlMode !== 'off' && !t.isAvailable) ? '#888' : 'white'}}>{t.name}</option>)}
                </select>
            </label>
            <div style={{display: 'flex', gap: '10px'}}>
                <label style={{flex:1}}>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} /></label>
                <label style={{flex:1}}>End Date: <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} /></label>
            </div>
            <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} min="1" step="1" /></label>
            <fieldset>
                <legend>Risk Management</legend>
                <label>Mode:
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={handleGlobalChange}>
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                <label>Max Pyramiding (Entries): <input type="number" name="maxPyramiding" value={data.params?.maxPyramiding || 1} onChange={handleParamChange} min="1" max="10" /></label>
                {data.riskManagementMode === 'standard' ? (
                    <>
                        <label>Risk Per Trade (%): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" min="0.1" required /></label>
                        <label>Initial Risk Amount ($): <input type="text" readOnly value={`$${(data.initialBalance * (data.riskPercentage / 100)).toFixed(2)}`} className="read-only-display"/></label>
                    </>
                ) : (
                    <>
                        <label>Growth Capital Target ($): <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={handleGlobalChange} min="1" step="1" /></label>
                        <label>Risk % (After Target): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" min="0.1" required /></label>
                    </>
                )}
            </fieldset>
            <fieldset>
                <legend>Machine Learning</legend>
                <label>Mode:
                    <select name="mlMode" value={data.mlMode || "off"} onChange={handleGlobalChange}>
                        <option value="off">Off (Pure TA)</option>
                        <option value="predictions">Hybrid (TA + ML Filter)</option>
                        <option value="on">On (Pure ML)</option>
                    </select>
                </label>
                {data.mlMode !== "off" && (
                    <>
                        <label>Model:
                            <select name="mlModel" value={data.mlModel} onChange={handleGlobalChange} disabled={allModelOptions.length === 0}>
                                <option value="">-- Select Model --</option>
                                {allModelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </label>
                        <label>Confidence Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={handleGlobalChange} /></label>
                        <label>Prediction Horizon: <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={handleGlobalChange} /></label>
                    </>
                )}
                {data.mlMode === 'predictions' && (
                    <>
                        <label>Hybrid Logic:
                            <select name="hybridMode" value={data.params?.hybridMode ?? 'AND'} onChange={handleParamChange}>
                                <option value="AND">TA AND ML (Strict Filter)</option>
                                <option value="OR">TA OR ML (Permissive)</option>
                                <option value="REGIME">TA as Regime Filter</option>
                            </select>
                        </label>
                        {(data.params?.hybridMode === 'REGIME') && (
                             <label>Regime Threshold (ADX): <input type="number" name="regime_threshold" value={params.regime_threshold ?? 25} onChange={handleParamChange} step="1" min="0" max="100" /></label>
                        )}
                    </>
                )}
            </fieldset>
            <fieldset>
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %): <input type="number" name="minAtrPct" value={params.minAtrPct ?? 0} onChange={handleParamChange} step="0.05" min="0" /></label>
                <label>Chop Filter (Min ADX): <input type="number" name="minAdxLevel" value={params.minAdxLevel ?? 0} onChange={handleParamChange} step="1" min="0" max="100" /></label>
                <label>Trailing Stop (ATR Mult): <input type="number" name="tslAtrMult" value={params.tslAtrMult ?? 0} onChange={handleParamChange} step="0.1" min="0" /></label>
                <label>Trend Filter SMA Period: <input type="number" name="trendFilterPeriod" value={params.trendFilterPeriod ?? 200} onChange={handleParamChange} step="1" min="0" /></label>
            </fieldset>
        </>
    );
};

const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);
  return (
    <div className="combo-card">
      <div className="combo-card-header"><strong>Strategy #{idx + 1}</strong>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} className="remove-btn">✕</button>}
      </div>
      <div className="combo-card-body">
        <label>Strategy:
          <select name="strategyId" value={config.strategyId} onChange={handleChange} disabled={!strategies.length}>
            <option value="">-- Select --</option>
            {strategies.length ? strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : <option disabled>Loading...</option>}
          </select>
        </label>
        {config.params && Object.keys(config.params).length > 0 && (
            <div className="card-note" style={{marginTop: '10px'}}>
                <small><strong>Optimized Params:</strong></small>
                <div style={{fontSize: '0.8em', color: '#aaa', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                    {Object.entries(config.params).map(([k, v]) => {
                         if (v === null || v === undefined) return null;
                         return <span key={k} style={{background: '#334155', padding: '2px 6px', borderRadius: '4px'}}>{k}: {v}</span>
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest } = useBacktest(); 
  const { loading = 'initial', error = null, options = {}, winners = [] } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({
        _id: `base-${code}-${idx}`, name, code, params: {} 
    }));
    const mappedDB = dbStrats.map(s => {
        const strategyTypeKey = s.params?.strategyType?.trim();
        const pythonCode = STRATEGY_TYPE_TO_CODE_MAP[strategyTypeKey] || "unknown";
        return { ...s, code: pythonCode };
    });
    return [...baseStrats, ...mappedDB];
  }, [options]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  
  const modelOptions = useMemo(() => {
      if (!options?.models) return [];
      return options.models.map(model => {
         const parts = model.id.split('_');
         let symbolBase = 'BTC'; let timeframe = '1h';
         if (parts.length >= 3) { symbolBase = parts[0].toUpperCase(); timeframe = parts[1]; }
         if (!symbolBase.includes('-')) symbolBase += '-USD';
         return { ...model, symbolBase, timeframe };
      }).sort((a,b) => a.id.localeCompare(b.id));
  }, [options]);

  const availableModelData = useMemo(() => {
    const availableSymbols = new Set();
    const availableTimeframes = new Set();
    const lookup = new Set(); 
    if (!modelOptions.length) return { availableSymbols, availableTimeframes, lookup };
    for (const model of modelOptions) {
        availableSymbols.add(model.symbolBase);
        availableTimeframes.add(model.timeframe);
        lookup.add(`${model.symbolBase}_${model.timeframe}`);
    }
    return { availableSymbols, availableTimeframes, lookup };
  }, [modelOptions]); 

  // 🚀 ROBUST WINNER LOADER: Ensures params are correctly mapped from Optimizer
  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      setSelectedWinnerId(filename);
      if (!filename) return;

      const selectedWinner = winners.find(w => w.id === filename);
      if (selectedWinner && selectedWinner.config) {
          const config = selectedWinner.config;
          
          let loadedSymbol = config.symbol || comboData.symbol || "BTC-USD";
          let loadedTimeframe = config.timeframe || comboData.timeframe || "1h";
          
          // Fallback if symbol isn't in config
          if (!config.symbol && filename.includes('_')) {
              const parts = filename.split('_');
              if(parts[1]) loadedSymbol = parts[1];
          }

          let rawGlobalParams = { ...defaultFilterParams };
          if (Array.isArray(config) && config.length > 0) {
             rawGlobalParams = { ...rawGlobalParams, ...(config[0].params || config[0]) };
          } else {
             rawGlobalParams = { ...rawGlobalParams, ...(config.params || {}) };
          }
          const globalParams = normalizeParams(rawGlobalParams);

          // 🚀 SMART DETECT REGIME MODE
          let hybridMode = globalParams.hybridMode || 'AND';
          if (globalParams.regime_threshold !== undefined && globalParams.regime_threshold !== null) {
              hybridMode = 'REGIME';
              globalParams.hybridMode = 'REGIME';
          }

          let detectedModel = config.mlModel || config.params?.mlModel || "";
          let detectedMode = config.mlMode || config.params?.mlMode || "off";
          const detectedThreshold = config.mlThreshold ?? config.params?.mlThreshold ?? 0.5;
          const findML = (obj) => {
              if (obj.mlModel) detectedModel = obj.mlModel;
              if (obj.mlMode) detectedMode = obj.mlMode;
          };
          if (Array.isArray(config)) config.forEach(findML);
          else findML(config);
          if (config.params) findML(config.params);
          if (detectedMode === "off" && detectedModel) detectedMode = "predictions";

          let strategiesList = rebuildStrategiesFromParams(config);
          strategiesList = strategiesList.map(s => {
              let def = strategyOptions.find(opt => opt.code === s.code);
              if (!def) def = strategyOptions.find(opt => opt._id.startsWith(`base-${s.code}`));
              const idToUse = def ? def._id : "";
              const prefix = STRATEGY_PREFIXES[s.code]; 
              const allParams = { ...(config.params || {}), ...(s.params || {}) };
              if(Array.isArray(config)) config.forEach(item => Object.assign(allParams, item.params || item));
              const specificParams = {};
              Object.entries(allParams).forEach(([key, val]) => {
                  // Pass specific params + global fallbacks
                  if (prefix && key.startsWith(prefix)) {
                       const uiKey = PARAM_MAPPING[key] || key;
                       specificParams[uiKey] = val;
                  }
              });
              return { strategyId: idToUse, code: s.code, params: specificParams };
          });

          setActiveTab('combo');
          setComboData(prev => ({
              ...prev, symbol: loadedSymbol, timeframe: loadedTimeframe, mlMode: detectedMode,
              mlModel: detectedModel, mlThreshold: detectedThreshold, mlHorizon: config.mlHorizon ?? prev.mlHorizon,
              strategies: strategiesList, params: globalParams, 
              comboConfig: { 
                  strategyCodes: strategiesList.map(s => s.code), 
                  combinationRule: hybridMode 
              }
          }));
      }
  };

  const handleResetSelection = () => {
      setSelectedWinnerId("");
      setComboData(initialComboData);
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
    if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === val); 
      if (selectedStrategy) {
        setFormData(prev => ({ ...prev, strategyId: val, code: selectedStrategy.code, params: { ...prev.params, ...(selectedStrategy.params || {}) } })); 
      }
    } else if (name.startsWith("param_")) {
      setFormData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
    if (name.startsWith("param_")) {
      setComboData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };
  
  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);
    const updatedStrategies = [...comboData.strategies];
    const currentConfig = { ...updatedStrategies[index] };
    if (isParam) {
      const paramName = name.substring(6);
      currentConfig.params = { ...(currentConfig.params || {}), [paramName]: val };
     } else if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === value);
      if (selectedStrategy) {
          currentConfig.strategyId = value;
          currentConfig.code = selectedStrategy.code;
          currentConfig.params = { ...(selectedStrategy.params || {}), ...currentConfig.params };
      }
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };
  
  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, { strategyId: defaultStrategy._id || "", code: defaultStrategy.code || "", params: {} }] }));
  };
  
  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  const handleSaveStrategy = async () => {
    const name = prompt("Enter a name for this strategy setup:");
    if (!name) return;

    const config = activeTab === 'single' ? formData : comboData;
    const payload = {
        name,
        symbol: config.symbol,
        timeframe: config.timeframe,
        initialBalance: config.initialBalance,
        strategies: activeTab === 'single' ? [{ code: config.code, params: config.params }] : config.strategies.map(s => ({ code: s.code, params: s.params })),
        comboConfig: activeTab === 'combo' ? config.comboConfig : null,
        params: config.params,
        mlMode: config.mlMode,
        mlModel: config.mlModel,
        mlThreshold: config.mlThreshold,
        isCombo: activeTab === 'combo'
    };

    try {
        await api.post('/strategies', payload); 
        alert("✅ Strategy saved successfully! You can now load it in the Trading Bot.");
    } catch (e) {
        console.error(e);
        alert("❌ Error saving strategy: " + (e.response?.data?.message || e.message));
    }
  };
 
  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    try {
      const res = await runNewBacktest?.(formData);
      if (res) { setBacktestResults({ main: res, individuals: [] }); }
    } catch (err) { console.error(err); }
  };
  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    try {
      const comboRes = await runComboBacktest?.(comboData);
      if (comboRes) { setBacktestResults(comboRes); }
    } catch (err) { console.error(err); }
  };

  const { combinedEquityCurve, combinedMetrics, mainResult } = useMemo(() => {
       try {
         const mainResult = backtestResults?.main || backtestResults?.combinedResult;
         const curve = mainResult?.equityCurve || mainResult?.equity;
         if (mainResult?.metrics && curve) { 
           return {
             combinedEquityCurve: curve.map(p => ({ ...p, timestamp: new Date(p.timestamp).getTime() })), 
             combinedMetrics: mainResult.metrics || null,
             mainResult: mainResult
           };
         }
         return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null };
       } catch (e) { return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null }; }
  }, [backtestResults]);

  const pieData = useMemo(() => {
    if (!combinedMetrics || typeof combinedMetrics.winningTrades !== 'number') return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    return (wins <= 0 && losses <= 0) ? [] : [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  if (loading === 'initial') return <div className="dashboard-container"><h1>Backtests</h1><div className="loading-overlay"><div className="spinner"></div></div></div>;

  const isComboSubmitDisabled = loading !== 'idle' || (comboData.mlMode !== 'off' && !comboData.mlModel) || (comboData.strategies.length < 1);
  const isSingleSubmitDisabled = loading !== 'idle' || (formData.mlMode !== 'off' && !formData.mlModel);
  const getStatusMessage = () => loading === 'running_ml' ? `Running ML... (${countdown}s)` : "Processing...";

  // 🚀 DEBUGGER: Show the active config to user
  const activeConfig = activeTab === 'single' ? formData : comboData;

  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Error</h4><p>{error.message}</p></div>}
      <div className="backtest-main">
        <div className="backtest-forms">
          <div className="tabs">
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
          </div>
          
          <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                   <label style={{ color: '#4ade80', fontWeight: 'bold', margin: 0 }}>🏆 Load Optimized Strategy (ML)</label>
                   {selectedWinnerId && <button type="button" onClick={handleResetSelection} className="remove-btn" style={{background:'transparent', border:'1px solid #555', padding:'4px 8px'}}>Reset</button>}
               </div>
               <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}>
                   <option value="">-- Select a Golden Strategy --</option>
                   {winners && winners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
               </select>
          </div>

          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              <label>Strategy:
                  <select name="strategyId" value={formData.strategyId} onChange={handleFormChange} disabled={!strategyOptions.length}>
                    <option value="">-- Select TA Strategy --</option>
                    {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
              </label>
              <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions }} availableModelData={availableModelData} isCombo={false} />
              <div className="button-group" style={{display:'flex', gap:'10px'}}>
                <button type="submit" disabled={isSingleSubmitDisabled} style={{flex:1}}>{loading !== 'idle' ? getStatusMessage() : "Run Backtest"}</button>
                <button type="button" onClick={handleSaveStrategy} style={{flex:1, backgroundColor:'#22c55e', border:'none', cursor:'pointer'}}>💾 Save Strategy</button>
              </div>
            </form>
          )}

          {activeTab === 'combo' && (
             <form onSubmit={handleRunComboBacktest} className="backtest-form">
                <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} availableModelData={availableModelData} isCombo={true} />
                <div className="combo-strategy-list">
                    {comboData.strategies.map((config, idx) => (
                    <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />
                  ))}
                </div>
                <button type="button" onClick={addStrategyCard} disabled={loading !== 'idle'}>Add Strategy</button>
                <div className="button-group" style={{display:'flex', gap:'10px'}}>
                     <button type="submit" disabled={isComboSubmitDisabled} style={{flex:1}}>{loading !== 'idle' ? getStatusMessage() : "Run Combo Backtest"}</button>
                     <button type="button" onClick={handleSaveStrategy} style={{flex:1, backgroundColor:'#22c55e', border:'none', cursor:'pointer'}}>💾 Save Strategy</button>
                </div>
             </form>
          )}
        </div> 

        {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            {loading !== 'idle' && (
              <div className="loading-overlay"><h3>{getStatusMessage()}</h3><div className="spinner"></div></div>
            )}
            
            {/* 🚀 ACTIVE DEBUGGER: Shows active parameters so user is sure "Golden" is loaded */}
            {loading === 'idle' && combinedMetrics && (
                <div style={{marginBottom:'20px', padding:'10px', background:'#2d2e42', borderRadius:'6px', fontSize:'0.85rem', color:'#aaa'}}>
                    <strong>Active Config: </strong>
                    Symbol: <span style={{color:'white'}}>{activeConfig.symbol}</span> | 
                    TF: <span style={{color:'white'}}>{activeConfig.timeframe}</span> | 
                    Strategies: <span style={{color:'white'}}>{activeConfig.strategies.map(s=>s.code).join(' + ') || activeConfig.code}</span>
                </div>
            )}

            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                
                {/* 🚀 REPLAY SPLIT VIEW (Chart Left / Logs Right) */}
                {mainResult && mainResult.candleData?.length > 0 && (
                    <div className="replay-container">
                        <div style={{ width: '100%', height: '100%' }}>
                            <ChartReplay results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} />
                        </div>
                        <div className="trade-logs-container">
                            <h3 style={{ padding:'10px', background:'#2d2e42', margin:0, fontSize:'1rem', borderBottom:'1px solid #3f3f55'}}>Trade Log</h3>
                            <CompactTradeLogs trades={mainResult?.trades} />
                        </div>
                    </div>
                )}

                <div className="charts-container" style={{ marginTop: '30px' }}>
                  <div className="chart">
                    <h3>Equity Curve</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={combinedEquityCurve}>
                            <XAxis dataKey="timestamp" tickFormatter={formatChartDate} />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip />
                            <CartesianGrid stroke="#555" />
                            <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} strokeWidth={2} />
                            {/* 🚀 ZOOM SLIDER */}
                            <Brush dataKey="timestamp" height={30} stroke="#8884d8" tickFormatter={formatChartDate} />
                        </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart">
                    <h3>Win / Loss</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Full History Table */}
                <TradeLogsTable trades={mainResult?.trades} />
              </>
            )}
          </div>
        )}
      </div> 
    </div> 
  );
}
