// File: src/pages/Backtest.jsx
// 🚀 UPGRADE: v40.0 - "Universal Loader" (Live File Scanning for Backtests)

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; // DB Setups
import ChartIndependent from "../components/ChartIndependent.jsx"; // Or ChartIndependent if you prefer
import "./Backtest.css"; // Ensure this exists

export default function Backtest() {
    const { 
        runBacktest, backtestResult, loading, error, 
        saveSetup, 
    } = useBacktest();

    const { setups } = useBacktestSetupFunction(); // DB Saved Setups

    // 🚀 LIVE STATE FOR WINNERS (Server Files)
    const [liveWinners, setLiveWinners] = useState([]);
    const [scanningWinners, setScanningWinners] = useState(false);

    // Form State
    const [config, setConfig] = useState({
        symbol: "BTC-USD",
        timeframe: "1h",
        startDate: "2023-01-01",
        endDate: new Date().toISOString().split('T')[0],
        initialBalance: 1000,
        fee: 0.001,
        isCombo: false,
        strategies: [],
        comboConfig: { combinationRule: 'OR' }, // Default
        mlMode: "off",
        mlModel: "",
        mlThreshold: 0.5,
        params: {
            riskManagementMode: "standard",
            riskPercentage: 1,
            maxPyramiding: 1,
            tslAtrMult: 0
        }
    });

    const [selectedSetupId, setSelectedSetupId] = useState("");
    const [selectedWinnerId, setSelectedWinnerId] = useState("");

    // 🚀 1. FETCH WINNERS FROM DISK (The Universal Scanner)
    const fetchWinners = async () => {
        setScanningWinners(true);
        try {
            const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners");
            if (res.data) setLiveWinners(res.data);
        } catch (err) {
            console.error("Failed to load winners:", err);
        } finally {
            setScanningWinners(false);
        }
    };

    // Load winners on mount
    useEffect(() => { fetchWinners(); }, []);

    // 🚀 2. HANDLE WINNER SELECTION (The Universal Adapter)
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        setSelectedSetupId(""); 

        const selectedWinner = liveWinners.find(w => w.id === filename);
        if (selectedWinner && selectedWinner.config) {
            const data = selectedWinner.config;
            console.log("🏆 Backtest Loader - Selected Config:", data);

            // 1. Core Params
            let symbol = data.symbol || "BTC-USD";
            let timeframe = data.timeframe || "1h";

            // Fallback: Parse Filename if config is legacy
            if(!data.symbol && filename.includes('_')) {
                 const parts = filename.split('_');
                 if(parts[1]) symbol = parts[1];
                 if(parts[2] && ['1h','4h','1d','15m'].includes(parts[2])) timeframe = parts[2];
            }

            // 2. Strategies Normalization
            let strategies = [];
            if(Array.isArray(data.strategies)) strategies = data.strategies;
            else if(Array.isArray(data)) strategies = data;
            
            strategies = strategies.map(s => {
                if (typeof s === 'string') return { code: s, params: {} };
                return {
                    code: s.code || s.trend_strategy || "unknown",
                    params: s.params || s
                };
            });

            // 3. ML Config
            let mlMode = data.mlMode || "off";
            let mlModel = data.mlModel || "";
            if(data.params?.mlModel) mlModel = data.params.mlModel;
            if(mlModel && mlMode === "off") mlMode = "predictions";

            // 4. Global Params & Risk
            const globalParams = data.params || {};
            if (data.riskManagementMode) globalParams.riskManagementMode = data.riskManagementMode;
            if (data.riskPercentage) globalParams.riskPercentage = data.riskPercentage;
            if (data.maxPyramiding) globalParams.maxPyramiding = data.maxPyramiding;

            // 5. Update State
            setConfig(prev => ({
                ...prev,
                symbol,
                timeframe,
                isCombo: true,
                strategies: strategies,
                comboConfig: { combinationRule: globalParams.hybridMode || 'OR' },
                mlMode,
                mlModel: mlModel || 'btc_1h_xgboost_model',
                mlThreshold: data.mlThreshold || 0.5,
                params: { ...prev.params, ...globalParams }
            }));
        }
    };

    // 🚀 3. HANDLE DB SETUP SELECTION
    const handleSetupSelect = (e) => {
        const setupId = e.target.value;
        setSelectedSetupId(setupId);
        setSelectedWinnerId("");

        const setup = setups.find(s => s._id === setupId);
        if (setup) {
            // Apply Setup to Config
            setConfig(prev => ({
                ...prev,
                symbol: setup.symbol,
                timeframe: setup.timeframe,
                initialBalance: setup.initialBalance || 1000,
                isCombo: setup.isCombo || (setup.strategies && setup.strategies.length > 1),
                strategies: setup.strategies || [],
                comboConfig: setup.comboConfig || { combinationRule: 'OR' },
                params: setup.params || {},
                mlMode: setup.mlMode || 'off',
                mlModel: setup.mlModel || '',
                mlThreshold: setup.mlThreshold || 0.5
            }));
        }
    };

    const handleRun = async (e) => {
        e.preventDefault();
        try {
            await runBacktest(config);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="backtest-container" style={{padding:'30px', background:'#0b0f19', color:'#e2e8f0', minHeight:'100vh'}}>
            <h2 className="header">Strategy Backtester</h2>

            {/* CONTROL PANEL */}
            <div className="bot-card control-panel">
                <div className="panel-header">
                    <h3 className="card-title">Configuration</h3>
                </div>

                <form onSubmit={handleRun} className="bot-form">
                    
                    {/* 🚀 LOADERS ROW */}
                    <div className="selectors-row">
                        <label className="setup-selector">
                            Load Strategy (Database)
                            <select value={selectedSetupId} onChange={handleSetupSelect}>
                                <option value="">-- Select Saved Setup --</option>
                                {setups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </label>

                        {/* 🚀 FILE SCANNER */}
                        <label className="setup-selector" style={{position: 'relative'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>Load Alpha (Data Folder)</span>
                                <button 
                                    type="button" 
                                    onClick={fetchWinners} 
                                    disabled={scanningWinners}
                                    style={{background:'none', border:'none', cursor:'pointer', color:'#4ade80', fontSize:'0.8rem'}}
                                >
                                    {scanningWinners ? 'Scanning...' : '🔄 Scan'}
                                </button>
                            </div>
                            <select value={selectedWinnerId} onChange={handleWinnerSelect} style={{borderColor: selectedWinnerId ? '#3b82f6' : '#444'}}>
                                <option value="">-- Select File from Disk --</option>
                                {liveWinners.map(w => <option key={w.id} value={w.id}>🏆 {w.name}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className="form-grid">
                        <label>Symbol<input value={config.symbol} onChange={e => setConfig({...config, symbol: e.target.value.toUpperCase()})} /></label>
                        <label>Timeframe
                            <select value={config.timeframe} onChange={e => setConfig({...config, timeframe: e.target.value})}>
                                <option value="1m">1m</option>
                                <option value="5m">5m</option>
                                <option value="15m">15m</option>
                                <option value="1h">1h</option>
                                <option value="4h">4h</option>
                                <option value="1d">1d</option>
                            </select>
                        </label>
                        <label>Initial Capital<input type="number" value={config.initialBalance} onChange={e => setConfig({...config, initialBalance: Number(e.target.value)})} /></label>
                    </div>

                    <div className="form-grid">
                        <label>Start Date<input type="date" value={config.startDate} onChange={e => setConfig({...config, startDate: e.target.value})} /></label>
                        <label>End Date<input type="date" value={config.endDate} onChange={e => setConfig({...config, endDate: e.target.value})} /></label>
                        <label>Risk %<input type="number" value={config.params.riskPercentage} onChange={e => setConfig({...config, params: {...config.params, riskPercentage: Number(e.target.value)}})} /></label>
                    </div>

                    <div style={{marginTop: '20px'}}>
                        <button type="submit" className="button-start" disabled={loading} style={{width:'100%'}}>
                            {loading ? 'Running Simulation...' : '▶ Run Backtest'}
                        </button>
                    </div>
                </form>
            </div>

            {/* RESULTS */}
            {error && <div className="error-banner">{error}</div>}

            {backtestResult && (
                <div className="bot-card results-panel" style={{marginTop:'30px'}}>
                    <h3 className="card-title">Backtest Results</h3>
                    
                    {/* Metrics Grid */}
                    <div className="metrics-grid" style={{marginBottom:'20px'}}>
                        <div className="metric-item">
                            <span className="metric-label">Total Return</span>
                            <span className="metric-value" style={{color: backtestResult.metrics.totalReturn >= 0 ? '#4ade80' : '#ef4444'}}>
                                {backtestResult.metrics.totalReturn.toFixed(2)}%
                            </span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Total Trades</span>
                            <span className="metric-value">{backtestResult.metrics.totalTrades}</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Win Rate</span>
                            <span className="metric-value">{backtestResult.metrics.winRate.toFixed(2)}%</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Max Drawdown</span>
                            <span className="metric-value" style={{color:'#ef4444'}}>{backtestResult.metrics.maxDrawdown.toFixed(2)}%</span>
                        </div>
                    </div>

                    {/* Chart */}
                    <div style={{height: '500px', background:'#161b28', borderRadius:'8px', overflow:'hidden'}}>
                        <BacktestChart data={backtestResult} />
                    </div>
                </div>
            )}
        </div>
    );
}
