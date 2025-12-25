// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: Stability, API Integration, and UX Improvements

import React from "react";
import LiveTradingChart from "../LiveTradingChart";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";

const DeskLayout = (props) => {
  const {
    formConfig, setFormConfig,
    setups = [],       // Default empty array for saved strategies
    liveWinners = [],  // Default empty array for optimizer results
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, scanningWinners, fetchWinners,
    handleWinnerSelect = () => {}, // Default no-op function
    isRunning, botLoading,
    handleStart, handleStop,
    handleClearLogs,
    botStatus,
    logs = [],         // Default empty array for system logs
    visibleLogs = [],  // Default empty array for visible logs
    chartData,
  } = props;

  const handleWinnerSelectInternal = (e) => {
    const winnerId = e.target.value;
    const selectedWinner = liveWinners.find((w) => w.id === winnerId);

    if (selectedWinner) {
      setFormConfig((prev) => ({
        ...prev,
        symbol: selectedWinner.symbol || "BTC-USD",
        timeframe: selectedWinner.timeframe || "1h",
        strategies: selectedWinner.config?.strategies || [],
        params: selectedWinner.config?.params || {},
        mlMode: selectedWinner.config?.mlMode || "off",
        riskPercentage: selectedWinner.config?.riskPercentage || 1,
      }));
    }
  };

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
                {scanningWinners ? "Fetching..." : "↻"}
              </button>
            </label>
            <select
              value={selectedWinnerId}
              onChange={handleWinnerSelectInternal} // Internal winner selection handler
              disabled={isRunning}
              className="desk-select"
            >
              <option value="">-- Optimizer Results --</option>
              {liveWinners.length > 0 ? (
                liveWinners.map((w) => {
                  const id = w.botId || w.id;
                  const name = w.symbol || w.name || "Unknown";
                  const roi = w.roi ? (w.roi * 100).toFixed(2) : "0";
                  return (
                    <option key={id} value={id}>
                      {name} (ROI: {roi}%)
                    </option>
                  );
                })
              ) : (
                <option disabled>No optimizer results found.</option>
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
            <label style={{ color: "#f87171", fontSize: "0.8rem", letterSpacing: "1px" }}>
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
          <div className="action-area" style={{ marginTop: "15px" }}>
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

        <div className="chart-area" style={{ height: "calc(100vh - 120px)", width: "100%", position: "relative" }}>
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

      {/* Style settings */}
    </div>
  );
};

export default DeskLayout;
