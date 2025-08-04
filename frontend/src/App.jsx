// File: frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import BotControl from './components/BotControl';
// Placeholder components
const Charts = () => <div><h2>Charts Page</h2><p>Chart components go here.</p></div>;
const LiveTrading = () => <div><h2>Live Trading Page</h2><p>Live trading interface here.</p></div>;
const BotTraining = () => <div><h2>Bot Training Page</h2><p>Bot training interface here.</p></div>;
const Settings = () => <div><h2>Settings Page</h2><p>Settings and preferences go here.</p></div>;

const WS_URL = import.meta.env.VITE_API_WS_URL;

function App() {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState('dashboard'); // Page navigation
  const ws = useRef(null);

  useEffect(() => {
    if (accessToken) {
      ws.current = new WebSocket(`${WS_URL}/?token=${accessToken}`);

      ws.current.onopen = () => {
        addLog(' Connected to live logs.');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message) {
            addLog(data.message);
          }
        } catch {
          addLog('Received malformed message.');
        }
      };

      ws.current.onclose = () => {
        addLog(' Disconnected from live logs.');
      };

      return () => {
        ws.current.close();
      };
    }
  }, [accessToken]);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, msg].slice(-100));
  };

  // Login, register, logout handlers here (omitted for brevity)

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      {!accessToken ? (
        <>
          <h2>Login or Register</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
          />
          <button onClick={handleLogin} style={{ marginRight: 10 }}>
            Login
          </button>
          <button onClick={handleRegister}>Register</button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Trading Bot Dashboard</h1>
            <button onClick={handleLogout} style={{ padding: '6px 12px' }}>
              Logout
            </button>
          </div>

          {/* Navigation buttons */}
          <nav style={{ marginBottom: 20 }}>
            {['dashboard', 'charts', 'live-trading', 'bot-training', 'settings'].map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  marginRight: 10,
                  padding: '8px 16px',
                  backgroundColor: page === p ? '#007bff' : '#eee',
                  color: page === p ? 'white' : 'black',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {p === 'dashboard'
                  ? 'Dashboard'
                  : p === 'charts'
                  ? 'Charts'
                  : p === 'live-trading'
                  ? 'Live Trading'
                  : p === 'bot-training'
                  ? 'Bot Training'
                  : 'Settings'}
              </button>
            ))}
          </nav>

          {/* Render page content */}
          {page === 'dashboard' && <BotControl accessToken={accessToken} />}
          {page === 'charts' && <Charts />}
          {page === 'live-trading' && <LiveTrading />}
          {page === 'bot-training' && <BotTraining />}
          {page === 'settings' && <Settings />}

          {/* Live Logs only on dashboard */}
          {page === 'dashboard' && (
            <>
              <h3>Live Logs</h3>
              <div
                style={{
                  background: '#111',
                  color: '#0f0',
                  height: 300,
                  overflowY: 'auto',
                  padding: 10,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  borderRadius: 5,
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
