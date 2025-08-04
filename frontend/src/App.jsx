// File: frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import BotControl from './components/BotControl';
import api from './api';

const WS_URL = import.meta.env.VITE_API_WS_URL;

// Placeholder components for new pages
const Charts = () => <div><h2>Charts Page</h2><p>Chart components go here.</p></div>;
const LiveTrading = () => <div><h2>Live Trading Page</h2><p>Live trading interface here.</p></div>;
const BotTraining = () => <div><h2>Bot Training Page</h2><p>Bot training interface here.</p></div>;
const Settings = () => <div><h2>Settings Page</h2><p>Settings and preferences go here.</p></div>;

function App() {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState('dashboard'); // Page navigation state
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
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        setAccessToken(res.data.access_token);
        setLogs([]);
      } else {
        alert('Login failed: No access token received.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed.');
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    try {
      const res = await api.post('/auth/register', { email, password });
      if (res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        setAccessToken(res.data.access_token);
        setLogs([]);
      } else {
        alert('Registration failed: No access token received.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAccessToken('');
    setLogs([]);
    setPage(
