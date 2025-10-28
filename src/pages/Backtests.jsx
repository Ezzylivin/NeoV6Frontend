// File: src/pages/Backtests.jsx
// Final Version with Integrated Loading Status Updates

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

// Default parameters for filters/strategy
const defaultFilterParams = {
    SL: 5.0,
    TP: 10.0,
    minAtrPct: 0, // Volatility filter (0 = off)
    trendFilterPeriod: 200, // Trend filter
    hybridMode: 'AND' // Hybrid logic
};

// Initial state for the single backtest form
const initialFormData = {
  code: "", // TA Strategy code
  symbol: "",
  timeframe: "1h",
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

// --- Child Components ---

// Displays performance metrics
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const formatValue = (value, format) => {
      if (typeof value !== "number" || isNaN(value)) return "N/A";
      switch (format) {
          case 'currency': return `$${value.toFixed(2)}`;
          case 'percent': return `${value.toFixed(2)}%`;
          case 'number': return value.toFixed(2); // Default number format
          default: return value; // Raw number if no format
      }
  };
  const items = [
    { label: "Total Return", value: metrics.totalReturn, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades, format: null }, // Use default formatting (whole number)
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

// Common input fields shared between single and combo forms
const CommonBacktestInputs = ({ data, onChange, options, isCombo = false }) => {
    // Extract options from props, providing defaults
    const symbolOptions = options.symbolOptions || [];
    const timeframeOptions = options.timeframeOptions || [];
    const modelOptions = options.modelOptions || []; // Expects array like [{ id: 'model1', name: 'Model One' }]

    // Handler for global parameters stored in data.params (like filters)
    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        // Convert number inputs, keep others as strings/booleans
        const val = type === 'number' && value !== '' ? parseFloat(value) : value;
        // Create a synthetic event targeting the 'params' object
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent); // Call parent onChange
    };

    // Handler for top-level form data properties (symbol, mlMode, etc.)
    const handleGlobalChange = (e) => {
        onChange(e); // Pass the original event up
    };

    // Get the current params object for displaying values
    const params = data.params || {};

    return (
        <>
            {/* Symbol Dropdown */}
            <label>Symbol:
                <select name="symbol" value={data.symbol} onChange={handleGlobalChange} disabled={!symbolOptions.length}>
                    <option value="">-- Select Symbol --</option>
                    {symbolOptions.length ? symbolOptions.map(s => <option key={s} value={s}>{s}</option>) : <option disabled>Loading...</option>}
                </select>
            </label>

            {/* Timeframe Dropdown */}
            <label>Timeframe:
                <select name="timeframe" value={data.timeframe} onChange={handleGlobalChange} disabled={!timeframeOptions.length}>
                    {timeframeOptions.length ? timeframeOptions.map(t => <option key={t} value={t}>{t}</option>) : <option disabled>Loading...</option>}
                </select>
            </label>

            {/* Date Inputs */}
            <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={handleGlobalChange} /></label>
            <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={handleGlobalChange} /></label>

            {/* Initial Balance */}
            <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={handleGlobalChange} min="1" step="1" /></label>

            {/* Risk Management Section */}
            <fieldset>
                <legend>Risk Management</legend>
                <label>Mode:
                    <select name="riskManagementMode" value={data.riskManagementMode} onChange={handleGlobalChange}>
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {/* Conditional inputs based on risk mode */}
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
                {/* Conditional inputs based on ML mode */}
                {data.mlMode !== "off" && (
                    <>
                        <label>Model:
                            <select name="mlModel" value={data.mlModel} onChange={handleGlobalChange} disabled={!modelOptions.length}>
                                <option value="">-- Select Model --</option>
                                {modelOptions.length ? (
                                    modelOptions.map(m => (
                                        // Use m.id for value, m.name for display
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                ) : (
                                    <option disabled>Loading...</option>
                                )}
                            </select>
                        </label>
                        <label>Confidence Threshold: <input type="number" name="mlThreshold" value={data.mlThreshold || 0.5} step="0.01" min="0" max="1" onChange={handleGlobalChange} /> </label>
                        <label>Prediction Horizon: <input type="number" name="mlHorizon" value={data.mlHorizon || 1} step="1" min="1" onChange={handleGlobalChange} /> </label>

                        {/* Hybrid Logic Selector */}
                        {data.mlMode === 'predictions' && (
                            <label>Hybrid Logic:
                                <select
                                    name="hybridMode" // Targets params.hybridMode via handleParamChange
                                    value={params.hybridMode ?? 'AND'}
                                    onChange={handleParamChange} // Use param change handler
                                >
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
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %):
                    <input
                        type="number"
                        name="minAtrPct" // Targets params.minAtrPct
                        value={params.minAtrPct ?? 0}
                        onChange={handleParamChange} // Use param change handler
                        step="0.05"
                        min="0"
                        title="Set to 0 to disable. e.g., 0.25 = only trade if 14-period ATR is > 0.25% of the close price."
                    />
                </label>

                {/* Trend Filter (conditional) */}
                {(data.mlMode === 'on' || (data.mlMode === 'predictions' && params.hybridMode === 'Regime')) && (
                    <label>Trend Filter SMA Period:
                        <input
                            type="number"
                            name="trendFilterPeriod" // Targets params.trendFilterPeriod
                            value={params.trendFilterPeriod ?? 200}
                            onChange={handleParamChange} // Use param change handler
                            step="1"
                            min="1"
                            title="e.g., 200. Only takes ML buy signals above SMA, sells below."
                        />
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

// Card component for configuring a single strategy within a combo
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx); // Pass index to parent handler
  return (
    <div className="combo-card">
      <div className="combo-card-header">
        <strong>Strategy #{idx + 1}</strong>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} className="remove-btn">✕</button>}
      </div>
      <div className="combo-card-body">
        <label>Strategy:
          <select name="code" value={config.code} onChange={handleChange} disabled={!strategies.length}>
            <option value="">-- Select --</option>
            {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option disabled>Loading...</option>}
          </select>
        </label>
        {/* Per-strategy SL/TP overrides */}
        <label>Stop Loss (%): <input type="number" name="param_SL" value={config.params?.SL ?? 5.0} onChange={handleChange} step="0.1" min="0" /></label>
        <label>Take Profit (%): <input type="number" name="param_TP" value={config.params?.TP ?? 10.0} onChange={handleChange} step="0.1" min="0" /></label>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function Backtests() {
  // Get state and actions from the backtest hook
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  // Destructure state with defaults
  const { loading = 'initial', error = null, options = {} } = state || {};

  // Local state for form data and results
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'combo'

  // Memoize options to prevent unnecessary re-renders
  const strategyOptions = useMemo(() => options?.strategies || [], [options?.strategies]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options?.symbols]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options?.timeframes]);
  const modelOptions = useMemo(() => options?.models || [], [options?.models]); // Expects [{id:'...', name:'...'}]

  // --- Effects to set default form values when options load ---
  useEffect(() => {
    // Set default TA strategy for single form
    if (strategyOptions.length > 0 && !formData.code) {
      const defaultStrategy = strategyOptions[0];
      setFormData(prev => ({
        ...prev,
        code: defaultStrategy.code,
        // Merge default strategy params, keeping existing form params (like SL/TP if already changed)
        params: { ...defaultStrategy.params, ...prev.params }
      }));
    }
  }, [strategyOptions, formData.code, formData.params]); // Rerun if code or params change externally

  useEffect(() => {
     // Set default TA strategies for combo form (if empty)
    if (strategyOptions.length > 0 && comboData.strategies.every(c => !c.code)) {
      const newConfigs = comboData.strategies.map((config, index) => {
        const strategy = strategyOptions[index] || strategyOptions[0]; // Use indexed or first strategy
        return {
          code: strategy.code,
          params: { ...strategy.params, SL: 5.0, TP: 10.0 } // Start with strategy defaults + default SL/TP
        };
      });
      setComboData(prev => ({ ...prev, strategies: newConfigs }));
    }
  }, [strategyOptions, comboData.strategies]); // Rerun if strategies array structure changes

  useEffect(() => {
    // Set default symbol for both forms
    if (symbolOptions.length && !formData.symbol) {
      const defaultSymbol = symbolOptions[0];
      setFormData(prev => ({ ...prev, symbol: defaultSymbol }));
      setComboData(prev => ({ ...prev, symbol: defaultSymbol }));
    }
  }, [symbolOptions, formData.symbol]);

  useEffect(() => {
    // Set default ML Model for both forms
    if (modelOptions.length && !formData.mlModel) {
      const defaultModelId = modelOptions[0].id;
      setFormData(prev => ({ ...prev, mlModel: defaultModelId }));
      setComboData(prev => ({ ...prev, mlModel: defaultModelId }));
    }
  }, [modelOptions, formData.mlModel]);

  // Memoize processed results for charts
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
      try {
        // Handle both single ({main: result}) and combo ({combinedResult: result}) structures
        const mainResult = backtestResults?.main || backtestResults?.combinedResult;
        if (mainResult?.metrics && mainResult?.equityCurve) {
          return {
            // Convert timestamps for Recharts LineChart
            combinedEquityCurve: (mainResult.equityCurve || []).map(p => ({
                ...p,
                timestamp: new Date(p.timestamp).getTime() // Ensure it's a number for the chart
             })),
            combinedMetrics: mainResult.metrics || null,
          };
        }
        return { combinedEquityCurve: [], combinedMetrics: null }; // Default empty state
      } catch (e) {
        console.error("Error processing backtest results for charts:", e);
        return { combinedEquityCurve: [], combinedMetrics: null };
      }
  }, [backtestResults]); // Recalculate only when results change

  // Memoize data for the Pie chart
  const pieData = useMemo(() => {
    if (!combinedMetrics || typeof combinedMetrics.winningTrades !== 'number' || typeof combinedMetrics.totalTrades !== 'number') return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    // Only return data if there are trades
    if (wins <= 0 && losses <= 0) return [];
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);


  // --- Event Handlers ---

  // Handle changes in the single strategy form
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    // Convert numbers, keep others as is
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;

    if (name === 'code') { // Special handling for strategy selection
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      setFormData(prev => ({
          ...prev,
          code: value,
          // Reset params to strategy defaults, but keep user-set SL/TP/filters
          params: {
              ...prev.params, // Keep existing SL, TP, minAtrPct, etc.
              ...(selectedStrategy?.params || {}) // Overwrite with strategy defaults (excluding SL/TP etc.)
           }
      }));
    } else if (name.startsWith("param_")) { // Handle changes to parameters within 'params' object
      const paramName = name.substring(6); // Extract param name (e.g., "SL")
      setFormData(prev => ({
          ...prev,
          params: { ...prev.params, [paramName]: val } // Update the specific param
      }));
    } else { // Handle top-level form fields
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  // Handle changes in the global part of the combo form
  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;

    if (name.startsWith("param_")) { // Global combo params
      const paramName = name.substring(6);
      setComboData(prev => ({
          ...prev,
          params: { ...prev.params, [paramName]: val } // Update global combo params
      }));
    } else { // Global combo properties (symbol, timeframe, mlMode, etc.)
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };

  // Handle changes within a specific strategy card in the combo form
  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    const isParam = name.startsWith("param_"); // Is it param_SL or param_TP?
    const val = type === 'number' && value !== '' ? parseFloat(value) : value;

    const updatedStrategies = [...comboData.strategies]; // Create a copy
    const currentConfig = { ...updatedStrategies[index] }; // Copy the specific strategy config

    if (isParam) {
      const paramName = name.substring(6); // "SL" or "TP"
      // Ensure params object exists
      currentConfig.params = { ...(currentConfig.params || {}), [paramName]: val };
    } else if (name === 'code') { // Strategy selection changed
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      currentConfig.code = value;
      // Reset params based on selected strategy, keeping overrides
      currentConfig.params = {
        ...(selectedStrategy?.params || {}), // Base params from strategy definition
        SL: currentConfig.params?.SL ?? 5.0, // Keep existing SL override or default
        TP: currentConfig.params?.TP ?? 10.0, // Keep existing TP override or default
      };
    }

    updatedStrategies[index] = currentConfig; // Update the array
    setComboData(prev => ({ ...prev, strategies: updatedStrategies })); // Set the new state
  };

  // Add a new empty strategy card to the combo
  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    const newCard = {
        code: defaultStrategy.code || "", // Default to first strategy or empty
        params: { ...(defaultStrategy.params || {}), SL: 5.0, TP: 10.0 } // Use defaults + default SL/TP
    };
    // Add the new card config to the strategies array
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, newCard] }));
  };

  // Remove a strategy card from the combo
  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return; // Keep at least one
    // Filter out the strategy at the given index
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  // --- Submit Handlers ---

  // Handle single backtest submission
  const handleRunBacktest = async (e) => {
    e.preventDefault(); // Prevent default form submission
    // Basic validation
    if (formData.mlMode !== 'off' && !formData.mlModel) {
      alert("Please select an ML model."); return;
    }
     if (formData.mlMode === 'off' && !formData.code) {
      alert("Please select a TA Strategy."); return;
    }
    setBacktestResults({ main: null, individuals: [] }); // Clear previous results
    try {
      // Call the hook action, which handles loading state and API call
      const res = await runNewBacktest?.(formData);
      // Update local results state if successful
      if (res) {
        setBacktestResults({ main: res, individuals: [] });
      }
    } catch (err) {
      console.error("Single backtest submission failed:", err.message);
      // Error state is set within useBacktest hook and displayed via {error}
    }
  };

  // Handle combo backtest submission
  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    // Basic validation
    if (comboData.mlMode !== 'off' && !comboData.mlModel) {
      alert("Please select an ML model for the combo."); return;
    }
    if (comboData.strategies.filter(s => s.code?.trim()).length < 1) {
      alert("Please select at least one TA strategy for the combo."); return;
    }
    setBacktestResults({ main: null, individuals: [] }); // Clear previous
    try {
       // Call the hook action
      const comboRes = await runComboBacktest?.(comboData);
      // Update local results state (expects { combinedResult: ..., individualResults: ... })
      if (comboRes) {
        setBacktestResults(comboRes);
      }
    } catch (err) {
      console.error("Combo backtest submission failed:", err.message);
       // Error state is set within useBacktest hook
    }
  };

  // --- UI Helper Functions ---

  // 🚀 Function to get button text based on loading state
  const getButtonText = (loadingState) => {
    switch (loadingState) {
      case 'running_ml': return 'Processing ML...';
      case 'running_backtest': return 'Running Backtest...';
      case 'running_combo': return 'Running Combo...';
      case 'fetching': return 'Fetching Data...';
      case 'running': return 'Processing...';
      case 'initial': return 'Initializing...';
      case 'idle':
      default: return activeTab === 'single' ? 'Run Backtest' : 'Run Combo Backtest';
    }
  };

  // 🚀 Function to get detailed status message based on loading state and form data
  const getStatusMessage = (loadingState, currentFormData) => {
    switch (loadingState) {
      case 'running_ml':
        if (currentFormData?.mlMode === 'predictions') return 'Fetching external ML predictions...';
        if (currentFormData?.mlMode === 'on') return 'Running Python ML backtest (loading data, applying model, simulating)...';
        return 'Processing Machine Learning task...';
      case 'running_backtest':
        if (currentFormData?.mlMode === 'off') return 'Running TA simulation (Node.js)...';
        if (currentFormData?.mlMode === 'on') return 'Initiating Python ML backtest...';
        return 'Starting backtest simulation...';
      case 'running_combo':
        return `Running Combo Backtest (${currentFormData?.mlMode === 'predictions' ? 'Hybrid/External' : 'TA/Node'})...`;
      case 'fetching': return 'Fetching required data...';
      case 'running': return 'Processing request...';
      case 'initial': return 'Initializing backtest environment...';
      case 'idle': return 'Ready.'; // Or null if you don't want a message when idle
      default: return 'Processing...';
    }
  };

  // Disable combo submit button if loading or invalid state
  const isComboSubmitDisabled = loading !== 'idle' || !strategyOptions.length || comboData.strategies.filter(s => s.code?.trim()).length < 1;
  // Disable single submit button if loading or invalid state
  const isSingleSubmitDisabled = loading !== 'idle' || !strategyOptions.length || (formData.mlMode === 'off' && !formData.code) || (formData.mlMode !== 'off' && !formData.mlModel);

  // Determine which form data to pass to getStatusMessage
  const currentFormDataForStatus = activeTab === 'single' ? formData : comboData;

  // --- Render JSX ---
  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {/* Display error if present */}
      {error && <div className="error-box"><h4>Error</h4><p>{error.message || 'An unknown error occurred.'}</p></div>}

      <div className="backtest-main">
        {/* --- Forms Section --- */}
        <div className="backtest-forms">
          {/* Tabs */}
          <div className="tabs">
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
          </div>

          {/* Single Strategy Form */}
          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              <label>Strategy:
                <select name="code" value={formData.code} onChange={handleFormChange} disabled={!strategyOptions.length}>
                  <option value="">-- Select TA Strategy --</option>
                  {strategyOptions.length ? strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option disabled>Loading...</option>}
                </select>
              </label>
              <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions }} isCombo={false} />
              <button type="submit" disabled={isSingleSubmitDisabled}>
                {getButtonText(loading)}
              </button>
            </form>
          )}

          {/* Combo Strategy Form */}
          {activeTab === 'combo' && (
             <form onSubmit={handleRunComboBacktest} className="backtest-form">
                <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} isCombo={true} />
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
        </div>

        {/* --- Results Section --- */}
        {/* Show results container if loading, error occurred, or results are available */}
        {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="results-section">
            <h2>Backtest Results</h2>

             {/* Loading Overlay with detailed message */}
            {loading !== 'idle' && (
              <div className="loading-overlay">
                 {/* 🚀 Use getStatusMessage */}
                <h3>{getStatusMessage(loading, currentFormDataForStatus)}</h3>
                 {/* Add a simple spinner (CSS needed) */}
                <div className="spinner"></div>
              </div>
            )}

            {/* Display results only when idle, metrics exist, and no error */}
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                     <ResponsiveContainer width="100%" height={300}>
                       <LineChart data={combinedEquityCurve}>
                         <XAxis dataKey="timestamp" tickFormatter={formatChartDate} angle={-30} textAnchor="end" height={50} />
                         <YAxis domain={['auto', 'auto']} />
                         <Tooltip />
                         <CartesianGrid stroke="#555" strokeDasharray="3 3"/>
                         <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} strokeWidth={2} />
                       </LineChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
                     <ResponsiveContainer width="100%" height={300}>
                       <PieChart>
                         <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
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

             {/* Message if idle and no results (and no error) */}
             {loading === 'idle' && !combinedMetrics && !error && (
                 <p className="no-results-message">Run a backtest to see results.</p>
             )}
              {/* Error message is displayed at the top */}
          </div>
        )}
      </div> {/* end backtest-main */}
    </div> // end dashboard-container
  );
}
