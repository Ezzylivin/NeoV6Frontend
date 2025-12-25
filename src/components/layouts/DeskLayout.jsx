// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v7.1 - Added Hybrid Logic Dropdown

import React, { useState } from "react";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
import "./DeskLayout.css";

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
    symbolOptions = [],
    timeframeOptions = [],
    modelOptions = [],
  } = props;

  const [strategyToAdd, setStrategyToAdd] = useState("");

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
    setFormConfig(prev => ({
      ...prev,
      strategies: prev.strategies.filter((_, i) => i !== index)
    }));
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

  return (
    <div className="desk-layout">
      {/* ================= LEFT PANEL: MISSION CONTROL ================= */}
      <main className="desk-main">
        <div className="panel-header">
          <h3>🚀 MISSION CONTROL</h3>
          <div className={`status-dot ${isRunning ? 'on' : 'off'}`} />
        </div>

        <form onSubmit={handleStart} className="control-grid">
          
          {/* 1. Strategy Loader */}
          <div className="section-box full-width">
            <label className="group-label">Strategy Source</label>
            <div className="input-split">
              <select value={selectedWinnerId} onChange={handleWinnerSelect} disabled={isRunning} className="desk-select">
                <option value="">-- Load Alpha File --</option>
                {liveWinners.map(w => (
                   <option key={w.botId || w.id} value={w.botId || w.id}>
                     {w.symbol} | ROI: {(w.roi * 100).toFixed(0)}%
                   </option>
                ))}
              </select>
              <button type="button" onClick={fetchWinners} className={`icon-btn ${scanningWinners ? 'spin' : ''}`} disabled={scanningWinners || isRunning} title="Refresh">↻</button>
              <select value={selectedSetupId} onChange={handleSetupSelect} disabled={isRunning} className="desk-select">
                <option value="">-- Load DB Config --</option>
                {setups.map(s => <option key={s._id} value={s._id}>{s.name || s.symbol}</option>)}
              </select>
            </div>
          </div>

          {/* 2. Logic Builder */}
          <div className="section-box full-width">
            <div className="flex-between mb-2">
              <label className="group-label">Active Logic</label>
              <span className="count-tag">{formConfig.strategies.length} Modules</span>
            </div>
            <div className="strategy-deck">
              {formConfig.strategies.length === 0 && <div className="empty-slot">No logic loaded.</div>}
              {formConfig.strategies.map((strat, idx) => (
                <div key={idx} className="logic-card">
                  <div className="logic-header">
                    <span className="logic-name">{strat.code.replace(/_/g, ' ')}</span>
                    <button type="button" onClick={() => removeStrategy(idx)} disabled={isRunning} className="close-btn">×</button>
                  </div>
                  <div className="logic-body">
                    {Object.entries(strat.params || {}).map(([k, v]) => (
                      <div key={k} className="param-row">
                        <span className="param-label">{k.replace(/_/g, ' ')}</span>
                        <input type="number" value={v} onChange={(e) => updateStrategyParam(idx, k, e.target.value)} disabled={isRunning} className="param-input" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

          {/* 3. Market & Risk */}
          <div className="section-box half-width">
            <label className="group-label">Market Settings</label>
            <div className="field-row">
              <div className="field">
                <label>Symbol</label>
                <select value={formConfig.symbol} onChange={e => setFormConfig(p => ({...p, symbol: e.target.value}))} disabled={isRunning} className="desk-select">
                  {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Timeframe</label>
                <select value={formConfig.timeframe} onChange={e => setFormConfig(p => ({...p, timeframe: e.target.value}))} disabled={isRunning} className="desk-select">
                  {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row mt-2">
              <div className="field">
                <label>Capital ($)</label>
                <input type="number" value={formConfig.capitalAllocation} onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))} disabled={isRunning} className="desk-input" />
              </div>
            </div>
          </div>

          <div className="section-box half-width">
            <label className="group-label">Risk Management</label>
            <div className="field-row">
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
            <div className="field-row mt-2">
               <div className="field">
                <label>Max Drawdown %</label>
                <input type="number" value={formConfig.maxDrawdown} onChange={e => setFormConfig(p => ({...p, maxDrawdown: e.target.value}))} disabled={isRunning} className="desk-input" />
              </div>
            </div>
          </div>

          {/* 4. AI & Safety - FIXED */}
          <div className="section-box full-width">
            <label className="group-label">🤖 Neural Engine</label>
            <div className="field-row">
               <div className="field">
                <label>ML Mode</label>
                <select value={formConfig.mlMode} onChange={e => setFormConfig(p => ({...p, mlMode: e.target.value}))} disabled={isRunning} className="desk-select">
                  <option value="off">Off</option>
                  <option value="predictions">Hybrid Filter</option>
                  <option value="on">Pure AI Driver</option>
                </select>
              </div>
              <div className="field">
                <label>Model Architecture</label>
                <select value={formConfig.mlModel} onChange={e => setFormConfig(p => ({...p, mlModel: e.target.value}))} disabled={isRunning} className="desk-select">
                  <option value="">-- None --</option>
                  {modelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Threshold</label>
                <input type="number" step="0.05" value={formConfig.mlThreshold} onChange={e => setFormConfig(p => ({...p, mlThreshold: e.target.value}))} disabled={isRunning} className="desk-input" />
              </div>
            </div>

            {/* ✅ NEW: Hybrid Logic Dropdown (Only shows if ML Mode is Hybrid) */}
            {formConfig.mlMode === 'predictions' && (
                <div className="field-row mt-2">
                    <div className="field">
                        <label style={{color: '#f59e0b'}}>Hybrid Logic</label>
                        <select 
                            value={formConfig.hybridMode || 'AND'} 
                            onChange={e => setFormConfig(p => ({...p, hybridMode: e.target.value}))} 
                            disabled={isRunning} 
                            className="desk-select"
                            style={{borderColor: '#f59e0b'}}
                        >
                            <option value="AND">AND (Strategies + ML Confirm)</option>
                            <option value="OR">OR (Strategies OR ML Signal)</option>
                            <option value="REGIME">Regime (Strategies only if ML Bullish)</option>
                        </select>
                    </div>
                </div>
            )}
          </div>

          {/* 5. Launch Controls */}
          <div className="launch-section full-width">
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
      </main>

      {/* ================= RIGHT PANEL: MONITOR ================= */}
      <aside className="desk-monitor">
        <div className="monitor-header"><MetricsDisplay data={botStatus} variant="desk" /></div>
        <div className="monitor-stream">
          <div className="panel-header"><h3>Decision Engine</h3></div>
          <div className="scroll-area"><DecisionStream logs={logs || []} limit={20} /></div>
        </div>
        <div className="monitor-logs">
          <div className="panel-header"><h3>System Terminal</h3><button onClick={handleClearLogs} className="tiny-btn">CLEAR</button></div>
          <div className="scroll-area terminal-bg"><LogsPanel logs={visibleLogs || []} /></div>
        </div>
      </aside>
    </div>
  );
};

export default DeskLayout;
