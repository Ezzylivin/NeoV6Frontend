// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v4.0 - Dynamic Strategy Configuration Panel
// 🛠 Feature: Shows editable cards for each strategy in the list.

import React from "react";
import LiveTradingChart from "../LiveTradingChart";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
import "./DeskLayout.css";

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

  // 🛠 NEW: Helper to update a specific strategy parameter
  const updateStrategyParam = (index, paramKey, value) => {
    setFormConfig(prev => {
      const newStrategies = [...prev.strategies];
      newStrategies[index] = {
        ...newStrategies[index],
        params: {
          ...newStrategies[index].params,
          [paramKey]: Number(value) // Ensure numbers stay numbers
        }
      };
      return { ...prev, strategies: newStrategies };
    });
  };

  return (
    <div className="desk-layout">
      {/* ---------------- LEFT COLUMN: CONFIGURATION ---------------- */}
      <aside className="desk-sidebar">
        <div className="panel-header">
          <h3>Configuration</h3>
          <span className={`status-badge ${isRunning ? "active" : "idle"}`}>
            {isRunning ? "RUNNING" : "IDLE"}
          </span>
        </div>

        <form onSubmit={handleStart} className="desk-form">
          {/* 1. Loaders (Dropdowns) */}
          <div className="form-group">
            <label>Load Strategy (DB)</label>
            <select
              value={selectedSetupId}
              onChange={handleSetupSelect}
              disabled={isRunning}
              className="desk-select"
            >
              <option value="">-- Select Saved --</option>
              {(setups || []).map((s) => (
                <option key={s._id} value={s._id}>{s.name || s.symbol}</option>
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
              onChange={handleWinnerSelect}
              disabled={isRunning}
              className="desk-select"
            >
              <option value="">-- Browse Alpha --</option>
              {liveWinners.map((w) => {
                const id = w.botId || w.id;
                const name = w.symbol || w.name || "Unknown";
                const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                return (
                  <option key={id} value={id}>
                    {name} (ROI: {roi}%)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="divider"></div>

          {/* 2. DYNAMIC STRATEGY BOXES (NEW FEATURE) */}
          {formConfig.strategies && formConfig.strategies.length > 0 ? (
            <div className="strategies-container">
              <label style={{ color: '#10b981', marginBottom: '8px', display: 'block' }}>
                Active Logic ({formConfig.strategies.length})
              </label>
              
              {formConfig.strategies.map((strat, idx) => (
                <div key={idx} className="strategy-card">
                  <div className="strategy-header">
                    <span className="strategy-name">{strat.code}</span>
                    <span className="strategy-index">#{idx + 1}</span>
                  </div>
                  
                  <div className="strategy-params-grid">
                    {Object.entries(strat.params || {}).map(([key, val]) => (
                      <div key={key} className="param-field">
                        <label title={key}>{key.replace(/_/g, ' ')}</label>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateStrategyParam(idx, key, e.target.value)}
                          disabled={isRunning}
                          className="param-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No strategies loaded. Select a file or DB entry above.
            </div>
          )}

          <div className="divider"></div>

          {/* 3. Global Settings */}
          <div className="form-row">
            <div className="form-group">
              <label>Capital ($)</label>
              <input
                type="number"
                value={formConfig.capitalAllocation}
                onChange={(e) => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
                disabled={isRunning}
                className="desk-input"
              />
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

          {/* 4. Controls */}
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
