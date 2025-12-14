import React from "react";
import { MetricsDisplay, ChartPanel, DecisionStream } from "./SharedComponents";

const CommandLayout = (props) => {
  const {
    // State & Handlers
    formConfig, setFormConfig,
    setups, liveWinners,
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, handleWinnerSelect,
    scanningWinners, fetchWinners,
    isRunning, botLoading,
    handleStart, handleStop,
    botStatus,
    logs
  } = props;

  return (
    <div className="command-layout">
      
      {/* ---------------- ZONE 1: SITUATION BOARD (Top) ---------------- */}
      <header className={`status-banner ${isRunning ? 'online' : 'offline'}`}>
        <div className="status-text">
          {isRunning ? "/// SYSTEM OPERATIONAL ///" : "/// SYSTEM HALTED ///"}
        </div>
        <div className="status-meta">
          <span>NET: {botStatus?.performanceMetrics?.net_transfer || 'MAINNET'}</span>
          <span>LATENCY: 12ms</span>
        </div>
      </header>

      {/* ---------------- ZONE 2: KEY PERFORMANCE INDICATORS ---------------- */}
      <section className="kpi-row">
        <MetricsDisplay data={botStatus} variant="command" />
      </section>

      {/* ---------------- ZONE 3: BATTLEFIELD (Main Grid) ---------------- */}
      <main className="command-grid">
        
        {/* LEFT: VISUAL SURVEILLANCE */}
        <div className="grid-chart">
          <div className="panel-label">MARKET_VISUALIZER_V6</div>
          <div className="chart-frame">
            <ChartPanel 
              chartData={props.chartData} 
              formConfig={formConfig} 
              height="100%" 
            />
          </div>
        </div>

        {/* RIGHT: TACTICAL CONTROL */}
        <aside className="grid-sidebar">
          
          {/* A. LIVE INTEL STREAM */}
          <div className="intel-panel">
            <div className="panel-label">LIVE_INTEL_FEED</div>
            <div className="stream-wrapper">
              <DecisionStream logs={logs} limit={15} />
            </div>
          </div>

          {/* B. MISSION CONFIGURATION (The Form) */}
          <div className="control-panel">
            <div className="panel-label">TACTICAL_SETUP</div>
            
            <form onSubmit={handleStart} className="command-form">
              {/* Strategy Selectors */}
              <div className="cmd-row">
                <select 
                  value={selectedSetupId} 
                  onChange={handleSetupSelect} 
                  disabled={isRunning}
                  className="cmd-input"
                >
                  <option value="">[ SELECT STRATEGY ]</option>
                  {setups.map(s => <option key={s._id} value={s._id}>{s.name.toUpperCase()}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={fetchWinners} 
                  className="cmd-btn-small"
                >
                  {scanningWinners ? 'SCANNING' : 'SCAN'}
                </button>
              </div>

              {/* Params */}
              <div className="cmd-row">
                <input 
                  value={formConfig.symbol} 
                  disabled 
                  className="cmd-input" 
                  placeholder="SYMBOL"
                />
                <input 
                  type="number" 
                  value={formConfig.riskPercentage} 
                  onChange={e => setFormConfig(p => ({...p, riskPercentage: e.target.value}))}
                  disabled={isRunning}
                  className="cmd-input"
                  placeholder="RISK %"
                />
              </div>

              {/* Capital */}
              <div className="cmd-row">
                <input 
                  type="number" 
                  value={formConfig.capitalAllocation} 
                  onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
                  disabled={isRunning}
                  className="cmd-input full-width"
                  placeholder="DEPLOYMENT CAPITAL ($)"
                />
              </div>

              {/* LAUNCH KEYS */}
              <div className="launch-pad">
                {!isRunning ? (
                  <button type="submit" className="launch-btn engage" disabled={botLoading}>
                    {botLoading ? 'INITIALIZING...' : 'ENGAGE SYSTEM'}
                  </button>
                ) : (
                  <button type="button" onClick={handleStop} className="launch-btn abort" disabled={botLoading}>
                    EMERGENCY CUTOFF
                  </button>
                )}
              </div>
            </form>
          </div>

        </aside>
      </main>

      {/* --- COMMAND STYLES --- */}
      <style>{`
        .command-layout {
          display: grid;
          grid-template-rows: auto auto 1fr;
          height: 100vh;
          background-color: #000;
          color: var(--text-primary);
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }

        /* 1. STATUS BANNER */
        .status-banner {
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 900;
          letter-spacing: 2px;
          border-bottom: 2px solid;
        }
        .status-banner.online {
          background: rgba(0, 255, 65, 0.1);
          color: #00ff41;
          border-color: #00ff41;
          box-shadow: 0 0 15px rgba(0,255,65,0.2);
        }
        .status-banner.offline {
          background: rgba(255, 0, 85, 0.1);
          color: #ff0055;
          border-color: #ff0055;
        }
        .status-meta { font-size: 0.7rem; opacity: 0.8; display: flex; gap: 15px; }

        /* 2. KPI ROW */
        .kpi-row {
          padding: 15px 20px;
          background: #050505;
          border-bottom: 1px solid #333;
        }

        /* 3. MAIN GRID */
        .command-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          overflow: hidden;
        }

        /* Chart Section */
        .grid-chart {
          padding: 20px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #333;
        }
        .chart-frame {
          flex: 1;
          border: 2px solid #333;
          position: relative;
        }
        .grid-chart:hover .chart-frame { border-color: var(--text-primary); }

        /* Sidebar */
        .grid-sidebar {
          display: grid;
          grid-template-rows: 1fr auto;
          background: #080808;
        }

        /* Panels */
        .intel-panel, .control-panel {
          display: flex;
          flex-direction: column;
          border-top: 1px solid #333;
        }
        .intel-panel { border-top: none; overflow: hidden; }
        
        .panel-label {
          background: #111;
          color: #666;
          font-size: 0.7rem;
          padding: 5px 10px;
          border-bottom: 1px solid #333;
          font-weight: bold;
        }
        .stream-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          font-size: 0.8rem;
        }

        /* Form */
        .command-form { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .cmd-row { display: flex; gap: 5px; }
        
        .cmd-input {
          background: #000;
          border: 1px solid #333;
          color: var(--text-primary);
          padding: 8px;
          font-family: inherit;
          font-size: 0.8rem;
          flex: 1;
        }
        .cmd-input:focus { border-color: var(--text-primary); outline: none; }
        .full-width { width: 100%; }

        .cmd-btn-small {
          background: #111; border: 1px solid #333; color: #888;
          cursor: pointer; padding: 0 10px;
        }
        .cmd-btn-small:hover { border-color: var(--text-primary); color: var(--text-primary); }

        /* Launch Buttons */
        .launch-pad { margin-top: 10px; }
        .launch-btn {
          width: 100%;
          padding: 15px;
          font-weight: 900;
          font-family: inherit;
          font-size: 1rem;
          text-transform: uppercase;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .launch-btn.engage {
          background: var(--text-primary); /* Green usually */
          color: #000;
          box-shadow: 0 0 10px var(--text-primary);
        }
        .launch-btn.engage:hover { transform: scale(1.02); letter-spacing: 1px; }
        
        .launch-btn.abort {
          background: #ff0055;
          color: white;
          box-shadow: 0 0 10px #ff0055;
          animation: pulse-red 1s infinite;
        }

        @keyframes pulse-red {
          0% { box-shadow: 0 0 5px #ff0055; }
          50% { box-shadow: 0 0 20px #ff0055; }
          100% { box-shadow: 0 0 5px #ff0055; }
        }

        @media (max-width: 1024px) {
          .command-grid { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
          .grid-chart { height: 400px; border-right: none; border-bottom: 1px solid #333; }
        }
      `}</style>
    </div>
  );
};

export default CommandLayout;
