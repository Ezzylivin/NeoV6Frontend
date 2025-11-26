// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: Final Stable Version.
// - Fixes "r is not a function" crash.
// - Restore Golden Strategy Auto-Population.
// - Includes Parameter Normalization (Python snake_case -> React camelCase).

import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartReplay } from "../components/ChartReplay.jsx";
import "../components/ChartReplay.css";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];
const ESTIMATED_DURATION = 60; 

// --- 1. PARAMETER MAPPING (Python -> React) ---
const PARAM_MAPPING = {
    'min_adx': 'minAdxLevel',
    'tsl_mult': 'tslAtrMult',
    'regime_threshold': 'regime_threshold',
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

// --- Helper Functions ---
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

// --- Default Parameters ---
const defaultFilterParams = {
    minAtrPct: 0, 
    trendFilterPeriod: 200, 
    minAdxLevel: 0,
    tslAtrMult: 3.5,
    regime_threshold: 25 
};

const initialFormData = {
  strategyId: "", 
  code: "", 
  symbol: "",
  timeframe: "",
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
    { strategyId: "", code: "", params: { tslAtrMult: 3.5 } },
    { strategyId: "", code: "", params: { tslAtrMult: 3.5 } }
  ],
  params: { 
    minAtrPct: 0,
    trendFilterPeriod: 200,
    hybridMode: 'AND',
    minAdxLevel: 0,
    tslAtrMult: 0,
    regime_threshold: 25,
  },
  symbol: "",
  timeframe: "", 
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

// --- Child Components ---

const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const formatValue = (value, format) => {
       if (typeof value !== "number" || isNaN(value)) return "N/A";
       switch (format) {
           case 'currency': return `$${value.toFixed(2)}`;
           case 'percent': return `${value.toFixed(2)}%`;
           case 'number': return value.toFixed(2);
           default: return value;
       }
  };
  const items = [
    { label: "Total Return", value: metrics.totalReturn ?? 0, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor ?? 0, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown ?? 0, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate ?? 0, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades ?? 0, format: null },
    { label: "Avg. Win", value: metrics.averageWin ?? 0, format: 'currency' },
    { label: "Avg. Loss", value: metrics.averageLoss ?? 0, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance ?? 0, format: 'currency' }
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

const CommonBacktestInputs = ({ data, onChange, options, availableModelData, isCombo = false }) => {
    const symbolOptions = options.symbolOptions || [];
    const timeframeOptions = options.timeframeOptions || [];
    const allModelOptions = options.modelOptions || []; 

    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        let val = value;
        if (type === 'number') {
         val = (value === '' || value === null) ? 0 : parseFloat(value);
        }
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent);
    };
    const handleGlobalChange = (e) => {
        onChange(e);
    };

    const params = data.params || {};

    const processedSymbolOptions = useMemo(() => {
        if (data.mlMode === 'off') {
            return symbolOptions.map(s => ({ value: s, name: s, isAvailable: true }));
        }
        const { availableSymbols } = availableModelData;
        const sortedSymbols = [...symbolOptions].sort((a, b) => {
            const aHas = availableSymbols.has(a);
            const bHas = availableSymbols.has(b);
            return (bHas ? 1 : 0) - (aHas ? 1 : 0);
        });
        return sortedSymbols.map(s => {
            const isAvailable = availableSymbols.has(s);
            return {
                value: s,
                name: isAvailable ? s : `${s} (No models)`,
                isAvailable: isAvailable
            };
        });
    }, [data.mlMode, symbolOptions, availableModelData]);

    const processedTimeframeOptions = useMemo(() => {
        if (data.mlMode === 'off') {
            return timeframeOptions.map(t => ({ value: t, name: t, isAvailable: true }));
        }
        if (!data.symbol) {
             return timeframeOptions.map(t => ({
                value: t,
                name: `${t} (Select Symbol)`,
                isAvailable: false
             }));
        }
        const { lookup } = availableModelData;
        const sortedTimeframes = [...timeframeOptions].sort((a, b) => {
            const aHas = lookup.has(`${data.symbol}_${a}`);
            const bHas = lookup.has(`${data.symbol}_${b}`);
            return (bHas ? 1 : 0) - (aHas ? 1 : 0);
        });
        return sortedTimeframes.map(t => {
            const isAvailable = lookup.has(`${data.symbol}_${t}`);
            return {
                value: t,
                name: isAvailable ? t : `${t} (No model)`,
                isAvailable: isAvailable
            };
        });
    }, [data.mlMode, data.symbol, timeframeOptions, availableModelData]);

    return (
        <>
            <label>Symbol:
                <select 
                    name="symbol" 
                    value={data.symbol} 
                    onChange={handleGlobalChange} 
                    disabled={!processedSymbolOptions.length}
                >
                    <option value="">-- Select Symbol --</option>
                    {processedSymbolOptions.map(s => (
                        <option 
                            key={s.value} 
                            value={s.value} 
                            disabled={data.mlMode !== 'off' && !s.isAvailable}
                            style={{ color: (data.mlMode !== 'off' && !s.isAvailable) ? '#888' : 'white' }}
                        >
                            {s.name}
                        </option>
                    ))}
                </select>
            </label>

            <label>Timeframe:
                <select 
                    name="timeframe" 
                    value={data.timeframe} 
                    onChange={handleGlobalChange} 
                    disabled={!processedTimeframeOptions.length}
                >
                    <option value="">-- Select Timeframe --</option>
                    {processedTimeframeOptions.map(t => (
                        <option 
                            key={t.value} 
                            value={t.value} 
                            disabled={data.mlMode !== 'off' && !t.isAvailable} 
                            style={{ color: (data.mlMode !== 'off' && !t.isAvailable) ? '#888' : 'white' }}
                        >
                            {t.name}
                        </option>
                    ))}
                </select>
            </label>

            <div style={{display: 'flex', gap: '10px'}}>
                <label style={{flex:1}}>Start Date: 
                    <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} />
                </label>
                <label style={{flex:1}}>End Date: 
                    <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} />
                </label>
            </div>
            
            <label>Initial Balance: 
                <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} min="1" step="1" />
            </label>

            <fieldset>
                <legend>Risk Management</legend>
                <label>Mode:
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={handleGlobalChange}>
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {data.riskManagementMode === 'standard' ? (
                    <>
                        <label>Risk Per Trade (%): 
                            <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" min="0.1" required /> 
                        </label>
                        <label>Initial Risk Amount ($):
                            <input type="text" readOnly value={`$${(data.initialBalance * (data.riskPercentage / 100)).toFixed(2)}`} className="read-only-display"/>
                        </label>
                    </>
                ) : (
                    <>
                        <label>Growth Capital Target ($): 
                            <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={handleGlobalChange} min="1" step="1" /> 
                        </label>
                        <label>Risk % (After Target): 
                            <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" min="0.1" required /> 
                        </label>
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
                        <label>Confidence Threshold: 
                            <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={handleGlobalChange} /> 
                        </label>
                        <label>Prediction Horizon: 
                            <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={handleGlobalChange} /> 
                        </label>
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
                             <label>Regime Threshold (ADX):
                                <input type="number" name="regime_threshold" value={params.regime_threshold ?? 25} onChange={handleParamChange} step="1" min="0" max="100" />
                            </label>
                        )}
                    </>
                )}
            </fieldset>

            <fieldset>
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %):
                    <input type="number" name="minAtrPct" value={params.minAtrPct ?? 0} onChange={handleParamChange} step="0.05" min="0" />
                </label>
                <label>Chop Filter (Min ADX):
                    <input type="number" name="minAdxLevel" value={params.minAdxLevel ?? 0} onChange={handleParamChange} step="1" min="0" max="100" />
                </label>
                <label>Trailing Stop (ATR Mult):
                    <input type="number" name="tslAtrMult" value={params.tslAtrMult ?? 0} onChange={handleParamChange} step="0.1" min="0" />
                </label>
                <label>Trend Filter SMA Period:
                    <input type="number" name="trendFilterPeriod" value={params.trendFilterPeriod ?? 200} onChange={handleParamChange} step="1" min="0" />
                </label>
            </fieldset>

            {(params.tslAtrMult ?? 0) === 0 && !isCombo && (
                <>
                    <label>Stop Loss (%): <input type="number" name="SL" value={params.SL ?? 5.0} onChange={handleParamChange} step="0.1" min="0.1" required /></label>
                    <label>Take Profit (%): <input type="number" name="TP" value={params.TP ?? 10.0} onChange={handleParamChange} step="0.1" min="0.1" required /></label>
                </>
            )}
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
  const { state, runNewBacktest, runComboBacktest, getPastBacktests } = useBacktest(); 
  const { loading = 'initial', error = null, options = {}, winners = [] } = state || {};

  const [countdown, setCountdown] = useState(ESTIMATED_DURATION);
  useEffect(() => {
      let timer;
      if (loading === 'running_ml' || loading === 'running_combo') {
          setCountdown(ESTIMATED_DURATION); 
          timer = setInterval(() => {
              setCountdown(prev => (prev > 0 ? prev - 1 : 0)); 
          }, 1000);
      } else {
          setCountdown(ESTIMATED_DURATION); 
      }
      return () => clearInterval(timer);
  }, [loading]);

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');
  const [selectedWinnerId, setSelectedWinnerId] = useState("");

  // 🚀 POLISH: Inject Base Strategies so "Code" Matches work
  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({
        _id: `base-${code}-${idx}`, 
        name: name,
        code: code,
        params: {} 
    }));
    const mappedDB = dbStrats.map(s => {
        const strategyTypeKey = s.params?.strategyType?.trim();
        const pythonCode = STRATEGY_TYPE_TO_CODE_MAP[strategyTypeKey] || "unknown";
        return { ...s, code: pythonCode };
    });
    return [...baseStrats, ...mappedDB];
  }, [options?.strategies]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options?.symbols]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options?.timeframes]);
  
  const timeframeWeights = { '30m': 1, '1h': 2, '4h': 3, '1d': 4, '1w': 5 };
  
  const modelOptions = useMemo(() => {
      if (!options?.models) return [];
      const parsedModels = options.models.map(model => {
       const parts = model.id.split('_');
       let symbolBase = 'BTC'; 
       let timeframe = '1h';
       if (parts.length >= 3) { symbolBase = parts[0].toUpperCase(); timeframe = parts[1]; }
       if (!symbolBase.includes('-')) symbolBase += '-USD';
       return { ...model, symbolBase, timeframe };
      }).sort((a,b) => a.id.localeCompare(b.id));
  }, [options?.models]);

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

  // 🚀 ROBUST STRATEGY RECONSTRUCTION
  function rebuildStrategiesFromParams(raw) {
    if (Array.isArray(raw.strategies) && raw.strategies.length > 0) return raw.strategies; 
    if (typeof raw.strategies === "string") {
        return raw.strategies.split(",").map(code => ({
            code: code.trim(),
            params: extractParamsFor(code.trim(), raw.params || raw)
        }));
    }

    const prefixMap = {
        'macd': 'macd_crossover', 'rsi': 'rsi_divergence', 'bb': 'bollinger_bands',
        'stoch': 'stochastic_crossover', 'atr': 'atr_breakout', 'cci': 'cci_oversold',
        'ich': 'ichimoku_cloud', 'psar': 'psar_signal', 'obv': 'obv_signal', 'sma': 'sma_crossover'
    };

    const detectedCodes = new Set();
    const params = raw.params || raw; 
    Object.keys(params).forEach(key => {
        for (const [prefix, code] of Object.entries(prefixMap)) {
            if (key.startsWith(prefix)) {
                detectedCodes.add(code);
                break; 
            }
        }
    });

    if (detectedCodes.size > 0) {
        return Array.from(detectedCodes).map(code => ({
            code,
            params: extractParamsFor(code, params)
        }));
    }

    // 🚀 NEW: Array Fallback (If raw is the array)
    if (Array.isArray(raw)) {
        return raw.map(s => ({
            code: s.code || "unknown",
            params: s.params || {}
        }));
    }

    return [];
  }

  function extractParamsFor(code, allParams) {
    const relevant = {};
    const prefixMap = {
        'macd_crossover': 'macd', 'rsi_divergence': 'rsi', 'bollinger_bands': 'bb',
        'stochastic_crossover': 'stoch', 'atr_breakout': 'atr', 'cci_oversold': 'cci',
        'ichimoku_cloud': 'ich', 'psar_signal': 'psar', 'obv_signal': 'obv', 'sma_crossover': 'sma'
    };
    const prefix = prefixMap[code] || code.split('_')[0];
    Object.entries(allParams).forEach(([key, val]) => {
        if (key.startsWith(prefix)) {
             const uiKey = PARAM_MAPPING[key] || key;
             relevant[uiKey] = val;
        }
    });
    return relevant;
  }

  // 🚀 HANDLE WINNER SELECTION
  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      setSelectedWinnerId(filename);
      if (!filename) return;

      const selectedWinner = winners.find(w => w.id === filename);
      if (selectedWinner && selectedWinner.config) {
          const config = selectedWinner.config;
          
          console.log("📄 Raw Config:", config);

          // --- 1. Meta ---
          let loadedSymbol = config.symbol || comboData.symbol || "BTC-USD";
          let loadedTimeframe = config.timeframe || comboData.timeframe || "1h";
          
          if (!config.symbol || !config.timeframe) {
              const nameParts = filename.split('_');
              if (nameParts.length >= 2 && nameParts[1].includes('-')) loadedSymbol = nameParts[1];
              if (nameParts.length >= 3) {
                  const validTfs = ['1m','5m','15m','30m','1h','4h','1d','1w'];
                  if (validTfs.includes(nameParts[2])) loadedTimeframe = nameParts[2];
              }
          }

          // --- 2. Global Params (Normalized)
          const rawGlobalParams = { ...defaultFilterParams, ...(config.params || {}) };
          const globalParams = normalizeParams(rawGlobalParams);

          // --- 3. ML Settings Extraction (The Fix) ---
          let detectedModel = "";
          let detectedMode = "off";
          let detectedThreshold = 0.5;

          const extractML = (obj) => {
              if (!obj) return;
              if (obj.mlModel || obj.params?.mlModel) detectedModel = obj.mlModel || obj.params?.mlModel;
              if (obj.mlMode || obj.params?.mlMode) detectedMode = obj.mlMode || obj.params?.mlMode;
              if (obj.mlThreshold !== undefined) detectedThreshold = obj.mlThreshold;
              else if (obj.params?.mlThreshold !== undefined) detectedThreshold = obj.params.mlThreshold;
          };

          if (Array.isArray(config)) {
              config.forEach(item => extractML(item));
          } else {
              extractML(config);
          }

          if (detectedMode === "off" && detectedModel !== "") {
              detectedMode = "predictions"; 
          }

          console.log("🤖 ML Settings Detected:", { mode: detectedMode, model: detectedModel, thresh: detectedThreshold });

          // --- 4. Strategies ---
          let strategiesList = rebuildStrategiesFromParams(config);

          strategiesList = strategiesList.map(s => {
              const def = strategyOptions.find(opt => opt.code === s.code);
              const idToUse = def ? def._id : `base-${s.code}-fallback`;
              const normalizedStratParams = normalizeParams(s.params || {});

              return {
                  strategyId: idToUse,
                  code: s.code,
                  params: normalizedStratParams
              };
          });
          
          if (strategiesList.length === 0) {
               strategiesList = [
                  { strategyId: "", code: "", params: {} },
                  { strategyId: "", code: "", params: {} }
               ];
          }

          // --- 5. Set State ---
          setActiveTab('combo');

          setComboData(prev => ({
              ...prev,
              symbol: loadedSymbol,
              timeframe: loadedTimeframe,
              
              mlMode: detectedMode,
              mlModel: detectedModel,
              mlThreshold: detectedThreshold,
              mlHorizon: config.mlHorizon ?? prev.mlHorizon,
              
              strategies: strategiesList,
              params: globalParams,
              comboConfig: { 
                  strategyCodes: strategiesList.map(s => s.code), 
                  combinationRule: globalParams.hybridMode || 'AND',
              }
          }));
          
          console.log(`✅ Loaded Winner: ${loadedSymbol} (${strategiesList.length} strategies)`);
      }
  };

  // Reset logic
  const handleResetWinner = () => {
      setSelectedWinnerId("");
      setComboData(initialComboData);
  };

  // Form Handlers
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') val = (value === '' || value === null) ? 0 : parseFloat(value);

    if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === val); 
      if (selectedStrategy) {
        setFormData(prev => ({ 
            ...prev, strategyId: val, code: selectedStrategy.code, 
            params: { ...prev.params, ...(selectedStrategy.params || {}) } 
        })); 
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
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, { 
        strategyId: defaultStrategy._id || "", code: defaultStrategy.code || "", params: {} 
    }] }));
  };
  
  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
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

  // Metrics Prep
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
  const currentFormDataForStatus = activeTab === 'single' ? formData : comboData;
  const getStatusMessage = () => loading === 'running_ml' ? `Running ML... (${countdown}s)` : "Processing...";

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

          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              <label>Strategy:
                  <select name="strategyId" value={formData.strategyId} onChange={handleFormChange} disabled={!strategyOptions.length}>
                    <option value="">-- Select TA Strategy --</option>
                    {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
              </label>
              <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions }} availableModelData={availableModelData} isCombo={false} />
              <button type="submit" disabled={isSingleSubmitDisabled}>{loading !== 'idle' ? getStatusMessage() : "Run Backtest"}</button>
            </form>
          )}

          {activeTab === 'combo' && (
             <>
                <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                       <label style={{ color: '#4ade80', fontWeight: 'bold', margin: 0 }}>🏆 Load Optimized Strategy (ML)</label>
                       {selectedWinnerId && <button type="button" onClick={handleResetWinner} className="remove-btn" style={{background:'transparent', border:'1px solid #555', padding:'4px 8px'}}>Reset</button>}
                   </div>
                   <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}>
                       <option value="">-- Select a Golden Strategy --</option>
                       {winners && winners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                </div>
                <form onSubmit={handleRunComboBacktest} className="backtest-form">
                    <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} availableModelData={availableModelData} isCombo={true} />
                    <div className="combo-strategy-list">
                        {comboData.strategies.map((config, idx) => (
                        <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />
                      ))}
                    </div>
                    <button type="button" onClick={addStrategyCard} disabled={loading !== 'idle'}>Add Strategy</button>
                    <button type="submit" disabled={isComboSubmitDisabled}>{loading !== 'idle' ? getStatusMessage() : "Run Combo Backtest"}</button>
                 </form>
             </>
          )}
        </div> 

        {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            {loading !== 'idle' && (
              <div className="loading-overlay"><h3>{getStatusMessage()}</h3><div className="spinner"></div></div>
            )}
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                {mainResult && mainResult.candleData?.length > 0 && <ChartReplay results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} />}
                <div className="charts-container">
                  <div className="chart"><h3>Equity Curve</h3><ResponsiveContainer width="100%" height={300}><LineChart data={combinedEquityCurve}><XAxis dataKey="timestamp" tickFormatter={formatChartDate} /><YAxis domain={['auto', 'auto']} /><Tooltip /><CartesianGrid stroke="#555" /><Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} /></LineChart></ResponsiveContainer></div>
                  <div className="chart"><h3>Win / Loss</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                </div>
              </>
            )}
          </div>
        )}
      </div> 
    </div> 
  );
}
