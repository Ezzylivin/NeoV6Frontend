// File: src/components/layouts/DeskLayout.jsx
// 🚀 UPGRADE: v3.4 - Stability & API Alignment
// 🛠 Fixes: Crash on empty/loading data (undefined .map).
// 🛠 Update: Aligns 'Optimizer Results' dropdown with new Python API structure.

import React from "react";
import LiveTradingChart from "../LiveTradingChart"; 
import { MetricsDisplay, LogsPanel, DecisionStream } from "../SharedComponents";

const DeskLayout = (props) => {
  // 🛡️ Destructure with default values to prevent crashes
  const {
    formConfig, setFormConfig,
    setups = [],         // Default to empty array
    liveWinners = [],    // Default to empty array
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, 
    handleWinnerSelect = () => {}, // Default no-op if function is missing
    scanningWinners, fetchWinners,
    isRunning, botLoading,
    handleStart, handleStop,
    handleClearLogs,
    botStatus,
    logs = [],           // Default to empty array
    visibleLogs = [],    // Default to empty array
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
              {/* 🛡️ Safe Mapping for Setups */}
              {(setups || []).map(s => (
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
              {/* 🛡️ Safe Mapping & New Data Structure Support */}
              {(liveWinners || []).map(w => {
                // Support both new API (botId/symbol) and potential legacy formats
                const id = w.botId || w.id;
                const name = w.symbol || w.name || "Unknown";
                const roi = w.roi ? (w.roi * 100).toFixed(0) : 0;
                return (
                    <option key={id} value={id}>
                        {name} (ROI: {roi}%)
                    </option>
                );
              })}
            </select>
          </div>

          <div className="divider"></div>

          {/* 2. Asset & Capital */}
          <div className="form-row">
            <div className="form-group">
              <label>Symbol</label>
              <input value={formConfig.symbol || ''} disabled className="desk-input" />
            </div>
            <div className="form-group">
              <label>Timeframe</label>
              <input value={formConfig.timeframe || ''} disabled className="desk-input" />
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

          {/* 4. Safety Limits (NEW) */}
          <div className="divider"></div>
          <div className="form-group">
             <label style={{color: '#f87171', fontSize: '0.65rem', letterSpacing: '1px'}}>SAFETY PROTOCOLS</label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Loss %</label>
              <input 
                type="number" 
                value={formConfig.maxDailyLoss} 
                onChange={e => setFormConfig(p => ({...p, maxDailyLoss: e.target.value}))}
                disabled={isRunning}
                className="desk-input"
              />
            </div>
            <div className="form-group">
              <label>Max DD %</label>
              <input 
                type="number" 
                value={formConfig.maxDrawdown} 
                onChange={e => setFormConfig(p => ({...p, maxDrawdown: e.target.value}))}
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
                onChange={e => setFormConfig(p => ({...p, maxTradesPerDay: e.target.value}))}
                disabled={isRunning}
                className="desk-input"
            />
          </div>

          {/* 5. Actions */}
          <div className="action-area" style={{ marginTop: '15px' }}>
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

      {/* --- INLINE STYLES FOR LAYOUT --- */}
      <style>{`
        .desk-layout {
          display: grid;
          grid-template-columns: 320px 1fr 340px;
          grid-template-rows: 100vh;
          overflow: hidden;
          background-color: #0d0d0d;
          color: #e5e5e5;
          font-family: 'Inter', sans-serif;
        }

        .desk-sidebar, .desk-feed {
          background-color: #111;
          border-right: 1px solid #333;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
        }
        .desk-feed {
          border-right: none;
          border-left: 1px solid #333;
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
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
        }
        .panel-header h3 { margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 700; }

        /* Form Elements */
        .desk-form { display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-group label { font-size: 0.7rem; color: #666; font-weight: 700; text-transform: uppercase; }
        
        .desk-input, .desk-select {
          background: rgba(255,255,255,0.05);
          border: 1px solid #333;
          color: #fff;
          padding: 10px;
          border-radius: 4px;
          font-size: 0.9rem;
          outline: none;
        }
        .desk-input:focus, .desk-select:focus { border-color: #f59e0b; }
        .desk-input:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .divider { height: 1px; background: #333; margin: 5px 0; }

        /* Buttons */
        .primary-btn { background: #f59e0b; color: #000; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s; }
        .primary-btn:hover { background: #fbbf24; transform: translateY(-1px); }
        .primary-btn:disabled { background: #555; cursor: wait; }

        .danger-btn { background: #ef4444; color: #fff; padding: 12px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
        .text-btn { background: none; border: none; color: #f59e0b; cursor: pointer; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
        
        .toggle-row { display: flex; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; margin-bottom: 10px; border: 1px solid #333; }
        .toggle-btn { flex: 1; background: transparent; border: none; padding: 10px; color: #666; cursor: pointer; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; }
        .toggle-btn.active { background: #10b981; color: #000; }
        .toggle-btn.active-danger { background: #ef4444; color: #fff; }

        .status-badge { font-size: 0.65rem; padding: 3px 8px; border-radius: 4px; background: #333; color: #888; font-weight: bold; }
        .status-badge.active { background: #10b981; color: #000; }

        /* Metrics & Chart */
        .metrics-strip {
          padding: 15px 20px;
          background: #111;
          border-bottom: 1px solid #333;
        }
        .chart-area { padding: 0; background: #000; } 

        /* Feed */
        .feed-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 200px; }
        .logs-section { flex: 2; border-top: 1px solid #333; padding-top: 20px; }
        .logs-container { overflow-y: auto; flex: 1; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid #333; padding: 5px; }

        @media (max-width: 1200px) {
          .desk-layout { grid-template-columns: 1fr; grid-template-rows: auto auto 500px; overflow-y: auto; }
          .desk-sidebar, .desk-feed { border: none; border-bottom: 1px solid #333; }
          .chart-area { height: 500px; }
        }
      `}</style>
    </div>
  );
};

export default DeskLayout;
