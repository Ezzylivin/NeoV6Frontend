// File: frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import BotControl from './components/BotControl';

const WS_URL = import.meta.env.VITE_API_WS_URL;


function App() {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
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
    setLogs((prev) => [...prev, msg].slice(-100)); // Keep last 100 logs max
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        setAccessToken(data.access_token);
        setLogs([]);
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        setAccessToken(data.access_token);
        setLogs([]);
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAccessToken('');
    setLogs([]);
  };

  return (
    <div style={{ maxWidth: 600, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
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
          <button onClick={handleLogout} style={{ float: 'right' }}>
            Logout
          </button>
          <h1>Trading Bot Dashboard</h1>
          <BotControl accessToken={accessToken} />
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
    </div>
  );
}

export default App;
