// File: src/pages/Backtests.jsx
//
// UPGRADES:
// - 🚀 FIXED (Bug 1): Rewrote `availableModelData` (line 316) to correctly
//   parse models *without* depending on `symbolOptions`. This fixes the
//   "all symbols are greyed out" bug.
// - 🚀 FIXED (Bug 2): Upgraded the `modelOptions` hook (line 309) to
//   alphabetically sort all models by Symbol, then Timeframe.
// - 🚀 FIXED (Bug 3): Kept the `useEffect` hook (line 440) to
//   prevent the "--Select Model --" bug.

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "./Backtests.css"; // Ensure you have styles for .loading-overlay, .spinner, .error-box, etc.

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

// Helper to format date strings for display
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  // Format as YYYY-MM-DD for input fields and potentially charts
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

// Helper to format timestamps (like from equity curve) for charts
const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    // Example: Show Month/Day for charts
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};


// Helper to get default date range (e.g., last year)
const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1); // Default end date to yesterday
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// 🚀 Helper for the ML-specific start date
const getMLStartDate = () => {
    // This MUST match the 'START_DATE_DOWNLOAD' in your train_models.py script
    return '2017-01-01'; 
}

// Default parameters for filters/strategy
const defaultFilterParams = {
    SL: 5.0,
    TP: 10.0,
    minAtrPct: 0, // Volatility filter (0 = off)
    trendFilterPeriod: 200, // Trend filter
    //hybridMode: 'AND' // Hybrid logic
};

// Initial state for the single backtest form
const initialFormData = {
  code: "", // TA Strategy code
  symbol: "",
  timeframe: "", // 🚀 Will be set by useEffect
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  params: { ...defaultFilterParams }, // Global/TA params
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off", // 'off', 'on', 'predictions'
  mlModel: "", // Model ID/name
  mlThreshold: 0.5,
  mlHorizon: 1 // Prediction horizon (if applicable)
};

// Initial state for the combo backtest form
const initialComboData = {
  strategies: [ // List of individual strategies in the combo
    { code: "", params: { SL: 5.0, TP: 10.0 } }, // Per-strategy SL/TP overrides
    { code: "", params: { SL: 5.0, TP: 10.0 } }
  ],
  params: { // Global combo parameters (filters, hybrid logic)
    minAtrPct: 0,
    trendFilterPeriod: 200,
    hybridMode: 'AND'
  },
  // Global settings for the combo backtest
  symbol: "",
  timeframe: "", // 🚀 Will be set by useEffect
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

// --- Child Components ---

// Displays performance metrics
const MetricsDisplay = ({ metrics }) => {
  // ... (Component is unchanged) ...
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

// 🚀 Common input fields shared between single and combo forms
// 🚀 Now accepts availableModelData
const CommonBacktestInputs = ({ data, onChange, options, availableModelData, isCombo = false }) => {
    // Extract options from props
    const symbolOptions = options.symbolOptions || [];
    const timeframeOptions = options.timeframeOptions || [];
    const allModelOptions = options.modelOptions || []; // Full list of ALL models

    // Handler for global parameters
    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' && value !== '' ? parseFloat(value) : value;
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent);
    };

    // Handler for top-level properties
    const handleGlobalChange = (e) => {
        onChange(e);
    };

    const params = data.params || {};

    // 🚀 --- NEW: Create Processed Dropdown Lists --- 🚀
    
    // 1. Process Symbol Options
    const processedSymbolOptions = useMemo(() => {
        // 🚀 FIXED: If mode is 'off' (Pure TA), show all symbols as available.
        if (data.mlMode === 'off') {
            return symbolOptions.map(s => ({ value: s, name: s, isAvailable: true }));
        }
        
        // In ML 'on' or 'hybrid' mode, check against the parsed data
        const { availableSymbols } = availableModelData;
        
        const sortedSymbols = [...symbolOptions].sort((a, b) => {
            const aHas = availableSymbols.has(a);
            const bHas = availableSymbols.has(b);
            return (bHas ? 1 : 0) - (aHas ? 1 : 0); // Sorts `true` (available) to the top
        });
        
        return sortedSymbols.map(s => {
            const isAvailable = availableSymbols.has(s);
            return {
                value: s,
                name: isAvailable ? s : `${s} (No models)`,
                isAvailable: isAvailable
            };
        });
    }, [data.mlMode, symbolOptions, availableModelData]); // 🚀 FIXED: data.mlMode is now a dependency

    // 2. Process Timeframe Options (depends on selected symbol)
    const processedTimeframeOptions = useMemo(() => {
        // 🚀 FIXED: If mode is 'off' (Pure TA), show all timeframes as available.
        if (data.mlMode === 'off') {
            return timeframeOptions.map(t => ({ value: t, name: t, isAvailable: true }));
        }
        
        // If no symbol is selected yet, grey them all out
        if (!data.symbol) {
             return timeframeOptions.map(t => ({
                value: t,
                name: `${t} (Select Symbol)`,
                isAvailable: false
             }));
        }

        const { lookup } = availableModelData; // e.g., Set {'BTC/USD_1h', 'ETH/USD_4h'}
        
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
    }, [data.mlMode, data.symbol, timeframeOptions, availableModelData]); // 🚀 FIXED: data.mlMode is now a dependency

    // 3. Filter Model Options (depends on symbol AND timeframe)
    const filteredModelOptions = useMemo(() => {
        // In hybrid mode, we show all models (already sorted).
        if (data.mlMode === 'predictions') {
             return allModelOptions.map(m => ({ ...m, isAvailable: true }));
        }
        // In 'on' mode, filter strictly
        const { availableSymbols } = availableModelData;
        
        const sortedSymbols = [...symbolOptions].sort((a, b) => {
            const aHas = availableSymbols.has(a);
            const bHas = availableSymbols.has(b);
            return (bHas ? 1 : 0) - (aHas ? 1 : 0); // Sorts `true` (available) to the top
        });
        
        return sortedSymbols.map(s => {
            const isAvailable = availableSymbols.has(s);
            return {
                value: s,
                name: isAvailable ? s : `${s} (No models)`,
                isAvailable: isAvailable
            };
        });
    }, [data.mlMode, symbolOptions, availableModelData]); // 🚀 FIXED: data.mlMode is now a dependency

    // 2. Process Timeframe Options (depends on selected symbol)
    const processedTimeframeOptions = useMemo(() => {
        // 🚀 FIXED: If mode is 'off' (Pure TA), show all timeframes as available.
        if (data.mlMode === 'off') {
            return timeframeOptions.map(t => ({ value: t, name: t, isAvailable: true }));
        }
        
        // If no symbol is selected yet, grey them all out
        if (!data.symbol) {
             return timeframeOptions.map(t => ({
                value: t,
                name: `${t} (Select Symbol)`,
                isAvailable: false
             }));
        }

        const { lookup } = availableModelData; // e.g., Set {'BTC/USD_1h', 'ETH/USD_4h'}
        
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
    }, [data.mlMode, data.symbol, timeframeOptions, availableModelData]); // 🚀 FIXED: data.mlMode is now a dependency

    // 3. Filter Model Options (depends on symbol AND timeframe)
    const filteredModelOptions = useMemo(() => {
        // In hybrid mode, we show all models (already sorted).
        if (data.mlMode === 'predictions') {
             return allModelOptions.map(m => ({ ...m, isAvailable: true }));

    // 🚀 --- END NEW LOGIC --- 🚀

    return (
        <>
            {/* 🚀 UPDATED Symbol Dropdown */}
            <label>Symbol:
                <select name="symbol" value={data.symbol} onChange={handleGlobalChange} disabled={!processedSymbolOptions.length}>
                    <option value="">-- Select Symbol --</option>
                    {processedSymbolOptions.map(s => (
                        <option 
                            key={s.value} 
                            value={s.value} 
                            // 🚀 FIXED: Disable only if mode is NOT 'off' AND not available
                            disabled={data.mlMode !== 'off' && !s.isAvailable} 
                            style={{ color: (data.mlMode !== 'off' && !s.isAvailable) ? '#888' : 'white' }}
                        >
                            {s.name}
                        </option>
                    ))}
                </select>
            </label>

            {/* 🚀 UPDATED Timeframe Dropdown */}
            <label>Timeframe:
                <select name="timeframe" value={data.timeframe} onChange={handleGlobalChange} disabled={!processedTimeframeOptions.length}>
                    <option value="">-- Select Timeframe --</option>
                    {processedTimeframeOptions.map(t => (
                        <option 
                            key={t.value} 
                            value={t.value} 
                            // 🚀 FIXED: Disable only if mode is NOT 'off' AND not available
                            disabled={data.mlMode !== 'off' && !t.isAvailable} 
                            style={{ color: (data.mlMode !== 'off' && !t.isAvailable) ? '#888' : 'white' }}
                        >
                            {t.name}
                        </option>
                    ))}
                </select>
            </label>

            {/* Date Inputs */}
            <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} /></label>
            <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} /></label>
            <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} min="1" step="1" /></label>

            {/* Risk Management Section */}
            <fieldset>
                {/* ... (Unchanged) ... */}
                <legend>Risk Management</legend>
                <label>Mode:
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={handleGlobalChange}>
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {data.riskManagementMode === 'standard' ? (
                    <label>Risk Per Trade (%): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" min="0.1" /> </label>
                ) : (
                    <>
                        <label>Growth Capital Target ($): <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={handleGlobalChange} min="1" step="1" /> </label>
                        <label>Risk % (After Target): <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={handleGlobalChange} step="0.1" min="0.1" /> </label>
                    </>
                )}
            </fieldset>

            {/* Machine Learning Section */}
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
                        {/* 🚀 UPDATED Model Dropdown */}
                        <label>Model:
                            <select 
                                name="mlModel" 
                                value={data.mlModel} 
                                onChange={handleGlobalChange} 
                                // Disable if in 'on' mode and there are no models for this pair
                                disabled={(data.mlMode === 'on' && !filteredModelOptions.length) || allModelOptions.length === 0}
                            >
                                <option value="">-- Select Model --</option>
                                {
                                  // In 'predictions' mode, show all models. In 'on' mode, show only filtered models.
                                  (data.mlMode === 'predictions' ? allModelOptions : filteredModelOptions).map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))
                                }
                                {/* Show a helpful message if no models match in 'on' mode */}
                                {data.mlMode === 'on' && filteredModelOptions.length === 0 && (
                                     <option disabled>
                                         {(!data.symbol || !data.timeframe) ? "Select symbol & timeframe" : "No models found for this pair"}
                                     </option>
                                )}
                            </select>
                        </label>
                        <label>Confidence Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={handleGlobalChange} /> </label>
                        <label>Prediction Horizon: <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={handleGlobalChange} /> </label>

                        {/* Hybrid Logic Selector */}
                        {data.mlMode === 'predictions' && (
                            <label>Hybrid Logic:
                                <select name="hybridMode" value={params.hybridMode ?? 'AND'} onChange={handleParamChange}>
                                    <option value="AND">TA AND ML (Strict Filter)</option>
                                    <option value="OR">TA OR ML (Permissive)</option>
                                    <option value="Regime">TA as Regime Filter</option>
                                </select>
                            </label>
                        )}
                    </>
                )}
            </fieldset>

            {/* Advanced Filters Section */}
            <fieldset>
                {/* ... (Unchanged) ... */}
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %):
                    <input type="number" name="minAtrPct" value={params.minAtrPct ?? 0} onChange={handleParamChange} step="0.05" min="0" title="Set to 0 to disable." />
                </label>
                {(data.mlMode === 'on' || (data.mlMode === 'predictions' && params.hybridMode === 'Regime')) && (
                    <label>Trend Filter SMA Period:
                        <input type="number" name="trendFilterPeriod" value={params.trendFilterPeriod ?? 200} onChange={handleGlobalChange} step="1" min="1" title="e.g., 200." />
                    </label>
                )}
            </fieldset>

            {/* SL/TP Inputs (Only for Single mode form) */}
            {!isCombo && (
                <>
                    <label>Stop Loss (%):
                        <input type="number" name="SL" value={params.SL ?? 5.0} onChange={handleParamChange} step="0.1" min="0" />
                    </label>
                    <label>Take Profit (%):
                        <input type="number" name="TP" value={params.TP ?? 10.0} onChange={handleParamChange} step="0.1" min="0" />
                    </label>
                </>
            )}
        </>
    );
};

// ... (ComboStrategyCard component is unchanged) ...
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);
  return (
    <div className="combo-card">
      <div className="combo-card-header"><strong>Strategy #{idx + 1}</strong>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} className="remove-btn">✕</button>}
      </div>
      <div className="combo-card-body">
        <label>Strategy:
          <select name="code" value={config.code} onChange={handleChange} disabled={!strategies.length}>
            <option value="">-- Select --</option>
            {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option disabled>Loading...</option>}
          </select>
        </label>
        <label>Stop Loss (%): <input type="number" name="param_SL" value={config.params?.SL ?? 5.0} onChange={handleChange} step="0.1" min="0" /></label>
        <label>Take Profit (%): <input type="number" name="param_TP" value={config.params?.TP ?? 10.0} onChange={handleChange} step="0.1" min="0" /></label>
      </div>
    </div>
  );
};


// --- Main Page Component ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, getPastBacktests } = useBacktest(); // Destructure getPastBacktests
  const { loading = 'initial', error = null, options = {} } = state || {};

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');

  // Memoize options from hook
  const strategyOptions = useMemo(() => options?.strategies || [], [options?.strategies]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options?.symbols]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options?.timeframes]);
  
  // 🚀 --- 🚀 🚀 🚀 --- 🚀
  // 🚀 THIS IS THE UPGRADE for sorting your models
  // 🚀 --- 🚀 🚀 🚀 --- 🚀
  
  // 1. Helper to give timeframes a sortable "weight"
  const timeframeWeights = {
      '30m': 1,
      '1h': 2,
      '4h': 3,
      '1d': 4,
      '1w': 5,
  };
  
  // 2. Parse and Sort the Model List
  const modelOptions = useMemo(() => {
      if (!options?.models) return [];

      // Parse each model name
      const parsedModels = options.models.map(model => {
          const parts = model.id.split('_');
          let symbolBase = 'zzz'; // Default to last
          let timeframe = 'zzz';
          let tfWeight = 99;
          let modelName = model.name;
          
          if (parts.length >= 3) {
              symbolBase = parts[0]; // 'btc'
              timeframe = parts[1];  // '1h'
              tfWeight = timeframeWeights[timeframe] || 99;
              modelName = parts.slice(2).join('_'); // 'xgboost_model'
          }
          return { ...model, symbolBase, timeframe, tfWeight, modelName };
      });
      
      // Sort the parsed list
      parsedModels.sort((a, b) => {
          // Sort by Symbol (A-Z)
          if (a.symbolBase < b.symbolBase) return -1;
          if (a.symbolBase > b.symbolBase) return 1;
          
          // If Symbol is same, sort by Timeframe (smallest first)
          if (a.tfWeight < b.tfWeight) return -1;
          if (a.tfWeight > b.tfWeight) return 1;
          
          // If Timeframe is same, sort by Model Name (A-Z)
          if (a.modelName < b.modelName) return -1;
          if (a.modelName > b.modelName) return 1;
          
          return 0;
      });
      
      return parsedModels;
  }, [options?.models]);
  // 🚀 --- END OF SORTING UPGRADE --- 🚀


  // 🚀 --- 🚀 🚀 🚀 --- 🚀
  // 🚀 THIS IS THE UPGRADE that fixes the "chicken-and-egg" bug
  // 🚀 --- 🚀 🚀 🚀 --- 🚀
  const availableModelData = useMemo(() => {
    const availableSymbols = new Set(); // e.g., 'BTC/USD'
    const availableTimeframes = new Set(); // e.g., '1h'
    const lookup = new Set(); // e.g., 'BTC/USD_1h'

    if (!modelOptions.length) {
        // If models haven't loaded, return empty sets
        return { availableSymbols, availableTimeframes, lookup };
    }

    for (const model of modelOptions) {
        // model.id is 'btc_1h_xgboost_model'
        // We can use the pre-parsed values now
        const { symbolBase, timeframe } = model;
        
        // 🚀 FIXED: Directly create the full symbol name.
        // This assumes all symbols are paired with 'USD'.
        const fullSymbol = `${symbolBase.toUpperCase()}/USD`; 
        
        availableSymbols.add(fullSymbol);
        availableTimeframes.add(timeframe);
        lookup.add(`${fullSymbol}_${timeframe}`);
    }
    return { availableSymbols, availableTimeframes, lookup };
  }, [modelOptions]); // 🚀 FIXED: Only depends on modelOptions
  // 🚀 --- END OF UPGRADE --- 🚀


  // --- Effects to set default form values when options load ---
  useEffect(() => {
    if (strategyOptions.length > 0 && !formData.code) {
      const defaultStrategy = strategyOptions[0];
      setFormData(prev => ({ ...prev, code: defaultStrategy.code, params: { ...defaultStrategy.params, ...prev.params } }));
    }
  }, [strategyOptions]);

  useEffect(() => {
    if (strategyOptions.length > 0 && comboData.strategies.every(c => !c.code)) {
      const newConfigs = comboData.strategies.map((config, index) => {
        const strategy = strategyOptions[index] || strategyOptions[0];
        return { code: strategy.code, params: { ...strategy.params, SL: 5.0, TP: 10.0 } };
      });
      setComboData(prev => ({ ...prev, strategies: newConfigs }));
    }
  }, [strategyOptions]);

  useEffect(() => {
    if (symbolOptions.length && !formData.symbol) {
      const defaultSymbol = symbolOptions.find(s => s === 'BTC/USD') || symbolOptions[0];
      setFormData(prev => ({ ...prev, symbol: defaultSymbol }));
      setComboData(prev => ({ ...prev, symbol: defaultSymbol }));
    }
  }, [symbolOptions]);

  useEffect(() => {
    if (timeframeOptions.length && !formData.timeframe) {
        const defaultTimeframe = timeframeOptions.find(t => t === '1h') || timeframeOptions[0];
        setFormData(prev => ({ ...prev, timeframe: defaultTimeframe }));
        setComboData(prev => ({ ...prev, timeframe: defaultTimeframe }));
    }
  }, [timeframeOptions]);

  // 🚀 --- NEW: Effect to dynamically change date range based on ML Mode --- 🚀
  useEffect(() => {
    const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDates();
    const mlStartDate = getMLStartDate(); // '2017-01-01'

    setFormData(prev => ({
        ...prev,
        startDate: prev.mlMode === 'on' ? mlStartDate : defaultStart,
        endDate: defaultEnd
    }));
    
    setComboData(prev => ({
        ...prev,
        startDate: prev.mlMode === 'on' ? mlStartDate : defaultStart,
        endDate: defaultEnd
    }));
    
  }, [formData.mlMode, comboData.mlMode]);
  // 🚀 --- END NEW EFFECT --- 🚀

  
  // 🚀 --- 🚀 🚀 🚀 --- 🚀
  // 🚀 THIS IS THE UPGRADE to fix the "--Select Model--" bug
  // 🚀 It is now two separate, simpler hooks.
  // 🚀 --- 🚀 🚀 🚀 --- 🚀
  
  // This hook auto-selects the default model for the SINGLE form
  useEffect(() => {
    // Don't run if options aren't loaded, or form isn't ready
    if (modelOptions.length === 0 || !formData.symbol || !formData.timeframe || (formData.mlMode !== 'on' && formData.mlMode !== 'predictions')) {
      return; 
    }

    const symbolBase = formData.symbol.split('/')[0].toLowerCase();
    const timeframe = formData.timeframe;

    // Find all valid models for this pair
    const validModels = modelOptions.filter(m => {
        // In 'predictions' mode, all models are valid (already sorted)
        if (formData.mlMode === 'predictions') {
            return true;
        }

        // --- Logic for 'on' mode ---
        // Use the pre-parsed values for filtering
        return (m.symbolBase === symbolBase) && (m.timeframe === timeframe);
    });

    const firstValidModel = validModels[0]; // Get the first one
    const firstValidModelId = firstValidModel ? firstValidModel.id : "";
    const isCurrentModelValid = validModels.some(m => m.id === formData.mlModel);

    // --- Apply Logic to Single Form ---
    if (!isCurrentModelValid) {
      // If the current model is NOT valid, reset it.
      setFormData(prev => ({
        ...prev,
        mlModel: firstValidModelId // Set to first valid model, or "" if none exist
      }));
    }
  }, [modelOptions, formData.symbol, formData.timeframe, formData.mlMode, formData.mlModel]); // Added mlModel


  // This hook auto-selects the default model for the COMBO form
  useEffect(() => {
    if (modelOptions.length === 0 || !comboData.symbol || !comboData.timeframe || (comboData.mlMode !== 'on' && comboData.mlMode !== 'predictions')) {
      return; 
    }

    const symbolBase = comboData.symbol.split('/')[0].toLowerCase();
    const timeframe = comboData.timeframe;

    const validModels = modelOptions.filter(m => {
        // In 'predictions' mode, all models are valid (already sorted)
        if (comboData.mlMode === 'predictions') {
            return true;
        }

        // --- Logic for 'on' mode ---
        return (m.symbolBase === symbolBase) && (m.timeframe === timeframe);
    });

    const firstValidModel = validModels[0];
    const firstValidModelId = firstValidModel ? firstValidModel.id : "";
    const isCurrentModelValid = validModels.some(m => m.id === comboData.mlModel);

    if (!isCurrentModelValid) {
      setComboData(prev => ({
        ...prev,
        mlModel: firstValidModelId
      }));
    }
  }, [modelOptions, comboData.symbol, comboData.timeframe, comboData.mlMode, comboData.mlModel]); // Added mlModel
  // 🚀 --- END OF BUG FIX --- 🚀


  // ... (useMemo for combinedEquityCurve, pieData remains unchanged) ...
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
      try {
        const mainResult = backtestResults?.main || backtestResults?.combinedResult;
        if (mainResult?.metrics && mainResult?.equityCurve) {
          return {
            combinedEquityCurve: (mainResult.equityCurve || []).map(p => ({ ...p, timestamp: new Date(p.timestamp).getTime() })),
            combinedMetrics: mainResult.metrics || null,
          };
        }
        return { combinedEquityCurve: [], combinedMetrics: null };
      } catch (e) {
        console.error("Error processing results:", e);
        return { combinedEquityCurve: [], combinedMetrics: null };
      }
  }, [backtestResults]);
  const pieData = useMemo(() => {
    if (!combinedMetrics || typeof combinedMetrics.winningTrades !== 'number' || typeof combinedMetrics.totalTrades !== 'number') return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    if (wins <= 0 && losses <= 0) return [];
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);


  // Initial loading screen
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


  // --- Event Handlers (handleFormChange, handleComboChange, etc. are unchanged) ---
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' && value !== '' ? parseFloat(value) : (type === 'checkbox' ? e.target.checked : value);
    if (name === 'code') {
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      setFormData(prev => ({ ...prev, code: value, params: { ...prev.params, ...(selectedStrategy?.params || {}) } }));
    } else if (name.startsWith("param_")) {
      const paramName = name.substring(6);
      setFormData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };
  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' && value !== '' ? parseFloat(value) : (type === 'checkbox' ? e.target.checked : value);
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
    const val = type === 'number' && value !== '' ? parseFloat(value) : (type === 'checkbox' ? e.target.checked : value);
    const updatedStrategies = [...comboData.strategies];
    const currentConfig = { ...updatedStrategies[index] };
    if (isParam) {
      const paramName = name.substring(6);
      currentConfig.params = { ...(currentConfig.params || {}), [paramName]: val };
    } else if (name === 'code') {
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      currentConfig.code = value;
      currentConfig.params = { ...(selectedStrategy?.params || {}), SL: currentConfig.params?.SL ?? 5.0, TP: currentConfig.params?.TP ?? 10.0, };
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };
  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    const newCard = { code: defaultStrategy.code || "", params: { ...(defaultStrategy.params || {}), SL: 5.0, TP: 10.0 } };
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, newCard] }));
  };
  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  // --- Submit Handlers (Unchanged) ---
  const handleRunBacktest = async (e) => {
    e.preventDefault();
    if (formData.mlMode !== 'off' && !formData.mlModel) { alert("Please select an ML model."); return; }
    if (formData.mlMode === 'off' && !formData.code) { alert("Please select a TA Strategy."); return; }
    setBacktestResults({ main: null, individuals: [] });
    try {
      // 🚀 This now calls the correct, un-mocked hook
      const res = await runNewBacktest?.(formData);
      if (res) { setBacktestResults({ main: res, individuals: [] }); }
    } catch (err) { console.error("Single backtest submission failed:", err.message); }
  };
  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    if (comboData.mlMode !== 'off' && !comboData.mlModel) { alert("Please select an ML model for the combo."); return; }
    if (comboData.strategies.filter(s => s.code?.trim()).length < 1) { alert("Please select at least one TA strategy for the combo."); return; }
    setBacktestResults({ main: null, individuals: [] });
    try {
      // 🚀 This now calls the correct, un-mocked hook
      const comboRes = await runComboBacktest?.(comboData);
      if (comboRes) { setBacktestResults(comboRes); }
    } catch (err) { console.error("Combo backtest submission failed:", err.message); }
  };

  // --- UI Helper Functions (Unchanged) ---
  const getButtonText = (loadingState) => {
    switch (loadingState) {
      case 'running_ml': return 'Processing ML...';
      case 'running_backtest': return 'Running Backtest...';
      case 'running_combo': return 'Running Combo...';
      case 'fetching': return 'Fetching Data...';
      case 'running': return 'Processing...';
      case 'idle':
      default: return activeTab === 'single' ? 'Run Backtest' : 'Run Combo Backtest';
    }
  };
  const getStatusMessage = (loadingState, currentFormData) => {
    switch (loadingState) {
      case 'running_ml':
        if (currentFormData?.mlMode === 'predictions') return 'Fetching external ML features & predictions...';
        if (currentFormData?.mlMode === 'on') return 'Running Python ML backtest (loading data, applying model, simulating)...';
        return 'Processing Machine Learning...';
      case 'running_backtest':
        if (currentFormData?.mlMode === 'off') return 'Running TA simulation in Node.js...';
        if (currentFormData?.mlMode === 'on') return 'Initiating Python ML backtest... (Checking cache)';
        return 'Starting backtest simulation...';
      case 'running_combo':
        return `Running Combo Backtest (${currentFormData?.mlMode === 'predictions' ? 'Hybrid/External' : 'TA/Node'})...`;
      case 'fetching': return 'Fetching required data...';
      case 'running': return 'Processing request...';
      default: return 'Processing...';
    }
  };

  // Updated single submit logic
  const isSingleSubmitDisabled = loading !== 'idle' ||
    (!options?.symbols?.length) ||
    (formData.mlMode === 'off' && !formData.code) ||
    (formData.mlMode === 'predictions' && (!formData.code || !formData.mlModel)) ||
    (formData.mlMode === 'on' && !formData.mlModel);

  const currentFormDataForStatus = activeTab === 'single' ? formData : comboData;

  // --- Render JSX ---
  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Backtest Error</h4><p>{error.message || 'An unknown error occurred.'}</p></div>}

      <div className="backtest-main">
        <div className="backtest-forms">
          {/* Tabs */}
          <div className="tabs">
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
          </div>

          {/* Single Strategy Form */}
          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              {(formData.mlMode === 'off' || formData.mlMode === 'predictions') && (
                <label>Strategy:
                  <select name="code" value={formData.code} onChange={handleFormChange} disabled={!strategyOptions.length}>
                    <option value="">-- Select TA Strategy --</option>
                    {strategyOptions.length ? strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option disabled>Loading...</option>}
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

          {/* Combo Strategy Form */}
          {activeTab === 'combo' && (
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
          )}
        </div> {/* end backtest-forms */}

        {/* --- Results Section --- */}
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
                <MetricsDisplay metrics={combinedMetrics} />
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                     <ResponsiveContainer width="100%" height={300}>
                       <LineChart data={combinedEquityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 25 }}>
                         <XAxis dataKey="timestamp" tickFormatter={formatChartDate} angle={-30} textAnchor="end" height={50} interval="preserveStartEnd" />
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
                         <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 0.5; const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN); return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" > {`${pieData[index].name}: ${value}`} </text> ); }}>
                           {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                         </Pie>
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
      </div> {/* end backtest-main */}
    </div> // end dashboard-container
  );
}

