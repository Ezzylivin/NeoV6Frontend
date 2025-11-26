// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: Fixed "State Fighting". Default logic now respects Winner Selection.

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

// --- Helper Functions ---
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

            <label>Start Date: 
                <input 
                    type="date" 
                    name="startDate" 
                    value={data.startDate}
                    onChange={handleGlobalChange} 
                />
            </label>
            <label>End Date: 
                <input 
                    type="date" 
                    name="endDate" 
                    value={data.endDate} 
                    onChange={handleGlobalChange} 
                />
            </label>
            <label>Initial Balance: 
                <input 
                    type="number" 
                    name="initialBalance" 
                    value={data.initialBalance} 
                    onChange={handleGlobalChange} 
                    min="1" 
                    step="1" 
                />
            </label>

            <fieldset title="Configure how much capital to risk on each trade.">
                <legend>Risk Management</legend>
                <label>Mode:
                    <select 
                        name="riskManagementMode" 
                        value={data.riskManagementMode} 
                        onChange={handleGlobalChange}
                    >
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {data.riskManagementMode === 'standard' ? (
                    <>
                        <label>Risk Per Trade (%): 
                            <input 
                                type="number" 
                                name="riskPercentage" 
                                value={data.riskPercentage} 
                                onChange={handleGlobalChange} 
                                step="0.1" 
                                min="0.1" 
                                required
                            /> 
                        </label>
                        <label>Initial Risk Amount ($):
                            <input
                                type="text"
                                readOnly
                                value={`$${(data.initialBalance * (data.riskPercentage / 100)).toFixed(2)}`}
                                className="read-only-display"
                            />
                        </label>
                    </>
                ) : (
                    <>
                        <label>Growth Capital Target ($): 
                            <input 
                                type="number" 
                                name="growthCapitalTarget" 
                                value={data.growthCapitalTarget} 
                                onChange={handleGlobalChange} 
                                min="1" 
                                step="1" 
                            /> 
                        </label>
                        <label>Risk % (After Target): 
                            <input 
                                type="number" 
                                name="riskPercentage" 
                                value={data.riskPercentage} 
                                onChange={handleGlobalChange} 
                                step="0.1" 
                                min="0.1" 
                                required
                            /> 
                        </label>
                        <label>Risk Amount (After Target) ($):
                            <input
                                type="text"
                                readOnly
                                value={`$${(data.growthCapitalTarget * (data.riskPercentage / 100)).toFixed(2)}`}
                                className="read-only-display"
                            />
                        </label>
                    </>
                )}
            </fieldset>

            <fieldset title="Configure Machine Learning model integration.">
                <legend>Machine Learning</legend>
                <label>Mode:
                    <select 
                        name="mlMode" 
                        value={data.mlMode || "off"} 
                        onChange={handleGlobalChange}
                    >
                        <option value="off">Off (Pure TA)</option>
                        <option value="predictions">Hybrid (TA + ML Filter)</option>
                        <option value="on">On (Pure ML)</option>
                    </select>
                </label>
                {data.mlMode !== "off" && (
                    <>
                        <label>Model:
                            <select 
                                name="mlModel" 
                                value={data.mlModel} 
                                onChange={handleGlobalChange} 
                                disabled={allModelOptions.length === 0}
                            >
                                <option value="">-- Select Model --</option>
                                {
                                    allModelOptions.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                }
                            </select>
                        </label>
                        <label>Confidence Threshold: 
                            <input 
                                type="number" 
                                name="mlThreshold" 
                                value={data.mlThreshold || 0.5} 
                                step="0.01" 
                                min="0" 
                                max="1" 
                                onChange={handleGlobalChange} 
                            /> 
                        </label>
                        <label>Prediction Horizon: 
                            <input 
                                type="number" 
                                name="mlHorizon" 
                                value={data.mlHorizon || 1} 
                                step="1" 
                                min="1" 
                                onChange={handleGlobalChange}
                            /> 
                        </label>
                    </>
                )}
                {data.mlMode === 'predictions' && (
                    <>
                        <label>Hybrid Logic:
                            <select 
                                name="hybridMode" 
                                value={params.hybridMode ?? 'AND'} 
                                onChange={handleParamChange}
                            >
                                <option value="AND">TA AND ML (Strict Filter)</option>
                                <option value="OR">TA OR ML (Permissive)</option>
                                <option value="REGIME">TA as Regime Filter</option>
                            </select>
                        </label>
                        
                        {/* Regime Threshold Input */}
                        {params.hybridMode === 'REGIME' && (
                             <label>Regime Threshold (ADX):
                                <input 
                                    type="number" 
                                    name="regime_threshold" 
                                    value={params.regime_threshold !== undefined ? params.regime_threshold : 25} 
                                    onChange={handleParamChange} 
                                    step="1" 
                                    min="0" 
                                    max="100"
                                    title="The ADX level to switch strategies. Above this is TREND (Strat 1), below is RANGE (Strat 2)."
                                />
                            </label>
                        )}
                    </>
                )}
            </fieldset>

            <fieldset title="Apply advanced filters to your strategy signals.">
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %):
                    <input 
                        type="number" 
                        name="minAtrPct" 
                        value={params.minAtrPct ?? 0} 
                        onChange={handleParamChange} 
                        step="0.05" 
                        min="0" 
                    />
                </label>
                <label>Chop Filter (Min ADX):
                    <input 
                        type="number" 
                        name="minAdxLevel" 
                        value={params.minAdxLevel ?? 0} 
                        onChange={handleParamChange} 
                        step="1" 
                        min="0" 
                        max="100"
                    />
                </label>
                
                <label>Trailing Stop (ATR Mult):
                    <input 
                        type="number" 
                        name="tslAtrMult" 
                        value={params.tslAtrMult ?? 0} 
                        onChange={handleParamChange} 
                        step="0.1" 
                        min="0" 
                    />
                </label>

                <label>Trend Filter SMA Period:
                    <input 
                        type="number"
                        name="trendFilterPeriod" 
                        value={params.trendFilterPeriod ?? 200}
                        onChange={handleParamChange}
                        step="1" 
                        min="0" 
                    />
                </label>
            </fieldset>

            {(params.tslAtrMult ?? 0) === 0 && !isCombo && (
                <>
                    <label>Stop Loss (%):
                        <input 
                            type="number" 
                            name="SL" 
                            value={params.SL ?? 5.0}
                            onChange={handleParamChange} 
                            step="0.1" 
                            min="0.1" 
                            required
                        />
                    </label>
                    <label>Take Profit (%):
                        <input 
                            type="number" 
                            name="TP" 
                            value={params.TP ?? 10.0} 
                            onChange={handleParamChange} 
                            step="0.1" 
                            min="0.1" 
                            required
                        />
                    </label>
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
          <select 
            name="strategyId" 
            value={config.strategyId} 
            onChange={handleChange} 
            disabled={!strategies.length}
          >
            <option value="">-- Select --</option>
            {strategies.length ? strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : <option disabled>Loading...</option>}
          </select>
        </label>
        
        {/* 🚀 UPGRADE: Show Strategy-Specific Params in UI */}
        {config.params && Object.keys(config.params).length > 0 && (
            <div className="card-note" style={{marginTop: '10px'}}>
                <small><strong>Optimized Params:</strong></small>
                <div style={{fontSize: '0.8em', color: '#aaa', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                    {Object.entries(config.params).map(([k, v]) => (
                        <span key={k} style={{background: '#334155', padding: '2px 6px', borderRadius: '4px'}}>{k}: {v}</span>
                    ))}
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

  useEffect(() => {
    if (error) {
      console.error("🪵 DEBUG: Backtests.jsx [Hook ERROR]:", error);
    }
  }, [state, error]); 

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');
  const [selectedWinnerId, setSelectedWinnerId] = useState("");

  // 🚀 POLISH: Inject Base Strategies so "Code" Matches work
  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    
    // Inject Base Types for Raw Codes
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({
        _id: `base-${code}-${idx}`, 
        name: name,
        code: code,
        params: {} // Defaults
    }));

    // Map DB strats
    const mappedDB = dbStrats.map(s => {
        const strategyTypeKey = s.params?.strategyType?.trim();
        const pythonCode = STRATEGY_TYPE_TO_CODE_MAP[strategyTypeKey] || "unknown";
        return { ...s, code: pythonCode };
    });

    // Return Combined list (Base first for reliable matching)
    return [...baseStrats, ...mappedDB];
  }, [options?.strategies]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options?.symbols]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options?.timeframes]);
  
  const timeframeWeights = { '30m': 1, '1h': 2, '4h': 3, '1d': 4, '1w': 5 };
  
  const modelOptions = useMemo(() => {
      if (!options?.models) return [];
      const parsedModels = options.models.map(model => {
       const parts = model.id.split('_');
       let symbolBase = 'zzz'; 
       let timeframe = 'zzz';
       let tfWeight = 99;
       let modelName = model.name;
       
       if (parts.length >= 3) {
           symbolBase = parts[0]; 
           timeframe = parts[1];  
           tfWeight = timeframeWeights[timeframe] || 99;
           modelName = parts.slice(2).join('_');
       }
       return { ...model, symbolBase, timeframe, tfWeight, modelName };
      });
      
      parsedModels.sort((a, b) => {
        if (a.symbolBase < b.symbolBase) return -1;
        if (a.symbolBase > b.symbolBase) return 1;
        if (a.tfWeight < b.tfWeight) return -1;
        if (a.tfWeight > b.tfWeight) return 1;
        if (a.modelName < b.modelName) return -1;
        if (a.modelName > b.modelName) return 1;
        return 0;
      });
      return parsedModels;
  }, [options?.models]);

  const availableModelData = useMemo(() => {
    const availableSymbols = new Set();
    const availableTimeframes = new Set();
    const lookup = new Set(); 

    if (!modelOptions.length) return { availableSymbols, availableTimeframes, lookup };

    for (const model of modelOptions) {
        const { symbolBase, timeframe } = model;
        let fullSymbol = symbolBase.toUpperCase();
        if (!fullSymbol.includes('-')) {
            fullSymbol = `${fullSymbol}-USD`;
        }
        
        availableSymbols.add(fullSymbol);
        availableTimeframes.add(timeframe);
        lookup.add(`${fullSymbol}_${timeframe}`);
    }
    return { availableSymbols, availableTimeframes, lookup };
  }, [modelOptions]); 

  function rebuildStrategiesFromParams(raw) {
    if (Array.isArray(raw.strategies)) {
        return raw.strategies;   // already correct
    }

    // If it's a comma string like "sma_crossover,rsi_divergence"
    if (typeof raw.strategies === "string") {
        return raw.strategies.split(",").map(code => ({
            code,
            params: extractParamsFor(code, raw)
        }));
    }

    return [];
}

// Extract parameters belonging to a specific strategy
function extractParamsFor(code, raw) {
    const params = {};

    Object.entries(raw).forEach(([key, val]) => {
        if (key.startsWith(code.split("_")[0])) {
            params[key] = val;
        }
    });

    return params;
}


  // 🚀 ROBUST WINNER PARSING & AUTO-FILLING - FINAL FIXED VERSION
 const handleWinnerSelect = (e) => {
    const filename = e.target.value;
    setSelectedWinnerId(filename);
    if (!filename) return;

    const selectedWinner = winners.find(w => w.id === filename);
    if (!selectedWinner?.config) return;

    const config = selectedWinner.config;

    // ---------------------------------
    // 1. META DATA FIX
    // ---------------------------------
    let loadedSymbol = config.symbol || "BTC-USD";
    let loadedTimeframe = config.timeframe || "1h";

    const nameParts = filename.split("_");
    if (!config.symbol && nameParts[1]) loadedSymbol = nameParts[1];
    if (!config.timeframe && nameParts[2]) loadedTimeframe = nameParts[2];

    // ---------------------------------
    // 2. GLOBAL PARAMS
    // ---------------------------------
    const globalParams = {
        ...defaultFilterParams,
        ...config.params,
        hybridMode: config.params?.hybridMode || "REGIME",
        regime_threshold: config.params?.regime_threshold ?? 25,
    };

    // ---------------------------------
    // 3. STRATEGY REBUILDER (FIX)
    // ---------------------------------

    // Insert here:
    let strategiesList = rebuildStrategiesFromParams(config);
    console.log("Rebuilt strategies:", strategiesList);

    // Convert rebuilt strategies into UI-compatible objects
    strategiesList = strategiesList.map(s => {
        const def = strategyOptions.find(opt => opt.code === s.code);

        return {
            strategyId: def?._id || "",
            code: s.code,
            params: s.params || {},
        };
    });

    // ---------------------------------
    // 4. SET UI STATE (COMBO TAB)
    // ---------------------------------
    setActiveTab("combo");

    setComboData(prev => ({
        ...prev,
        symbol: loadedSymbol,
        timeframe: loadedTimeframe,

        mlMode: config.mlMode || "off",
        mlModel: config.mlModel || "",
        mlThreshold: config.mlThreshold ?? 0.5,

        strategies: strategiesList,
        params: globalParams,

        comboConfig: {
            strategyCodes: strategiesList.map(s => s.code),
            combinationRule: globalParams.hybridMode,
        }
    }));

    console.log(
        `✅ Loaded Winner: ${loadedSymbol} (${strategiesList.length} strategies)`
    );
};

  // Reset logic (optional)
  const handleResetWinner = () => {
      setSelectedWinnerId("");
      setComboData(initialComboData);
  };

  // Default selections logic
  useEffect(() => {
    if (selectedWinnerId) return; // 🚀 STOP FIGHTING with Winner

    if (strategyOptions.length > 0 && !formData.strategyId) {
      const defaultStrategy = strategyOptions[0];
      setFormData(prev => ({ 
          ...prev, 
          strategyId: defaultStrategy._id,
          code: defaultStrategy.code, 
          params: { ...defaultStrategy.params, ...prev.params } 
      }));
    }
  }, [strategyOptions, formData.strategyId, selectedWinnerId]); 

  useEffect(() => {
    if (selectedWinnerId) return; // 🚀 STOP FIGHTING with Winner

    if (strategyOptions.length > 0 && comboData.strategies.every(c => !c.strategyId)) {
      const newConfigs = comboData.strategies.map((config, index) => {
        const strategy = strategyOptions[index] || strategyOptions[0];
        return { 
            strategyId: strategy._id,
            code: strategy.code, 
            params: { ...strategy.params, tslAtrMult: 3.5 } 
        };
      });
      setComboData(prev => ({ ...prev, strategies: newConfigs }));
    }
  }, [strategyOptions, comboData.strategies, selectedWinnerId]); 

  useEffect(() => {
    if (selectedWinnerId) return; // 🚀 STOP FIGHTING with Winner

    if (symbolOptions.length > 0 && modelOptions.length > 0 && !formData.symbol) {
        const firstModel = modelOptions[0]; 
        let firstModelSymbol = firstModel.symbolBase.toUpperCase();
        if (!firstModelSymbol.includes('-')) {
            firstModelSymbol = `${firstModelSymbol}-USD`;
        }

        let defaultSymbol = symbolOptions.includes(firstModelSymbol) ? firstModelSymbol : (symbolOptions.find(s => s === 'BTC-USD') || symbolOptions[0]);
        setFormData(prev => ({ ...prev, symbol: defaultSymbol }));
        setComboData(prev => ({ ...prev, symbol: defaultSymbol }));
    }
  }, [symbolOptions, modelOptions, formData.symbol, selectedWinnerId]); 

  useEffect(() => {
    if (selectedWinnerId) return; // 🚀 STOP FIGHTING with Winner

    if (timeframeOptions.length && !formData.timeframe) {
        const defaultTimeframe = timeframeOptions.find(t => t === '1h') || timeframeOptions[0];
        setFormData(prev => ({ ...prev, timeframe: defaultTimeframe }));
        setComboData(prev => ({ ...prev, timeframe: defaultTimeframe }));
    }
  }, [timeframeOptions, formData.timeframe, selectedWinnerId]); 

  useEffect(() => {
    if (selectedWinnerId) return; // 🚀 STOP FIGHTING with Winner

    const { mlMode, symbol, timeframe, mlModel } = formData;
    if (mlMode === 'off' || modelOptions.length === 0 || !symbol || !timeframe) return;
  
    if (mlMode === 'on' || mlMode === 'predictions') {
      const symbolBase = symbol.split('-')[0].toLowerCase();
      const isCurrentModelValid = modelOptions.some(m => 
        m.id === mlModel && m.symbolBase === symbolBase && m.timeframe === timeframe
      );
  
      if (isCurrentModelValid) return;
  
      const newDefaultModel = modelOptions.find(m => 
        m.symbolBase === symbolBase && m.timeframe === timeframe
      );
  
      if (newDefaultModel) {
        setFormData(prev => ({ ...prev, mlModel: newDefaultModel.id }));
      } else {
        setFormData(prev => ({ ...prev, mlModel: "" }));
      }
    }
  }, [modelOptions, formData.mlMode, formData.symbol, formData.timeframe, selectedWinnerId]);

  useEffect(() => {
    if (selectedWinnerId) return; // 🚀 STOP FIGHTING with Winner

    const { mlMode, symbol, timeframe, mlModel } = comboData;
    if (mlMode === 'off' || modelOptions.length === 0 || !symbol || !timeframe) return;
  
    if (mlMode === 'on' || mlMode === 'predictions') {
      const symbolBase = symbol.split('-')[0].toLowerCase();
      const isCurrentModelValid = modelOptions.some(m => 
        m.id === mlModel && m.symbolBase === symbolBase && m.timeframe === timeframe
      );
  
      if (isCurrentModelValid) return;
  
      const newDefaultModel = modelOptions.find(m => 
        m.symbolBase === symbolBase && m.timeframe === timeframe
      );
  
      if (newDefaultModel) {
        setComboData(prev => ({ ...prev, mlModel: newDefaultModel.id }));
      } else {
        setComboData(prev => ({ ...prev, mlModel: "" }));
      }
    }
  }, [modelOptions, comboData.mlMode, comboData.symbol, comboData.timeframe, selectedWinnerId]); 
  

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
       } catch (e) {
         console.error("🪵 DEBUG: Backtests.jsx [Memo ERROR]: Error processing results:", e);
         return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null };
       }
 }, [backtestResults]);

  const pieData = useMemo(() => {
    if (!combinedMetrics || typeof combinedMetrics.winningTrades !== 'number' || typeof combinedMetrics.totalTrades !== 'number') return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    if (wins <= 0 && losses <= 0) return [];
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);


  if (loading === 'initial') {
    return (
        <div className="dashboard-container">
            <h1>Backtests</h1>
            <div className="loading-overlay" style={{ position: 'relative', background: 'none' }}>
                <h3>Initializing Backtest Environment...</h3>
                <div className="spinner"></div>
            </div>
        </div>
    );
  }

  // 💡 FIX: Selection by ID Logic
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') {
      val = (value === '' || value === null) ? 0 : parseFloat(value);
    }

    if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === val); 
      if (selectedStrategy) {
        setFormData(prev => ({ 
            ...prev, 
            strategyId: val,
            code: selectedStrategy.code, 
            params: { ...prev.params, ...(selectedStrategy.params || {}) } 
        })); 
      }
    } else if (name.startsWith("param_")) {
      const paramName = name.substring(6);
      setFormData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') {
      val = (value === '' || value === null) ? 0 : parseFloat(value);
    }

    if (name.startsWith("param_")) {
      const paramName = name.substring(6);
      setComboData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };
  
  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_");

    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') {
      val = (value === '' || value === null) ? 0 : parseFloat(value);
    }

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
          // Load params but keep existing TSL if it was set
          currentConfig.params = { 
            ...(selectedStrategy.params || {}), 
            tslAtrMult: currentConfig.params?.tslAtrMult ?? 3.5, 
          };
      }
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };
  
  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    const newCard = { 
        strategyId: defaultStrategy._id || "",
        code: defaultStrategy.code || "", 
        params: { ...(defaultStrategy.params || {}), tslAtrMult: 3.5 } 
    };
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, newCard] }));
  };
  
  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };
 
  const handleRunBacktest = async (e) => {
    e.preventDefault();
        if (formData.mlMode !== 'off' && !formData.mlModel) { alert("Please select an ML model."); return; }
    if (formData.mlMode === 'off' && !formData.code) { alert("Please select a TA Strategy."); return; }
    setBacktestResults({ main: null, individuals: [] });
    
    try {
      const res = await runNewBacktest?.(formData);
      if (res) { setBacktestResults({ main: res, individuals: [] }); }
    } catch (err) { 
      console.error("Single backtest failed:", err); 
    }
  };
  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    if (comboData.mlMode !== 'off' && !comboData.mlModel) { alert("Please select an ML model for the combo."); return; }
    if (comboData.strategies.filter(s => s.code?.trim()).length < 1) { alert("Please select at least one TA strategy for the combo."); return; }
    setBacktestResults({ main: null, individuals: [] });

    try {
      const comboRes = await runComboBacktest?.(comboData);
      if (comboRes) { setBacktestResults(comboRes); }
    } catch (err) { 
      console.error("Combo backtest failed:", err);
    }
  };

  // --- UI Helper Functions ---
  const getButtonText = (loadingState) => {
      switch (loadingState) {
      case 'running_ml': return `Processing ML... (${countdown}s)`;
      case 'running_backtest': return `Running Backtest... (${countdown}s)`;
      case 'running_combo': return `Running Combo... (${countdown}s)`;
      case 'fetching': return 'Fetching Data...';
      case 'running': return 'Processing...';
      case 'idle':
      default: return activeTab === 'single' ? 'Run Backtest' : 'Run Combo Backtest';
    }
  };
  const getStatusMessage = (loadingState, currentFormData) => {
      switch (loadingState) {
      case 'running_ml':
        if (currentFormData?.mlMode === 'predictions') return `Fetching ML features... (${countdown}s)`;
        if (currentFormData?.mlMode === 'on') return `Running ML simulation... (${countdown}s)`;
        return 'Running Python backtest...';
      case 'running_backtest':
        return `Running Backtest... (${countdown}s)`;
      case 'running_combo':
        return `Running Combo Backtest... (${countdown}s)`;
      case 'fetching': return 'Fetching required data...';
      case 'running': return 'Processing request...';
      default: return 'Processing...';
    }
  };

  const isSingleSubmitDisabled = loading !== 'idle' ||
    (!options?.symbols?.length) ||
    (formData.mlMode === 'off' && !formData.code) ||
    (formData.mlMode === 'predictions' && (!formData.code || !formData.mlModel)) ||
    (formData.mlMode === 'on' && !formData.mlModel);

  const isComboSubmitDisabled = loading !== 'idle' ||
    (!options?.symbols?.length) ||
    (comboData.mlMode === 'predictions' && (!comboData.mlModel)) ||
    (comboData.mlMode === 'on' && !comboData.mlModel) ||
    (comboData.strategies.filter(s => s.code?.trim()).length < 1);

  const currentFormDataForStatus = activeTab === 'single' ? formData : comboData;
 
  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Backtest Error</h4><p>{error.message || 'An unknown error occurred.'}</p></div>}

      <div className="backtest-main">
        <div className="backtest-forms">
          <div className="tabs">
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
          </div>

          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              {(formData.mlMode === 'off' || formData.mlMode === 'predictions') && (
                <label>Strategy:
                  <select 
                    name="strategyId" 
                    value={formData.strategyId} 
                    onChange={handleFormChange} 
                    disabled={!strategyOptions.length}
                  >
                    <option value="">-- Select TA Strategy --</option>
                    {strategyOptions.length ? strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : <option disabled>Loading...</option>}
                  </select>
                </label>
                 )}
              <CommonBacktestInputs
                  data={formData}
                  onChange={handleFormChange}
                  options={{ symbolOptions, timeframeOptions, modelOptions }}
                  availableModelData={availableModelData}
                  isCombo={false}
              />
              <button type="submit" disabled={isSingleSubmitDisabled}>
               {getButtonText(loading)}
              </button>
            </form>
          )}

          {activeTab === 'combo' && (
             <>
                <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                       <label style={{ color: '#4ade80', fontWeight: 'bold', margin: 0 }}>
                           🏆 Load Optimized Strategy (ML)
                       </label>
                       {selectedWinnerId && (
                           <button type="button" onClick={handleResetWinner} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '4px' }}>
                               Reset
                           </button>
                       )}
                   </div>
                   <select 
                       value={selectedWinnerId} 
                       onChange={handleWinnerSelect}
                       style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}
                   >
                       <option value="">-- Select a Golden Strategy --</option>
                       {winners && winners.map(w => (
                           <option key={w.id} value={w.id}>
                               {w.name}
                           </option>
                       ))}
                   </select>
                </div>

                <form onSubmit={handleRunComboBacktest} className="backtest-form">
                    <CommonBacktestInputs
                        data={comboData}
                        onChange={handleComboChange}
                            options={{ symbolOptions, timeframeOptions, modelOptions }}
                        availableModelData={availableModelData}
                        isCombo={true}
                    />
                    <div className="combo-strategy-list">
                        {comboData.strategies.map((config, idx) => (
                        <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />
                      ))}
                    </div>
                    <button type="button" onClick={addStrategyCard} disabled={loading !== 'idle' || !strategyOptions.length}>Add Strategy</button>
                    <button type="submit" disabled={isComboSubmitDisabled}>
                       {getButtonText(loading)}
                    </button>
                 </form>
             </>
          )}
        </div> 

        {/* ... Results Section Remains the Same ... */}
        {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            {loading !== 'idle' && (
              <div className="loading-overlay">
                <h3>{getStatusMessage(loading, currentFormDataForStatus)}</h3>
                <div className="spinner"></div>
              </div>
            )}
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} mainResult={mainResult} />
                
                {mainResult && mainResult.candleData?.length > 0 && (() => {
                  const symbol = activeTab === 'single' ? formData.symbol : comboData.symbol;
                  return <ChartReplay results={mainResult} symbol={symbol} />;
                })()}
                
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={combinedEquityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 25 }}>
                          {combinedEquityCurve.length > 0 && (
                           <XAxis dataKey="timestamp" tickFormatter={formatChartDate} angle={-30} textAnchor="end" height={50} interval="preserveStartEnd" />
                          )}
                          <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} allowDataOverflow={true} />
                          <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
                          <CartesianGrid stroke="#555" strokeDasharray="3 3"/>
                          <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        {pieData.length > 0 && (
                           <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 0.5; const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN); return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" > {`${pieData[index].name}: ${value}`} </text> ); }}>
                           {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                           </Pie>
                        )}
                        <Tooltip />
                        <Legend />
                      </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </>
            )}
            {loading === 'idle' && !combinedMetrics && !error && (
               <p className="no-results-message">Select parameters and run a backtest to see results here.</p>
            )}
          </div>
        )}
      </div> 
    </div> 
  );
}
