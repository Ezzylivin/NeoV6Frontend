// File: frontend/src/pages/LiveLogs.jsx
import React, { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';

const LiveLogs = () => {
  const [logs, setLogs] = useState([]);
  const wsUrl = import.meta.env.VITE_API_WS_URL;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = new WebSocket(`${wsUrl}?token=${token}`);

    socket.onopen = () => setLogs(prev => [...prev, { time: new Date(), msg: 'Connection established.' }]);
    socket.onclose = () => setLogs(prev => [...prev, { time: new Date(), msg: 'Connection closed.' }]);
    socket.onerror = () => setLogs(prev => [...prev, { time: new Date(), msg: 'Connection error.' }]);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLogs(prev => [...prev, { time: new Date(), msg: data.message }]);
    };

    // Cleanup on component unmount
    return () => {
      socket.close();
    };
  }, [wsUrl]);

  return (
    <div>
      <h2>Live Logs</h2>
      <div style={{ background: '#222', color: 'white', height: '400px', overflowY: 'auto', padding: '10px', fontFamily: 'monospace' }}>
        {logs.map((log, index) => (
          <div key={index}>[{log.time.toLocaleTimeString()}] {log.msg}</div>
        ))}
      </div>
    </div>
  );
};

export default LiveLogs;


