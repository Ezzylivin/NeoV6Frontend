// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: Fixed Selection Issue & Applied 2027 Theme

import React from "react";
import LiveTradingChart from "../LiveTradingChart";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
// Import the Emerald/Black Theme
import "./DeskLayout.css";// File: src/components/layouts/DeskLayout.jsx
import React, { useState } from "react";
import LiveTradingChart from "../LiveTradingChart";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
import "./DeskLayout.css";

// 🛠️ DATA: List of manually selectable strategies
const AVAILABLE_STRATEGIES = [
  { code: "sma_crossover", name: "SMA Crossover", defaultParams: { fast: 50, slow: 200 } },
  { code: "rsi_divergence", name: "RSI Reversal", defaultParams: { length: 14, threshold: 30 } },
  { code: "bollinger_bands", name: "Bollinger Breakout", defaultParams: { period: 20, dev: 2 } },
  { code: "macd_cross", name: "MACD Momentum", defaultParams: { fast: 12, slow: 26, signal: 9 } },
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
                {liveWinners.map((w) => {
                  const id = w.botId || w.id;
                  const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                  return <option key={id} value={id}>{w.symbol} | ROI: {roi}%</option>;
                })}
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
                        <label>{k.replace(/_/g, ' ')}</label>
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
                <input value={formConfig.symbol} disabled className="desk-input" />
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

      {/* --- CENTER & RIGHT COLUMNS (Unchanged) --- */}
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

const DeskLayout = (props) => {
  const {
    formConfig, setFormConfig,
    setups = [],
    liveWinners = [],
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, scanningWinners, fetchWinners,
    handleWinnerSelect, // <--- We will use this directly
    isRunning, botLoading,
    handleStart, handleStop,
    handleClearLogs,
    botStatus,
    logs = [],
    visibleLogs = [],
    chartData,
  } = props;

  return (
    <div className="desk-layout">
      {/* ---------------- LEFT COLUMN: COMMAND & CONTROL ---------------- */}
      <aside className="desk-sidebar">
        <div className="panel-header">
          <h3>Configuration</h3>
          <span className={`status-badge ${isRunning ? "active" : "idle"}`}>
            {isRunning ? "RUNNING" : "IDLE"}
          </span>
        </div>

        <form onSubmit={handleStart} className="desk-form">
          {/* 1. Strategy Source */}
          <div className="form-group">
            <label>Load Strategy (DB)</label>
            <select
              value={selectedSetupId}
              onChange={handleSetupSelect}
              disabled={isRunning}
              className="desk-select"
            >
              <option value="">-- Saved Strategies --</option>
              {(setups || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name || s.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="flex-between">
              Load Alpha (File)
              <button
                type="button"
                onClick={fetchWinners}
                disabled={scanningWinners}
                className="text-btn"
              >
                {scanningWinners ? "..." : "↻ REFRESH"}
              </button>
            </label>
            <select
              value={selectedWinnerId}
              onChange={handleWinnerSelect} /* ✅ FIX: Use parent handler directly */
              disabled={isRunning}
              className="desk-select"
            >
              <option value="">-- Optimizer Results --</option>
              {liveWinners.length > 0 ? (
                liveWinners.map((w) => {
                  // ✅ FIX: Support both new 'botId' and legacy 'id'
                  const id = w.botId || w.id;
                  const name = w.symbol || w.name || "Unknown";
                  const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                  return (
                    <option key={id} value={id}>
                      {name} (ROI: {roi}%)
                    </option>
                  );
                })
              ) : (
                <option disabled>No results found (Click Refresh)</option>
              )}
            </select>
          </div>

          <div className="divider"></div>

          {/* 2. Asset & Capital */}
          <div className="form-row">
            <div className="form-group">
              <label>Symbol</label>
              <input value={formConfig.symbol || ""} disabled className="desk-input" />
            </div>
            <div className="form-group">
              <label>Timeframe</label>
              <input value={formConfig.timeframe || ""} disabled className="desk-input" />
            </div>
          </div>

          <div className="form-group">
            <label>Capital Allocation ($)</label>
            <input
              type="number"
              value={formConfig.capitalAllocation}
              onChange={(e) =>
                setFormConfig((p) => ({
                  ...p,
                  capitalAllocation: e.target.value,
                }))
              }
              disabled={isRunning}
              className="desk-input"
            />
          </div>

          <div className="divider"></div>

          {/* 3. Risk Management */}
          <div className="form-group">
            <label>Risk Mode</label>
            <select
              value={formConfig.riskManagementMode}
              onChange={(e) =>
                setFormConfig((p) => ({
                  ...p,
                  riskManagementMode: e.target.value,
                }))
              }
              disabled={isRunning}
              className="desk-select"
            >
              <option value="static">Static % (Aggressive)</option>
              <option value="dynamic">Dynamic (Safe)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Risk %</label>
              <input
                type="number"
                value={formConfig.riskPercentage}
                onChange={(e) =>
                  setFormConfig((p) => ({
                    ...p,
                    riskPercentage: e.target.value,
                  }))
                }
                disabled={isRunning}
                step="0.1"
                className="desk-input"
              />
            </div>
            {formConfig.riskManagementMode === "dynamic" && (
              <div className="form-group">
                <label>Growth Tgt</label>
                <input
                  type="number"
                  value={formConfig.growthCapitalTarget}
                  onChange={(e) =>
                    setFormConfig((p) => ({
                      ...p,
                      growthCapitalTarget: e.target.value,
                    }))
                  }
                  disabled={isRunning}
                  className="desk-input"
                />
              </div>
            )}
          </div>

          {/* 4. Safety Limits */}
          <div className="divider"></div>
          <div className="form-group">
            <label style={{ color: "#f87171", fontSize: "0.7rem", letterSpacing: "1px" }}>
              🛡️ Safety Protocols
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Loss %</label>
              <input
                type="number"
                value={formConfig.maxDailyLoss}
                onChange={(e) =>
                  setFormConfig((p) => ({
                    ...p,
                    maxDailyLoss: e.target.value,
                  }))
                }
                disabled={isRunning}
                className="desk-input"
              />
            </div>
            <div className="form-group">
              <label>Max DD %</label>
              <input
                type="number"
                value={formConfig.maxDrawdown}
                onChange={(e) =>
                  setFormConfig((p) => ({
                    ...p,
                    maxDrawdown: e.target.value,
                  }))
                }
                disabled={isRunning}
                className="desk-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Max Trades / Day</label>
            <input
              type="number"
              value={formConfig.maxTradesPerDay}
              onChange={(e) =>
                setFormConfig((p) => ({
                  ...p,
                  maxTradesPerDay: e.target.value,
                }))
              }
              disabled={isRunning}
              className="desk-input"
            />
          </div>

          {/* 5. Actions */}
          <div className="action-area">
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${formConfig.tradingMode === "paper" ? "active" : ""}`}
                onClick={() =>
                  setFormConfig((p) => ({
                    ...p,
                    tradingMode: "paper",
                  }))
                }
                disabled={isRunning}
              >
                Paper
              </button>
              <button
                type="button"
                className={`toggle-btn ${formConfig.tradingMode === "live" ? "active-danger" : ""}`}
                onClick={() =>
                  setFormConfig((p) => ({
                    ...p,
                    tradingMode: "live",
                  }))
                }
                disabled={isRunning}
              >
                Live
              </button>
            </div>

            {!isRunning ? (
              <button type="submit" className="primary-btn" disabled={botLoading}>
                {botLoading ? "Initializing..." : "Start Strategy"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="danger-btn"
                disabled={botLoading}
              >
                Stop Bot
              </button>
            )}
          </div>
        </form>
      </aside>

      {/* ---------------- CENTER COLUMN: MARKET & METRICS ---------------- */}
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

      {/* ---------------- RIGHT COLUMN: INTELLIGENCE ---------------- */}
      <aside className="desk-feed">
        <div className="feed-section">
          <div className="panel-header">
            <h3>Decision Stream</h3>
          </div>
          <div className="stream-container">
            <DecisionStream logs={logs || []} limit={8} />
          </div>
        </div>

        <div className="feed-section logs-section">
          <div className="panel-header">
            <h3>System Logs</h3>
            <button onClick={handleClearLogs} className="text-btn">
              Clear
            </button>
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
