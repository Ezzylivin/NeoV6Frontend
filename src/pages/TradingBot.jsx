// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: Fixed ReferenceError & Added Auto-Polling

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api/apiClient';

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];
const ESTIMATED_DURATION = 60;

// --- Helper Functions (Restored) ---
const calculateMaxDrawdown = (results) => {
  if (!results || results.length === 0) return 0;
  let maxDrawdown = 0;
  let peak = -Infinity;
  for (const r of results) {
    if (r.portfolioValue > peak) peak = r.portfolioValue;
    const drawdown = ((peak - r.portfolioValue) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
};

const calculateSharpeRatio = (results) => {
  if (!results || results.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < results.length; i++) {
    returns.push((results[i].portfolioValue - results[i-1].portfolioValue) / results[i-1].portfolioValue);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length);
  if (stdDev === 0) return 0;
  return (avgReturn / stdDev) * Math.sqrt(252); // Annualized (assuming daily) - rough approx for crypto
};

const calculateProfitFactor = (results) => {
    // Simplified profit factor based on trade list if available, else approximation
    // Since we only have equity curve here usually, we return 0 or need trade list
    return 0; 
};

const formatChartDate = (date) => new Date(date).toLocaleDateString();

// --- Components ---
const EquityCurveChart = ({ curve, height = 300 }) => {
  if (!curve || curve.length === 0) return <div className="no-data">No Data</div>;
  const minPv = Math.min(...curve.map(p => p.portfolioValue));
  const maxPv = Math.max(...curve.map(p => p.portfolioValue));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={curve}>
        <CartesianGrid stroke="#333" strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" tickFormatter={formatChartDate} />
        <YAxis domain={[minPv, maxPv]} />
        <Tooltip 
            contentStyle={{backgroundColor: '#1f2937', border: 'none'}}
            labelFormatter={(l) => new Date(l).toLocaleString()}
        />
        <Line type="monotone" dataKey="portfolioValue" stroke="#4ade80" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const WinLossPieChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={260}>
        <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip />
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

const MetricsDisplay = ({ metrics }) => {
    const formatNumber = (n) => n !== undefined && n !== null ? Number(n).toFixed(2) : '-';
    return (
        <div className="metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginTop: '20px'}}>
            <div className="metric-box" style={{background: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>Return %</div>
                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#fff'}}>{formatNumber(metrics.returnPct)}%</div>
            </div>
            <div className="metric-box" style={{background: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>Win Rate</div>
                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#fff'}}>{formatNumber(metrics.winRate)}%</div>
            </div>
            <div className="metric-box" style={{background: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>Max Drawdown</div>
                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444'}}>{formatNumber(metrics.maxDrawdown)}%</div>
            </div>
             <div className="metric-box" style={{background: '#1f2937', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>Total Trades</div>
                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#fff'}}>{metrics.totalTrades}</div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function TradingBot() {
    const [status, setStatus] = useState({ status: 'stopped', logs: [], trades: [], currentBalance: 1000 });
    const [loading, setLoading] = useState(false);
    const [winners, setWinners] = useState([]);
    const [selectedWinnerId, setSelectedWinnerId] = useState("");
    const [equityCurve, setEquityCurve] = useState([]);

    // --- Polling Logic ---
    useEffect(() => {
        fetchStatus(); // Initial fetch
        fetchWinners();

        // 🚀 POLL EVERY 2 SECONDS
        const interval = setInterval(() => {
            fetchStatus();
        }, 2000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/bot/status');
            const data = res.data;
            
            // Process logs
            if(data.logs) data.logs.reverse(); 
            
            setStatus(data);

            // Build simple equity curve from trades if available
            // In a real app, backend should send 'equityCurve'
            if (data.trades && data.trades.length > 0) {
                let balance = 1000; // Default start
                const curve = data.trades.map(t => {
                    balance += t.profit;
                    return { timestamp: t.exitTime || t.entryTime, portfolioValue: balance };
                });
                setEquityCurve(curve);
            }
            
        } catch (err) {
            console.error("Status fetch error:", err);
        }
    };

    const fetchWinners = async () => {
        try {
            const res = await api.get('/bot/winners');
            setWinners(res.data || []);
        } catch (err) {}
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            await api.post('/bot/start', { 
                strategyId: selectedWinnerId, // Can be empty if hardcoded defaults in backend
                capitalAllocation: 1000
            }); 
            await fetchStatus();
        } catch (err) {
            alert(err.message);
        }
        setLoading(false);
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await api.post('/bot/stop');
            await fetchStatus();
        } catch (err) {
            alert(err.message);
        }
        setLoading(false);
    };

    // Calc Metrics
    const winCount = status.trades ? status.trades.filter(t => t.profit > 0).length : 0;
    const lossCount = status.trades ? status.trades.filter(t => t.profit <= 0).length : 0;
    const winLossData = [{ name: "Wins", value: winCount }, { name: "Losses", value: lossCount }];
    
    const metrics = {
        returnPct: ((status.currentBalance - 1000) / 1000) * 100,
        winRate: (status.trades?.length > 0) ? (winCount / status.trades.length) * 100 : 0,
        maxDrawdown: calculateMaxDrawdown(equityCurve), // Uses restored helper
        totalTrades: status.trades?.length || 0
    };

    return (
        <div className="dashboard-container">
            <h1>Live Trading Bot</h1>
            
            {/* Control Panel */}
            <div className="bot-controls" style={{background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                <div style={{display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px'}}>
                    <div className={`status-indicator ${status.status}`} style={{
                        padding: '8px 16px', borderRadius: '20px', 
                        background: status.status === 'running' ? '#22c55e20' : '#ef444420',
                        color: status.status === 'running' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${status.status === 'running' ? '#22c55e' : '#ef4444'}`
                    }}>
                        Status: <strong>{status.status?.toUpperCase()}</strong>
                    </div>
                    {status.status === 'running' ? (
                        <button onClick={handleStop} disabled={loading} style={{background: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '5px', border: 'none', cursor: 'pointer'}}>
                            ⏹ Stop Bot
                        </button>
                    ) : (
                        <button onClick={handleStart} disabled={loading} style={{background: '#22c55e', color: 'white', padding: '10px 20px', borderRadius: '5px', border: 'none', cursor: 'pointer'}}>
                            ▶ Start Bot
                        </button>
                    )}
                </div>
                
                 {/* Simple Winner Selector for Quick Launch */}
                 {status.status !== 'running' && (
                    <select 
                        value={selectedWinnerId} 
                        onChange={(e) => setSelectedWinnerId(e.target.value)}
                        style={{width: '100%', padding: '10px', borderRadius: '5px', background: '#0f172a', color: 'white', border: '1px solid #334155'}}
                    >
                        <option value="">-- Select Strategy to Deploy --</option>
                        {winners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                 )}
            </div>

            <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                {/* Left Col: Metrics & Chart */}
                <div style={{flex: 2, minWidth: '300px'}}>
                    <div style={{background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                         <h3 style={{color: '#4ade80', marginTop: 0}}>Live Performance</h3>
                         <MetricsDisplay metrics={metrics} />
                         <div style={{marginTop: '20px'}}>
                             <EquityCurveChart curve={equityCurve} />
                         </div>
                    </div>
                </div>

                {/* Right Col: Logs */}
                <div style={{flex: 1, minWidth: '300px'}}>
                    <div className="logs-container" style={{background: '#000', padding: '15px', borderRadius: '8px', height: '600px', overflowY: 'auto', border: '1px solid #333', fontFamily: 'monospace'}}>
                        <h4 style={{color: '#888', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px'}}>System Logs</h4>
                        {status.logs && status.logs.length > 0 ? (
                            status.logs.map((log, i) => (
                                <div key={i} style={{marginBottom: '5px', fontSize: '0.85rem', lineHeight: '1.4'}}>
                                    <span style={{color: '#666', marginRight: '10px', fontSize: '0.75rem'}}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span style={{color: log.message.toLowerCase().includes('error') ? '#ef4444' : (log.message.toLowerCase().includes('buy') || log.message.toLowerCase().includes('sell') ? '#fbbf24' : '#d1d5db')}}>
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{color: '#444', textAlign: 'center', marginTop: '20px'}}>Waiting for logs...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
