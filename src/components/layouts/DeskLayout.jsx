// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v5.0 - Command Center (Data-First UI)

import React, { useState } from "react";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
import "./DeskLayout.css";

// 🛠️ DATA: List of selectable strategies
const AVAILABLE_STRATEGIES = [
  { code: "sma_crossover", name: "SMA Crossover", defaultParams: { fast: 50, slow: 200 } },
  { code: "rsi_divergence", name: "RSI Reversal", defaultParams: { length: 14, level: 30 } },
  { code: "bollinger_bands", name: "Bollinger Breakout", defaultParams: { period: 20, dev: 2 } },
  { code: "macd_cross", name: "MACD Momentum", defaultParams: { fast: 12, slow: 26, sig: 9 } },
  { code: "supertrend", name: "SuperTrend", defaultParams: { period: 10, mult: 3 } },
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
  } = props;

  const [strategyToAdd, setStrategyToAdd] = useState("");

  // --- Strategy Logic ---
  const handleAddStrategy = () => {
    if (!strategyToAdd) return;
    const template = AVAILABLE_STRATEGIES.find(s => s.code === strategyToAdd);
    setFormConfig(prev => ({
      ...prev,
      isCombo: prev.strategies.length >= 1,
      strategies: [...prev.strategies, { code: template.code, params: { ...template.defaultParams } }]
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

  // --- Data Helpers ---
  const activePositions = botStatus?.positions || [];
  const recentTrades = (botStatus?.trades || []).slice().reverse().slice(0, 15);

  return (
    <div className="desk-layout">
      {/* ================= LEFT: CONFIGURATION DECK ================= */}
      <aside className="desk-sidebar">
        <div className="panel-header">
          <h3>SYSTEM CONFIGURATION</h3>
          <div className={`status-dot ${isRunning ? 'on' : 'off'}`} />
        </div>

        <form onSubmit={handleStart} className="desk-form">
          
          {/* 1. Quick Load */}
          <div className="control-group">
            <label className="group-label">⚡ Strategy Loader</label>
            <div className="input-split">
              <select value={selectedWinnerId} onChange={handleWinnerSelect} disabled={isRunning} className="desk-select">
                <option value="">-- Load Alpha File --</option>
                {liveWinners.map(w => {
                   const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                   return <option key={w.botId || w.id} value={w.botId || w.id}>{w.symbol} | {roi}% ROI</option>
                })}
              </select>
              <button type="button" onClick={fetchWinners} className="icon-btn" title="Refresh">↻</button>
            </div>
            
            <div className="input-split mt-2">
               <select value={selectedSetupId} onChange={handleSetupSelect} disabled={isRunning} className="desk-select">
                <option value="">-- Saved DB Configs --</option>
                {setups.map(s => <option key={s._id} value={s._id}>{s.name || s.symbol}</option>)}
              </select>
            </div>
          </div>

          <div className="divider"></div>

          {/* 2. Logic Builder (Visual Cards) */}
          <div className="control-group">
            <div className="flex-between mb-2">
              <label className="group-label">🧠 Logic Modules</label>
              <span className="count-tag">{formConfig.strategies.length} Active</span>
            </div>

            <div className="strategy-deck">
              {formConfig.strategies.map((strat, idx) => (
                <div key={idx} className="logic-card">
                  <div className="logic-header">
                    <span className="logic-name">{strat.code}</span>
                    <button type="button" onClick={() => removeStrategy(idx)} disabled={isRunning} className="close-btn">×</button>
                  </div>
                  <div className="logic-body">
                    {Object.entries(strat.params || {}).map(([k, v]) => (
                      <div key={k} className="param-row">
                        <span className="param-label">{k}</span>
                        <input 
                          type="number" 
                          value={v} 
                          onChange={(e) => updateStrategyParam(idx, k, e.target.value)} 
                          disabled={isRunning}
                          className="param-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {formConfig.strategies.length === 0 && (
                <div className="empty-slot">No logic modules loaded.</div>
              )}
            </div>

            {!isRunning && (
              <div className="add-logic-bar">
                <select value={strategyToAdd} onChange={(e) => setStrategyToAdd(e.target.value)} className="desk-select small">
                  <option value="">+ Add Module...</option>
                  {AVAILABLE_STRATEGIES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
                <button type="button" onClick={handleAddStrategy} disabled={!strategyToAdd} className="add-btn">+</button>
              </div>
            )}
          </div>

          <div className="divider"></div>

          {/* 3. Global Settings */}
          <div className="control-group">
            <label className="group-label">💰 Risk Parameters</label>
            <div className="grid-2">
              <div className="field">
                <label>Asset</label>
                <input value={formConfig.symbol} disabled className="desk-input" />
              </div>
              <div className="field">
                <label>Capital</label>
                <input type="number" value={formConfig.capitalAllocation} onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))} disabled={isRunning} className="desk-input" />
              </div>
              <div className="field">
                <label>Mode</label>
                <select value={formConfig.riskManagementMode} onChange={e => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))} disabled={isRunning} className="desk-select">
                  <option value="static">Static</option>
                  <option value="dynamic">Dynamic</option>
                </select>
              </div>
              <div className="field">
                <label>Risk %</label>
                <input type="number" value={formConfig.riskPercentage} onChange={e => setFormConfig(p => ({...p, riskPercentage: e.target.value}))} disabled={isRunning} className="desk-input" />
              </div>
            </div>
          </div>

          {/* 4. Main Controls */}
          <div className="launch-pad">
            <div className="mode-switch">
              <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))} disabled={isRunning}>PAPER</button>
              <button type="button" className={formConfig.tradingMode === 'live' ? 'active-live' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))} disabled={isRunning}>LIVE</button>
            </div>
            
            {!isRunning ? (
              <button type="submit" className="main-btn start" disabled={botLoading}>
                {botLoading ? "INITIALIZING..." : "INITIATE SEQUENCE"}
              </button>
            ) : (
              <button type="button" onClick={handleStop} className="main-btn stop" disabled={botLoading}>
                TERMINATE
              </button>
            )}
          </div>
        </form>
      </aside>

      {/* ================= CENTER: DATA DECK (No Chart) ================= */}
      <main className="desk-center">
        <div className="metrics-bar">
          <MetricsDisplay data={botStatus} variant="desk" />
        </div>

        <div className="data-deck">
          {/* Active Positions Table */}
          <div className="data-panel">
            <div className="panel-header-simple">
              <h4>📡 Live Positions</h4>
              <span className="badge">{activePositions.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Entry Price</th>
                    <th>Size</th>
                    <th>Value</th>
                    <th>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {activePositions.length > 0 ? activePositions.map((pos, i) => (
                    <tr key={i}>
                      <td className="bright">{pos.symbol}</td>
                      <td className={pos.side === 'long' ? 'green' : 'red'}>{pos.side.toUpperCase()}</td>
                      <td>{pos.entryPrice?.toFixed(2)}</td>
                      <td>{pos.size}</td>
                      <td>${(pos.entryPrice * pos.size).toFixed(2)}</td>
                      <td className={pos.unrealizedPnL >= 0 ? 'green' : 'red'}>
                        {pos.unrealizedPnL > 0 ? '+' : ''}{pos.unrealizedPnL?.toFixed(2)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="empty">No active positions. Scanning market...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade History Table */}
          <div className="data-panel">
            <div className="panel-header-simple">
              <h4>📜 Trade Ledger</h4>
              <span className="badge">{recentTrades.length}</span>
            </div>
            <div className="table-wrapper">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.length > 0 ? recentTrades.map((t, i) => (
                    <tr key={i}>
                      <td className="dim">{new Date(t.exitTime || t.entryTime).toLocaleTimeString()}</td>
                      <td>{t.side.toUpperCase()} {t.profit ? 'CLOSE' : 'OPEN'}</td>
                      <td>${(t.exitPrice || t.entryPrice).toFixed(2)}</td>
                      <td className={t.profit >= 0 ? 'green' : 'red'}>
                        {t.profit ? `$${t.profit.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="empty">No trade history for this session.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ================= RIGHT: LOGS & INTEL ================= */}
      <aside className="desk-feed">
        <div className="feed-panel h-40">
          <div className="panel-header"><h3>Decision Engine</h3></div>
          <div className="scroll-area">
            <DecisionStream logs={logs || []} limit={8} />
          </div>
        </div>
        <div className="feed-panel flex-grow">
          <div className="panel-header">
            <h3>System Terminal</h3>
            <button onClick={handleClearLogs} className="tiny-btn">CLEAR</button>
          </div>
          <div className="scroll-area terminal-bg">
            <LogsPanel logs={visibleLogs || []} />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DeskLayout;
