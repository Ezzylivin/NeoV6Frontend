// File: frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Backtest from './pages/Backtest';
import BotTraining from './pages/BotTraining';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import BotControl from './components/BotControl';

import { getToken, removeToken } from './utils/auth';

function App() {
  const [logs, setLogs] = useState([]);
  const ws = useRef(null);
  const token = getToken();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // NOTE: Replace this WebSocket logic with REST-based log pulling if desired
      ws.current = new WebSocket(`${import.meta.env.VITE_API_WS_URL}/?token=${token}`);

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

      return () => ws.current?.close();
    }
  }, [t]()
