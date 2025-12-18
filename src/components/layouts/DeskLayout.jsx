// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v2.1 - Import Path Fix
// 🛠 Fixes: "Module not found" for SharedComponents

import React from "react";
import LiveTradingChart from "../LiveTradingChart"; 

// 🚀 FIX: Point to the correct location of SharedComponents
// Assuming SharedComponents.jsx is in src/pages/ (2 levels up from src/components/layouts/)
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";

const DeskLayout = (props) => {
  const {
    // State from parent
    formConfig, setFormConfig,
    setups, liveWinners,
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, handleWinnerSelect,
    scanningWinners, fetchWinners,
    isRunning, botLoading,
    handleStart, handleStop,
    handleClearLogs,
    botStatus,
    logs, visibleLogs,
    chartData 
  } = props;

  return (
    <div className="desk-layout">
      {/* ---------------- LEFT COLUMN: COMMAND & CONTROL ---------------- */}
      <aside className="desk-sidebar">
        <div className="panel-header">
          <h3>Configuration</h3>
          <span className={`status-badge ${isRunning ? 'active' : 'idle'}`}>
            {isRunning ? 'RUNNING' : 'IDLE'}
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
              {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
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
                {scanningWinners ? '...' : '↻'}
              </button>
            </label>
            <select 
              value={selectedWinnerId} 
              onChange={handleWinnerSelect} 
              disabled={isRunning}
              className="desk-select"
            >
              <option value="">-- Optimizer Results --</option>
              {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="divider"></div>

          {/* 2. Asset & Capital */}
          <div className="form-row">
            <div className="form-group">
              <label>Symbol</label>
              <input value={formConfig.symbol} disabled className="desk-input" />
            </div>
            <div className="form-group">
              <label>Timeframe</label>
              <input value={formConfig.timeframe} disabled className="desk-input" />
            </div>
          </div>

          <div className="form-group">
            <label>Capital Allocation ($)</label>
            <input 
              type="number" 
              value={formConfig.capitalAllocation} 
              onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
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
              onChange={e => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))}
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
                onChange={e => setFormConfig(p => ({...p, riskPercentage: e.target.value}))}
                disabled={isRunning}
                step="0.1"
                className="desk-input"
              />
            </div>
            {formConfig.riskManagementMode === 'dynamic' && (
              <div className="form-group">
                <label>Growth Tgt</label>
                <input 
                  type="number" 
                  value={formConfig.growthCapitalTarget} 
                  onChange={e => setFormConfig(p => ({...p, growthCapitalTarget: e.target.value}))}
                  disabled={isRunning}
                  className="desk-input"
                />
              </div>
            )}
          </div>

          {/* 4. Actions */}
          <div className="action-area">
            <div className="toggle-row">
              <button 
                type="button" 
                className={`toggle-btn ${formConfig.tradingMode === 'paper' ? 'active' : ''}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}
                disabled={isRunning}
              >
                Paper
              </button>
              <button 
                type="button" 
                className={`toggle-btn ${formConfig.tradingMode === 'live' ? 'active-danger' : ''}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}
                disabled={isRunning}
              >
                Live
              </button>
            </div>

            {!isRunning ? (
              <button type="submit" className="primary-btn" disabled={botLoading}>
                {botLoading ? 'Initializing...' : 'Start Strategy'}
              </button>
            ) : (
              <button type="button" onClick={handleStop} className="danger-btn" disabled={botLoading}>
                Stop Bot
              </button>
            )}
          </div>
        </form>
      </aside>

      {/* ---------------- CENTER COLUMN: MARKET & METRICS ---------------- */}
      <main className="desk-center">
        {/* Top Metrics Strip */}
        <div className="metrics-strip">
          <MetricsDisplay data={botStatus} variant="desk" />
        </div>

        {/* Main Chart Area */}
        <div className="chart-area" style={{ height: 'calc(100vh - 120px)', width: '100%', position: 'relative' }}>
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
            <DecisionStream logs={logs} limit={8} />
          </div>
        </div>

        <div className="feed-section logs-section">
          <div className="panel-header">
            <h3>System Logs</h3>
            <button onClick={handleClearLogs} className="text-btn">Clear</button>
          </div>
          <div className="logs-container">
            <LogsPanel logs={visibleLogs} />
          </div>
        </div>
      </aside>

      {/* --- INLINE STYLES FOR LAYOUT --- */}
      <style>{`
        .desk-layout {
          display: grid;
          grid-template-columns: 300px 1fr 320px;
          grid-template-rows: 100vh;
          overflow: hidden;
          background-color: var(--bg-app);
          color: var(--text-primary);
          font-family: var(--font-main);
        }

        .desk-sidebar, .desk-feed {
          background-color: var(--bg-panel);
          border-right: 1px solid var(--border);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }
        .desk-feed {
          border-right: none;
          border-left: 1px solid var(--border);
        }

        .desk-center {
          display: grid;
          grid-template-rows: auto 1fr;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 2px solid var(--border);
          padding-bottom: 8px;
        }
        .panel-header h3 { margin: 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }

        /* Form Elements */
        .desk-form { display: flex; flex-direction: column; gap: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-group label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }
        
        .desk-input, .desk-select {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 8px;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .desk-input:disabled { opacity: 0.6; }
        
        .divider { height: 1px; background: var(--border); margin: 5px 0; }

        /* Buttons */
        .primary-btn { background: var(--accent); color: #fff; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .danger-btn { background: #ef4444; color: #fff; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .text-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 0.8rem; }
        
        .toggle-row { display: flex; background: rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
        .toggle-btn { flex: 1; background: transparent; border: none; padding: 8px; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem; }
        .toggle-btn.active { background: var(--accent); color: #fff; }
        .toggle-btn.active-danger { background: #ef4444; color: #fff; }

        .status-badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: #334155; }
        .status-badge.active { background: #22c55e; color: #000; }

        /* Metrics & Chart */
        .metrics-strip {
          padding: 15px 20px;
          background: var(--bg-panel);
          border-bottom: 1px solid var(--border);
        }
        .chart-area { padding: 0; background: #000; } 

        /* Feed */
        .feed-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 200px; }
        .logs-section { flex: 2; border-top: 1px solid var(--border); padding-top: 20px; }
        .logs-container { overflow-y: auto; flex: 1; background: rgba(0,0,0,0.1); border-radius: 4px; }

        @media (max-width: 1024px) {
          .desk-layout { grid-template-columns: 1fr; grid-template-rows: auto; overflow-y: auto; }
          .desk-sidebar, .desk-feed { border: none; border-bottom: 1px solid var(--border); }
          .chart-area { height: 500px; }
        }
      `}</style>
    </div>
  );
};

export default DeskLayout;
