// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v4.1 - Clean Build & Visual Strategy Builder
// 🛠 Fixes: Duplicate imports (Build Error).
// 🛠 Feature: Visual Strategy Cards with Inputs.

import React, { useState } from "react";
import LiveTradingChart from "../LiveTradingChart";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
import "./DeskLayout.css";

// 🛠️ DATA: List of manually selectable strategies
const AVAILABLE_STRATEGIES = [
  { code: "sma_crossover", name: "SMA Crossover", defaultParams: { sma_fast_period: 50, sma_slow_period: 200 } },
  { code: "rsi_divergence", name: "RSI Reversal", defaultParams: { rsi_length: 14, oversold_level: 30, overbought_level: 70 } },
  { code: "bollinger_bands", name: "Bollinger Breakout", defaultParams: { period: 20, dev: 2 } },
  { code: "macd_crossover", name: "MACD Momentum", defaultParams: { macd_fast_period: 12, macd_slow_period: 26, macd_signal_period: 9 } },
  { code: "supertrend", name: "SuperTrend", defaultParams: { period: 10, multiplier: 3 } },
];

const DeskLayout = (props) => {
  const {
    formConfig, setFormConfig,
    setups = [],
    liveWinners = [],
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, scanningWinners, fetchWinners,
    handleWinnerSelect,
    isRunning, botLoading,
    handleStart, handleStop,
    handleClearLogs,
    botStatus,
    logs = [],
    visibleLogs = [],
    chartData,
  } = props;

  // State for the "Add Strategy" dropdown
  const [strategyToAdd, setStrategyToAdd] = useState("");

  // ➕ Action: Manually Add a Strategy
  const handleAddStrategy = () => {
    if (!strategyToAdd) return;
    const template = AVAILABLE_STRATEGIES.find(s => s.code === strategyToAdd);
    
    setFormConfig(prev => ({
      ...prev,
      // Enable combo mode if adding a second strategy
      isCombo: prev.strategies.length >= 1,
      strategies: [
        ...prev.strategies,
        { code: template.code, params: { ...template.defaultParams } }
      ]
    }));
    setStrategyToAdd(""); // Reset dropdown
  };

  // ➖ Action: Remove a Strategy
  const removeStrategy = (index) => {
    setFormConfig(prev => {
      const newStrats = prev.strategies.filter((_, i) => i !== index);
      return { 
        ...prev, 
        strategies: newStrats,
        isCombo: newStrats.length > 1
      };
    });
  };

  // ✏️ Action: Update Parameter
  const updateStrategyParam = (index, paramKey, value) => {
    setFormConfig(prev => {
      const newStrategies = [...prev.strategies];
      newStrategies[index] = {
        ...newStrategies[index],
        params: {
          ...newStrategies[index].params,
          [paramKey]: Number(value)
        }
      };
      return { ...prev, strategies: newStrategies };
    });
  };

  return (
    <div className="desk-layout">
      {/* ---------------- CONFIGURATION SIDEBAR ---------------- */}
      <aside className="desk-sidebar">
        <div className="panel-header">
          <h3>Configuration</h3>
          <span className={`status-badge ${isRunning ? "active" : "idle"}`}>
            {isRunning ? "RUNNING" : "IDLE"}
          </span>
        </div>

        <form onSubmit={handleStart} className="desk-form">
          
          {/* --- SECTION 1: PRESETS (The "Fast Lane") --- */}
          <div className="config-section">
            <h4 className="section-title">⚡ Quick Load</h4>
            <div className="form-group">
              <select
                value={selectedWinnerId}
                onChange={handleWinnerSelect}
                disabled={isRunning}
                className="desk-select highlight-select"
              >
                <option value="">-- Load Best Performer --</option>
                {liveWinners.length > 0 ? (
                  liveWinners.map((w) => {
                    // Support legacy id and new botId
                    const id = w.botId || w.id;
                    const name = w.symbol || w.name || "Unknown";
                    const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                    return <option key={id} value={id}>{name} | ROI: {roi}%</option>;
                  })
                ) : (
                  <option disabled>No files (Click Refresh)</option>
                )}
              </select>
              
              <div className="flex-between" style={{marginTop: '5px'}}>
                <span className="text-xs text-muted">Or load from DB:</span>
                <button 
                  type="button" 
                  onClick={fetchWinners} 
                  disabled={scanningWinners}
                  className="text-btn"
                >
                  {scanningWinners ? "..." : "↻ REFRESH"}
                </button>
              </div>

              <select
                value={selectedSetupId}
                onChange={handleSetupSelect}
                disabled={isRunning}
                className="desk-select"
              >
                <option value="">-- Saved Strategies --</option>
                {(setups || []).map((s) => (
                  <option key={s._id} value={s._id}>{s.name || s.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="divider"></div>

          {/* --- SECTION 2: STRATEGY BUILDER (The "Lego" System) --- */}
          <div className="config-section">
            <div className="flex-between">
              <h4 className="section-title">🧠 Strategy Logic</h4>
              <span className="count-badge">{formConfig.strategies.length} Active</span>
            </div>

            {/* List of Active Cards */}
            <div className="strategies-container">
              {formConfig.strategies.length === 0 && (
                <div className="empty-state">No logic loaded. Add one below.</div>
              )}
              
              {formConfig.strategies.map((strat, idx) => (
                <div key={idx} className="strategy-card">
                  <div className="card-header">
                    <span className="strat-name">{strat.code.replace(/_/g, ' ')}</span>
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeStrategy(idx)}
                      disabled={isRunning}
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-body">
                    {Object.entries(strat.params || {}).map(([k, v]) => (
                      <div key={k} className="mini-input-group">
                        <label title={k}>{k.replace(/_/g, ' ')}</label>
                        <input 
                          type="number" 
                          value={v} 
                          onChange={(e) => updateStrategyParam(idx, k, e.target.value)}
                          disabled={isRunning}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Strategy Controls */}
            {!isRunning && (
              <div className="add-strategy-row">
                <select 
                  value={strategyToAdd} 
                  onChange={(e) => setStrategyToAdd(e.target.value)}
                  className="desk-select small-select"
                >
                  <option value="">+ Add Logic...</option>
                  {AVAILABLE_STRATEGIES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={handleAddStrategy}
                  disabled={!strategyToAdd} 
                  className="icon-btn-add"
                >
                  +
                </button>
              </div>
            )}
          </div>

          <div className="divider"></div>

          {/* --- SECTION 3: MARKET & MONEY --- */}
          <div className="config-section">
            <h4 className="section-title">💰 Capital & Risk</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Symbol</label>
                <input value={formConfig.symbol || ""} disabled className="desk-input" />
              </div>
              <div className="form-group">
                <label>Allocated $</label>
                <input
                  type="number"
                  value={formConfig.capitalAllocation}
                  onChange={(e) => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
                  disabled={isRunning}
                  className="desk-input"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Risk Mode</label>
                <select
                  value={formConfig.riskManagementMode}
                  onChange={(e) => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))}
                  disabled={isRunning}
                  className="desk-select"
                >
                  <option value="static">Static %</option>
                  <option value="dynamic">Dynamic</option>
                </select>
              </div>
              <div className="form-group">
                <label>Risk %</label>
                <input
                  type="number"
                  value={formConfig.riskPercentage}
                  onChange={(e) => setFormConfig(p => ({...p, riskPercentage: e.target.value}))}
                  disabled={isRunning}
                  step="0.1"
                  className="desk-input"
                />
              </div>
            </div>
          </div>

          {/* --- CONTROLS --- */}
          <div className="action-area">
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${formConfig.tradingMode === "paper" ? "active" : ""}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: "paper"}))}
                disabled={isRunning}
              >
                Paper
              </button>
              <button
                type="button"
                className={`toggle-btn ${formConfig.tradingMode === "live" ? "active-danger" : ""}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: "live"}))}
                disabled={isRunning}
              >
                Live
              </button>
            </div>

            {!isRunning ? (
              <button type="submit" className="primary-btn" disabled={botLoading}>
                {botLoading ? "INITIALIZING..." : "🚀 LAUNCH BOT"}
              </button>
            ) : (
              <button type="button" onClick={handleStop} className="danger-btn" disabled={botLoading}>
                🛑 STOP ENGINE
              </button>
            )}
          </div>
        </form>
      </aside>

      {/* ---------------- CENTER & RIGHT COLUMNS (Unchanged) ---------------- */}
      <main className="desk-center">
        <div className="metrics-strip">
          <MetricsDisplay data={botStatus} variant="desk" />
        </div>
        <div className="chart-area" style={{ height: "100%", width: "100%", position: "relative" }}>
          <LiveTradingChart
            candles={chartData?.candleData || []}
            trades={chartData?.tradeBreakdown || []}
            activePositions={botStatus?.positions || []}
          />
        </div>
      </main>

      <aside className="desk-feed">
        <div className="feed-section">
          <div className="panel-header"><h3>Decision Stream</h3></div>
          <div className="stream-container">
            <DecisionStream logs={logs || []} limit={8} />
          </div>
        </div>
        <div className="feed-section logs-section">
          <div className="panel-header">
            <h3>System Logs</h3>
            <button onClick={handleClearLogs} className="text-btn">Clear</button>
          </div>
          <div className="logs-container">
            <LogsPanel logs={visibleLogs || []} />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DeskLayout;
