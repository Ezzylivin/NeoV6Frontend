import React from "react";
import { MetricsDisplay, ChartPanel, DecisionStream } from "./SharedComponents";

const AILayout = (props) => {
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
    <div className="ai-layout">
      
      {/* --- LEFT CORTEX: INPUT PARAMETERS --- */}
      <aside className="ai-panel left-cortex">
        <div className="panel-glass">
          <h3 className="ai-header">/// INPUT_PARAMETERS ///</h3>
          
          <form onSubmit={handleStart} className="ai-form">
            <div className="input-block">
              <label>STRATEGY_MODEL</label>
              <select 
                value={selectedSetupId} 
                onChange={handleSetupSelect} 
                disabled={isRunning}
                className="ai-input"
              >
                <option value="">[ AWAITING SELECTION ]</option>
                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div className="input-block">
              <label>ALPHA_SOURCE</label>
              <div className="flex-row">
                <select 
                  value={selectedWinnerId} 
                  onChange={handleWinnerSelect} 
                  disabled={isRunning}
                  className="ai-input"
                >
                  <option value="">[ LOCAL FILE ]</option>
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <button type="button" onClick={fetchWinners} className="ai-btn-small">
                  {scanningWinners ? '...' : '⚡'}
                </button>
              </div>
            </div>

            <div className="divider-glow"></div>

            <div className="input-block">
              <label>CAPITAL_ALLOCATION</label>
              <input 
                type="number" 
                value={formConfig.capitalAllocation} 
                onChange={e => setFormConfig(p => ({...p, capitalAllocation: e.target.value}))}
                disabled={isRunning}
                className="ai-input"
              />
            </div>

            <div className="dual-input">
              <div className="input-block">
                <label>RISK_TOLERANCE</label>
                <select 
                  value={formConfig.riskManagementMode} 
                  onChange={e => setFormConfig(p => ({...p, riskManagementMode: e.target.value}))}
                  disabled={isRunning}
                  className="ai-input"
                >
                  <option value="static">STATIC</option>
                  <option value="dynamic">DYNAMIC</option>
                </select>
              </div>
              <div className="input-block">
                <label>FACTOR (%)</label>
                <input 
                  type="number" 
                  value={formConfig.riskPercentage} 
                  onChange={e => setFormConfig(p => ({...p, riskPercentage: e.target.value}))}
                  disabled={isRunning}
                  step="0.1"
                  className="ai-input"
                />
              </div>
            </div>

            <div className="mode-toggle-ai">
              <button 
                type="button" 
                className={`ai-toggle ${formConfig.tradingMode === 'paper' ? 'active' : ''}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: 'paper'}))}
              >
                SIMULATION
              </button>
              <button 
                type="button" 
                className={`ai-toggle danger ${formConfig.tradingMode === 'live' ? 'active' : ''}`}
                onClick={() => setFormConfig(p => ({...p, tradingMode: 'live'}))}
              >
                LIVE_NET
              </button>
            </div>

            {!isRunning ? (
              <button type="submit" className="ai-main-btn engage" disabled={botLoading}>
                INITIALIZE CORE
              </button>
            ) : (
              <button type="button" onClick={handleStop} className="ai-main-btn terminate" disabled={botLoading}>
                SEVER CONNECTION
              </button>
            )}
          </form>
        </div>
      </aside>

      {/* --- CENTER CORTEX: VISUALIZATION --- */}
      <main className="ai-center">
        <div className="holo-frame">
          <div className="holo-header">
            <span>VISUAL_CORTEX // {formConfig.symbol} // {formConfig.timeframe}</span>
            <span className={`pulse-dot ${isRunning ? 'active' : ''}`}></span>
          </div>
          <div className="chart-container">
            <ChartPanel 
              chartData={props.chartData} 
              formConfig={formConfig} 
              height="100%" 
            />
          </div>
          <div className="holo-footer">
            <MetricsDisplay data={botStatus} variant="ai" />
          </div>
        </div>
      </main>

      {/* --- RIGHT CORTEX: THOUGHT STREAM --- */}
      <aside className="ai-panel right-cortex">
        <div className="panel-glass full-height">
          <h3 className="ai-header">/// NEURAL_STREAM ///</h3>
          <div className="thought-stream">
            <DecisionStream logs={logs} limit={20} />
          </div>
        </div>
      </aside>

      {/* --- AI THEME STYLES --- */}
      <style>{`
        .ai-layout {
          display: grid;
          grid-template-columns: 320px 1fr 320px;
          height: 100vh;
          background: var(--bg-app);
          color: var(--text-primary);
          padding: 20px;
          gap: 20px;
          overflow: hidden;
        }

        /* Glass Panels */
        .ai-panel { display: flex; flex-direction: column; }
        .panel-glass {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .full-height { height: 100%; overflow: hidden; }

        .ai-header {
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          color: var(--accent);
          margin-bottom: 20px;
          letter-spacing: 2px;
          text-shadow: 0 0 10px var(--accent);
        }

        /* Forms */
        .ai-form { display: flex; flex-direction: column; gap: 15px; }
        .input-block { display: flex; flex-direction: column; gap: 5px; }
        .input-block label { font-size: 0.6rem; color: var(--text-secondary); letter-spacing: 1px; }
        
        .ai-input {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 10px;
          border-radius: 8px;
          font-family: inherit;
          transition: border 0.3s, box-shadow 0.3s;
        }
        .ai-input:focus { border-color: var(--accent); box-shadow: 0 0 15px var(--accent); outline: none; }
        
        .flex-row { display: flex; gap: 5px; }
        .ai-btn-small { background: var(--accent); border: none; border-radius: 8px; width: 40px; cursor: pointer; color: black; }
        
        .divider-glow { height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); margin: 10px 0; }
        .dual-input { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        /* Toggles */
        .mode-toggle-ai { display: flex; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 4px; gap: 4px; }
        .ai-toggle { flex: 1; background: transparent; border: none; color: var(--text-secondary); padding: 8px; border-radius: 8px; cursor: pointer; font-size: 0.7rem; font-weight: bold; }
        .ai-toggle.active { background: var(--accent); color: black; box-shadow: 0 0 10px var(--accent); }
        .ai-toggle.danger.active { background: #ff0055; color: white; box-shadow: 0 0 10px #ff0055; }

        /* Main Button */
        .ai-main-btn {
          padding: 15px; border-radius: 12px; border: none; 
          font-weight: 900; letter-spacing: 2px; cursor: pointer;
          margin-top: 10px; transition: transform 0.2s;
        }
        .ai-main-btn:hover { transform: scale(1.02); }
        .engage { background: linear-gradient(135deg, var(--accent), #a855f7); color: white; box-shadow: 0 0 20px var(--accent); }
        .terminate { background: linear-gradient(135deg, #ff0055, #ff5555); color: white; box-shadow: 0 0 20px #ff0055; }

        /* Center Holo Frame */
        .ai-center { display: flex; flex-direction: column; height: 100%; }
        .holo-frame {
          flex: 1;
          border: 1px solid var(--accent);
          border-radius: 20px;
          background: rgba(0,0,0,0.4);
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.1);
        }
        .holo-frame::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          animation: scan 3s linear infinite;
          z-index: 10;
        }
        @keyframes scan { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }

        .holo-header {
          padding: 10px 20px; border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.8rem; color: var(--text-secondary); letter-spacing: 2px;
        }
        .pulse-dot { width: 8px; height: 8px; background: #333; border-radius: 50%; }
        .pulse-dot.active { background: var(--accent); box-shadow: 0 0 10px var(--accent); animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

        .chart-container { flex: 1; position: relative; }
        .holo-footer { padding: 15px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.2); }

        /* Stream */
        .thought-stream { flex: 1; overflow-y: auto; padding-right: 5px; }
        .thought-stream::-webkit-scrollbar { width: 4px; }
        .thought-stream::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 4px; }

        @media (max-width: 1200px) {
          .ai-layout { grid-template-columns: 1fr; grid-template-rows: auto 500px auto; overflow-y: auto; }
        }
      `}</style>
    </div>
  );
};

export default AILayout;
