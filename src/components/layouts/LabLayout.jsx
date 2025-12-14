import React from "react";
import { MetricsDisplay, ChartPanel } from "./SharedComponents";

const LabLayout = (props) => {
  const {
    // State & Handlers
    formConfig, setFormConfig,
    setups, liveWinners,
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, handleWinnerSelect,
    scanningWinners, fetchWinners,
    isRunning, botLoading,
    handleStart, handleStop,
    botStatus
  } = props;

  return (
    <div className="lab-layout">
      {/* ---------------- TOP: CONTROL DECK ---------------- */}
      <header className="lab-deck">
        <form onSubmit={handleStart} className="deck-grid">
          
          {/* MODULE 1: STRATEGY LOADER */}
          <div className="deck-module">
            <div className="module-label">SOURCE</div>
            <div className="module-content">
              <select 
                value={selectedSetupId} 
                onChange={handleSetupSelect} 
                disabled={isRunning}
                className="lab-input"
              >
                <option value="">-- DB Strategy --</option>
                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              
              <div className="flex-row">
                <button 
                  type="button" 
                  onClick={fetchWinners} 
                  disabled={scanningWinners}
                  className="icon-btn"
                  title="Scan Folder"
                >
                  {scanningWinners ? '...' : '↻'}
                </button>
                <select 
                  value={selectedWinnerId} 
                  onChange={handleWinnerSelect} 
                  disabled={isRunning}
                  className="lab-input"
                >
                  <option value="">-- Alpha File --</option>
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* MODULE 2: CAPITAL & RISK */}
          <div className="deck-module">
            <div className="module-label">PARAMETERS</div>
            <div className="module-content grid-2">
              <div className="input-wrap">
                <span>CAPITAL ($)</span>
                <input 
                  type="number" 
                  value={formConfig.capitalAllocation} 
                  onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
                  disabled={isRunning}
                  className="lab-input"
                />
              </div>
              <div className="input-wrap">
                <span>RISK (%)</span>
                <input 
                  type="number" 
                  value={formConfig.riskPercentage} 
                  onChange={e => setFormConfig(p => ({...p, riskPercentage: e.target.value}))}
                  disabled={isRunning}
                  step="0.1"
                  className="lab-input"
                />
              </div>
              <div className="input-wrap span-2">
                <span>MODE</span>
                <select 
                  value={formConfig.riskManagementMode} 
                  onChange={e => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))}
                  disabled={isRunning}
                  className="lab-input"
                >
                  <option value="static">STATIC (Fixed %)</option>
                  <option value="dynamic">DYNAMIC (Volatility)</option>
                </select>
              </div>
            </div>
          </div>

          {/* MODULE 3: EXECUTION */}
          <div className="deck-module action-module">
            <div className="module-label">SEQUENCE</div>
            <div className="module-content flex-col">
              <div className="switch-row">
                <button 
                  type="button" 
                  className={`lab-switch ${formConfig.tradingMode === 'paper' ? 'active' : ''}`}
                  onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}
                  disabled={isRunning}
                >
                  PAPER
                </button>
                <button 
                  type="button" 
                  className={`lab-switch danger ${formConfig.tradingMode === 'live' ? 'active' : ''}`}
                  onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}
                  disabled={isRunning}
                >
                  LIVE
                </button>
              </div>

              {!isRunning ? (
                <button type="submit" className="lab-big-btn start" disabled={botLoading}>
                  {botLoading ? 'INIT...' : '▶ RUN TEST'}
                </button>
              ) : (
                <button type="button" onClick={handleStop} className="lab-big-btn stop" disabled={botLoading}>
                  ■ ABORT
                </button>
              )}
            </div>
          </div>

          {/* MODULE 4: LIVE READOUT */}
          <div className="deck-module metrics-module">
            <div className="module-label">TELEMETRY</div>
            <div className="module-content">
               <MetricsDisplay data={botStatus} variant="lab" />
            </div>
          </div>

        </form>
      </header>

      {/* ---------------- BOTTOM: CHART VIEWPORT ---------------- */}
      <main className="lab-viewport">
        <div className="chart-frame">
          <ChartPanel 
            chartData={props.chartData} 
            formConfig={formConfig} 
            height="100%" 
          />
        </div>
      </main>

      {/* --- LAB STYLES --- */}
      <style>{`
        .lab-layout {
          display: grid;
          grid-template-rows: auto 1fr;
          height: 100vh;
          background: var(--bg-app);
          color: var(--text-primary);
          overflow: hidden;
        }

        /* The Deck (Top Bar) */
        .lab-deck {
          background: var(--bg-panel);
          border-bottom: 1px solid var(--border);
          padding: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          z-index: 10;
        }

        .deck-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr 1fr 2fr;
          gap: 15px;
          align-items: stretch;
        }

        /* Modules */
        .deck-module {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .module-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .module-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }

        /* Inputs */
        .lab-input {
          background: var(--bg-app);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 6px 10px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          width: 100%;
        }
        .lab-input:disabled { opacity: 0.5; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .span-2 { grid-column: span 2; }
        .flex-row { display: flex; gap: 5px; }
        .flex-col { display: flex; flex-direction: column; gap: 8px; height: 100%; }

        .input-wrap { display: flex; flex-direction: column; gap: 2px; }
        .input-wrap span { font-size: 0.6rem; color: var(--text-secondary); }

        .icon-btn { 
          background: var(--bg-app); border: 1px solid var(--border); 
          color: var(--accent); cursor: pointer; width: 30px; 
          border-radius: 4px; display: grid; place-items: center;
        }

        /* Buttons & Switches */
        .switch-row { display: flex; gap: 2px; background: var(--bg-app); padding: 2px; border-radius: 4px; }
        .lab-switch {
          flex: 1; background: transparent; border: none; 
          color: var(--text-secondary); font-size: 0.7rem; font-weight: bold;
          cursor: pointer; padding: 4px; border-radius: 2px;
        }
        .lab-switch.active { background: var(--text-secondary); color: var(--bg-app); }
        .lab-switch.danger.active { background: #ef4444; color: white; }

        .lab-big-btn {
          flex: 1; border: none; border-radius: 4px; 
          font-weight: 900; letter-spacing: 1px; cursor: pointer;
          font-size: 0.9rem; transition: transform 0.1s;
        }
        .lab-big-btn:active { transform: scale(0.98); }
        .start { background: var(--accent); color: white; box-shadow: 0 0 10px var(--accent); }
        .stop { background: #ef4444; color: white; box-shadow: 0 0 10px #ef4444; }

        /* Viewport */
        .lab-viewport {
          padding: 20px;
          background-image: radial-gradient(var(--border) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .chart-frame {
          height: 100%;
          border: 1px solid var(--border);
          background: var(--bg-panel);
          border-radius: var(--radius);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .deck-grid { grid-template-columns: 1fr 1fr; }
          .metrics-module { grid-column: span 2; }
        }
        @media (max-width: 600px) {
          .lab-layout { overflow-y: auto; display: block; }
          .deck-grid { display: flex; flex-direction: column; }
          .chart-frame { height: 500px; }
        }
      `}</style>
    </div>
  );
};

export default LabLayout;
