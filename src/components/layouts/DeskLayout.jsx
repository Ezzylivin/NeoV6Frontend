// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v6.3 - Pure Command Console (No Chart)

import React, { useState } from "react";
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";
import "./DeskLayout.css";

const AVAILABLE_STRATEGIES = [
  { code: "sma_crossover", name: "SMA Crossover", defaultParams: { fast: 50, slow: 200 } },
  { code: "rsi_divergence", name: "RSI Reversal", defaultParams: { length: 14, level: 30 } },
  { code: "bollinger_bands", name: "Bollinger Breakout", defaultParams: { period: 20, dev: 2 } },
  { code: "macd_crossover", name: "MACD Momentum", defaultParams: { fast: 12, slow: 26, sig: 9 } },
  { code: "supertrend", name: "SuperTrend", defaultParams: { period: 10, mult: 3 } },
];

const DeskLayout = (props) => {
  const {
    formConfig, setFormConfig,
    setups = [], liveWinners = [],
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, handleWinnerSelect,
    fetchWinners, scanningWinners,
    isRunning, botLoading,
    handleStart, handleStop, handleClearLogs,
    botStatus, logs = [], visibleLogs = [],
    
    // Default empty arrays to prevent crashes if parent fails to pass
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
      {/* --- LEFT: ACTIVE LOGIC --- */}
      <aside className="desk-sidebar">
        <div className="panel-header"><h3>Active Logic</h3></div>
        <div className="strategy-deck">
          {formConfig.strategies.length === 0 ? (
            <div className="empty-slot">No logic loaded. Select file in Mission Control.</div>
          ) : (
            formConfig.strategies.map((strat, idx) => (
              <div key={idx} className="logic-card">
                <div className="logic-header">
                  <span className="logic-name">{strat.code}</span>
                  <button onClick={() => removeStrategy(idx)} disabled={isRunning} className="close-btn">×</button>
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
            ))
          )}
        </div>
        
        {!isRunning && (
          <div className="add-logic-bar">
            <select value={strategyToAdd} onChange={(e) => setStrategyToAdd(e.target.value)} className="desk-select small">
              <option value="">+ Add Module...</option>
              {AVAILABLE_STRATEGIES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <button onClick={handleAddStrategy} disabled={!strategyToAdd} className="add-btn">+</button>
          </div>
        )}
      </aside>

      {/* --- CENTER: MISSION CONTROL (No Chart, No Tables) --- */}
      <main className="desk-center">
        
        {/* Top: Metrics */}
        <div className="metrics-bar">
          <MetricsDisplay data={botStatus} variant="desk" />
        </div>

        {/* Middle: Controls */}
        <div className="mission-control">
          <div className="panel-header-simple"><h3>🚀 Mission Control</h3></div>
          
          <div className="control-grid">
            {/* Strategy Selectors */}
            <div className="control-group full-width">
              <label className="group-label">Strategy Source</label>
              <div className="input-split">
                <select value={selectedWinnerId} onChange={handleWinnerSelect} disabled={isRunning} className="desk-select">
                  <option value="">-- Load Alpha File --</option>
                  {liveWinners.map(w => {
                     const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                     return <option key={w.botId || w.id} value={w.botId || w.id}>{w.symbol} | {roi}% ROI</option>
                  })}
                </select>
                <select value={selectedSetupId} onChange={handleSetupSelect} disabled={isRunning} className="desk-select">
                  <option value="">-- DB Strategy --</option>
                  {setups.map(s => <option key={s._id} value={s._id}>{s.name || s.symbol}</option>)}
                </select>
                <button type="button" onClick={fetchWinners} className={`icon-btn ${scanningWinners ? 'spin' : ''}`} disabled={scanningWinners || isRunning} title="Refresh">↻</button>
              </div>
            </div>

            {/* Inputs */}
            <div className="control-group">
                <label>Symbol</label>
                <select value={formConfig.symbol} onChange={e => setFormConfig(p=>({...p, symbol: e.target.value}))} disabled={isRunning} className="desk-select">
                    {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="control-group">
                <label>Timeframe</label>
                <select value={formConfig.timeframe} onChange={e => setFormConfig(p=>({...p, timeframe: e.target.value}))} disabled={isRunning} className="desk-select">
                    {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="control-group">
                <label>Capital ($)</label>
                <input type="number" value={formConfig.capitalAllocation} onChange={e => setFormConfig(p=>({...p, capitalAllocation: e.target.value}))} disabled={isRunning} className="desk-input" />
            </div>
            <div className="control-group">
                <label>Risk %</label>
                <input type="number" value={formConfig.riskPercentage} onChange={e => setFormConfig(p=>({...p, riskPercentage: e.target.value}))} disabled={isRunning} className="desk-input" />
            </div>
            <div className="control-group">
                <label>ML Mode</label>
                <select value={formConfig.mlMode} onChange={e => setFormConfig(p=>({...p, mlMode: e.target.value}))} disabled={isRunning} className="desk-select">
                    <option value="off">Off</option>
                    <option value="predictions">Hybrid</option>
                    <option value="on">Pure ML</option>
                </select>
            </div>
            <div className="control-group">
                <label>ML Model</label>
                <select value={formConfig.mlModel} onChange={e => setFormConfig(p=>({...p, mlModel: e.target.value}))} disabled={isRunning} className="desk-select">
                    <option value="">-- None --</option>
                    {modelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>

            {/* Buttons */}
            <div className="control-actions">
               <div className="mode-switch mb-2">
                  <button type="button" className={formConfig.tradingMode === 'paper' ? 'active' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))} disabled={isRunning}>PAPER</button>
                  <button type="button" className={formConfig.tradingMode === 'live' ? 'active-live' : ''} onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))} disabled={isRunning}>LIVE</button>
               </div>
                {!isRunning ? (
                    <button onClick={handleStart} className="main-btn start" disabled={botLoading}>{botLoading ? "INITIALIZING..." : "INITIATE SEQUENCE"}</button>
                ) : (
                    <button onClick={handleStop} className="main-btn stop" disabled={botLoading}>TERMINATE</button>
                )}
            </div>
          </div>
        </div>
      </main>

      {/* --- RIGHT: INTELLIGENCE --- */}
      <aside className="desk-feed">
        <div className="feed-panel h-40">
          <div className="panel-header"><h3>Decision Engine</h3></div>
          <div className="scroll-area"><DecisionStream logs={logs || []} limit={8} /></div>
        </div>
        <div className="feed-panel flex-grow">
          <div className="panel-header"><h3>System Terminal</h3><button onClick={handleClearLogs} className="tiny-btn">CLEAR</button></div>
          <div className="scroll-area terminal-bg"><LogsPanel logs={visibleLogs || []} /></div>
        </div>
      </aside>
    </div>
  );
};

export default DeskLayout;
