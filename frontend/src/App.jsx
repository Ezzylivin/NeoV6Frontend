import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
} from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Backtest from './pages/Backtest';
import BotControl from './components/BotControl';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';

import { getToken, removeToken } from './utils/auth';

const WS_URL = import.meta.env.VITE_API_WS_URL;

function App() {
  const [logs, setLogs] = useState([]);
  const ws = useRef(null);
  const token = getToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      ws.current = new WebSocket(`${WS_URL}/?token=${token}`);

      ws.current.onopen = () => addLog('Connected to live logs.');

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message) addLog(data.message);
        } catch {
          addLog('Received malformed message.');
        }
      };

      ws.current.onclose = () => addLog('Disconnected from live logs.');

      return () => ws.current.close();
    }
  }, [token]);

  const addLog = (msg) => setLogs((prev) => [...prev, msg].slice(-100));

  const handleLogout = () => {
    removeToken();
    navigate('/login');
    window.location.reload();
  };

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1>Trading Bot Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '6px 12px' }}>
          Logout
        </button>
      </header>

      <nav style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            color: isActive ? 'darkblue' : 'blue',
            textDecoration: 'none',
          })}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/backtest"
          style={({ isActive }) => ({
            color: isActive ? 'darkblue' : 'blue',
            textDecoration: 'none',
          })}
        >
          Backtest
        </NavLink>
        {/* Add more links here */}
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
              <BotControl accessToken={token} />
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
                  marginTop: 20,
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/backtest"
          element={
            <ProtectedRoute>
              <Backtest />
            </ProtectedRoute>
          }
        />
        {/* Add more protected routes for other pages */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
