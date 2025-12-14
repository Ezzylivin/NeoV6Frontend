import React from "react";

const JournalLayout = (props) => {
  const { logs } = props;

  return (
    <div className="journal-layout">
      <div className="journal-sheet">
        <div className="sheet-header">
          <h2>/// MASTER EVENT LOG ///</h2>
          <div className="sheet-meta">Total Entries: {logs.length}</div>
        </div>
        
        <div className="sheet-content">
          {logs.length > 0 ? logs.map((log, i) => (
            <div key={i} className={`log-row ${log.type}`}>
              <div className="log-ts">
                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <div className="log-pipe">│</div>
              <div className="log-data">{log.message}</div>
            </div>
          )) : (
            <div className="empty-sheet">NO EVENTS RECORDED</div>
          )}
        </div>
      </div>

      <style>{`
        .journal-layout { height: 100vh; background: var(--bg-app); padding: 40px; overflow: hidden; color: var(--text-primary); font-family: var(--font-main); }
        
        .journal-sheet { background: var(--bg-panel); height: 100%; border: 1px solid var(--border); display: flex; flex-direction: column; max-width: 1000px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        
        .sheet-header { padding: 20px; border-bottom: 2px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.1); }
        .sheet-header h2 { margin: 0; font-size: 1rem; letter-spacing: 2px; }
        
        .sheet-content { flex: 1; overflow-y: auto; padding: 20px; font-family: 'Courier New', monospace; font-size: 0.9rem; }
        
        .log-row { display: flex; gap: 15px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .log-ts { color: var(--text-secondary); min-width: 160px; text-align: right; }
        .log-pipe { color: var(--accent); }
        .log-data { color: var(--text-primary); }
        
        .empty-sheet { text-align: center; color: var(--text-secondary); padding: 50px; font-style: italic; }
      `}</style>
    </div>
  );
};

export default JournalLayout;
