// File: src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Backtest from './pages/Backtest';
import BotTraining from './pages/BotTraining';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import BotControl from './components/BotControl';

import { getToken, removeToken } from './utils/auth';
import { fetchLogs } from './api/logs'; // <-- We'll create this API call

function App() {
  const [logs, setLogs] = useState([]);
  const token = getToken();
  const navigate = useNavigate();

  // Poll logs every 5 seconds using REST API
  useEffect(() => {
    let intervalId;

    const loadLogs = async () => {
      try {
        const res = await fetchLogs();
        setLogs(res.data.slice(-100)); // Keep last 100 logs
      } catch {
        // Handle errors silently or log if you want
      }
    };

    if (token) {
      loadLogs(); // initial load
      intervalId = setInterval(loadLogs, 5000);
    }

    return () => clearInterval(intervalId);
  }, [token]);

  const handleLogout = () => {
    removeToken();
    navigate('/login');
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      {token ? (
        <>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Trading Bot Dashboard</h1>
            <button onClick={handleLogout} style={{ padding: '6px 12px' }}>
              Logout
            </button>
          </header>

          <nav style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'blue' }}>
              Dashboard
            </Link>
            <Link to="/backtest" style={{ textDecoration: 'none', color: 'blue' }}>
              Backtest
            </Link>
            <Link to="/bot-training" style={{ textDecoration: 'none', color: 'blue' }}>
              Bot Training
            </Link>
          </nav>

          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <>
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
                  </>
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
            <Route
              path="/bot-training"
              element={
                <ProtectedRoute>
                  <BotTraining />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
