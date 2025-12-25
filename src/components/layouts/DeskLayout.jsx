// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v5.0 - "Command Center" Layout (No Chart, Data Focused)

import React, { useState } from "react";
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
    // chartData, // ❌ Removing Chart Data dependency
  } = props;

  const [strategyToAdd, setStrategyToAdd] = useState("");

  // --- Strategy Builder Helpers ---
  const handleAddStrategy = () => {
    if (!strategyToAdd) return;
    const template = AVAILABLE_STRATEGIES.find(s => s.code === strategyToAdd);
    
    setFormConfig(prev => ({
      ...prev,
      isCombo: prev.strategies.length >= 1,
      strategies: [
        ...prev.strategies,
        { code: template.code, params: { ...template.defaultParams } }
      ]
    }));
    setStrategyToAdd("");
  };

  const removeStrategy = (index) => {
    setFormConfig(prev => {
      const newStrats = prev.strategies.filter((_, i) => i !== index);
      return { ...prev, strategies: newStrats, isCombo: newStrats.length > 1 };
    });
  };

  const updateStrategyParam = (index, paramKey, value) => {
    setFormConfig(prev => {
      const newStrategies = [...prev.strategies];
      newStrategies[index] = {
        ...newStrategies[index],
        params: { ...newStrategies[index].params, [paramKey]: Number(value) }
      };
      return { ...prev, strategies: newStrategies };
    });
  };

  // --- Render Helpers ---
  const activePositions = botStatus?.positions || [];
  const recentTrades = (botStatus?.trades || []).slice().reverse().slice(0, 10); // Last 10 trades

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
          {/* Strategy Loading Section */}
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
              
              <div className="flex-between" style={{marginTop: '5px'}}>
                <span className="text-xs text-muted">Or DB:</span>
                <button type="button" onClick={fetchWinners} disabled={scanningWinners} className="text-btn">
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

          {/* Strategy Builder Section */}
          <div className="config-section">
            <div className="flex-between">
              <h4 className="section-title">🧠 Strategy Logic</h4>
              <span className="count-badge">{formConfig.strategies.length} Active</span>
            </div>

            <div className="strategies-container">
              {formConfig.strategies.length === 0 && (
                <div className="empty-state">No logic loaded. Add one below.</div>
              )}
              
              {formConfig.strategies.map((strat, idx) => (
                <div key={idx} className="strategy-card">
                  <div className="card-header">
                    <span className="strat-name">{strat.code.replace(/_/g, ' ')}</span>
                    <button type="button" className="remove-btn" onClick={() => removeStrategy(idx)} disabled={isRunning}>×</button>
                  </div>
                  <div className="card-body">
                    {Object.entries(strat.params || {}).map(([k, v]) => (
                      <div key={k} className="mini-input-group">
                        <label title={k}>{k.replace(/_/g, ' ')}</label>
                        <input type="number" value={v} onChange={(e) => updateStrategyParam(idx, k, e.target.value)} disabled={isRunning} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!isRunning && (
              <div className="add-strategy-row">
                <select value={strategyToAdd} onChange={(e) => setStrategyToAdd(e.target.value)} className="desk-select small-select">
                  <option value="">+ Add Logic...</option>
                  {AVAILABLE_STRATEGIES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
                <button type="button" onClick={handleAddStrategy} disabled={!strategyToAdd} className="icon-btn-add">+</button>
              </div>
            )}
          </div>

          <div className="divider"></div>

          {/* Capital & Risk Section */}
          <div className="config-section">
            <h4 className="section-title">💰 Capital & Risk</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Symbol</label>
                <input value={formConfig.symbol || ""} disabled className="desk-input" />
              </div>
              <div className="form-group">
                <label>Allocated $</label>
                <input type="number" value={formConfig.capitalAllocation} onChange={(e) => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))} disabled={isRunning} className="desk-input" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Risk Mode</label>
                <select value={formConfig.riskManagementMode} onChange={(e) => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))} disabled={isRunning} className="desk-select">
                  <option value="static">Static %</option>
                  <option value="dynamic">Dynamic</option>
                </select>
              </div>
              <div className="form-group">
                <label>Risk %</label>
                <input type="number" value={formConfig.riskPercentage} onChange={(e) => setFormConfig(p => ({...p, riskPercentage: e.target.value}))} disabled={isRunning} step="0.1" className="desk-input" />
              </div>
            </div>
          </div>

          {/* Controls */}
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

      {/* ---------------- CENTER COLUMN: DATA DECK (Replaces Chart) ---------------- */}
      <main className="desk-center">
        {/* Top Metrics Strip */}
        <div className="metrics-strip">
          <MetricsDisplay data={botStatus} variant="desk" />
        </div>

        {/* DATA DECK: Positions & History */}
        <div className="data-deck">
          
          {/* Active Positions Panel */}
          <div className="deck-panel">
            <div className="panel-header-simple">
              <h4>📡 Active Positions</h4>
              <span className="badge-count">{activePositions.length}</span>
            </div>
            <div className="table-container">
              <table className="desk-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>Size</th>
                    <th>PnL (Unrealized)</th>
                  </tr>
                </thead>
                <tbody>
                  {activePositions.length > 0 ? activePositions.map((pos, i) => (
                    <tr key={i}>
                      <td className="highlight-text">{pos.symbol || formConfig.symbol}</td>
                      <td className={pos.side === 'long' ? 'text-green' : 'text-red'}>{pos.side?.toUpperCase()}</td>
                      <td>${pos.entryPrice?.toFixed(2)}</td>
                      <td>{pos.size}</td>
                      <td className={pos.unrealizedPnL >= 0 ? 'text-green' : 'text-red'}>
                        {pos.unrealizedPnL > 0 ? '+' : ''}{pos.unrealizedPnL?.toFixed(2)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="empty-cell">No active positions. Scanning market...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Trade History */}
          <div className="deck-panel">
            <div className="panel-header-simple">
              <h4>📜 Execution History</h4>
              <span className="badge-count">{recentTrades.length}</span>
            </div>
            <div className="table-container">
              <table className="desk-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Realized PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.length > 0 ? recentTrades.map((trade, i) => (
                    <tr key={i}>
                      <td className="text-muted">{new Date(trade.exitTime || trade.entryTime).toLocaleTimeString()}</td>
                      <td>{trade.side?.toUpperCase()} {trade.profit !== undefined ? 'CLOSE' : 'OPEN'}</td>
                      <td>${(trade.exitPrice || trade.entryPrice)?.toFixed(2)}</td>
                      <td className={trade.profit >= 0 ? 'text-green font-bold' : 'text-red font-bold'}>
                        {trade.profit !== undefined ? `$${trade.profit.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="empty-cell">No trades executed in this session.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* ---------------- RIGHT COLUMN: INTELLIGENCE ---------------- */}
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
