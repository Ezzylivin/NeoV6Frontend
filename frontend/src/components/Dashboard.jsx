// src/pages/Dashboard.jsx
import React from 'react';
import BotControl from '../components/BotControl';

const Dashboard = ({ accessToken, logs }) => {
  return (
    <div>
      <h2>Dashboard</h2>
      <BotControl accessToken={accessToken} />
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
    </div>
  );
};

export default Dashboard;
