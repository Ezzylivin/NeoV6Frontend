import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import TradingBotShell from "./TradingBotShell";
import "./TradingBot.css";
import "../styles/Themes.css";

const TradingBotContainer = () => {
  const { botStatus, logs, loading: botLoading, startBot, stopBot, refreshBotData } = useBot();
  const { setups } = useBacktestSetupFunction();
  const { isConnected, address } = useAccount();

  // --- Configuration State ---
  const [formConfig, setFormConfig] = useState({
    strategyId: "",
    symbol: "BTC-USD",
    timeframe: "1h",
    capitalAllocation: 1000,
    tradingMode: "paper",
    parameters: {}, // Unified storage for strategy params
    strategies: [],
    mlMode: "off",
    mlModel: "",
    mlThreshold: 0.5,
    riskManagementMode: "static",
    riskPercentage: 1,
    hybridMode: "AND",
    growthCapitalTarget: 2000,
    maxDailyLoss: 5,
    maxDrawdown: 10,
    maxTradesPerDay: 20,
  });

  // --- State for Dropdowns ---
  const [liveWinners, setLiveWinners] = useState([]);
  const [strategyOptions, setStrategyOptions] = useState([]);
  const [modelOptions] = useState([
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" }
  ]);
  const [symbolOptions] = useState(["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"]);
  const [timeframeOptions] = useState(["1m", "5m", "15m", "1h", "4h", "1d"]);
  
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // --- 1. Populate Strategy Dropdown ---
  useEffect(() => {
    if (setups && setups.length > 0) {
      setStrategyOptions(setups.map(s => ({
        id: s._id,
        name: s.name || `${s.symbol} ${s.timeframe} (Auto)`
      })));
    }
  }, [setups]);

  // --- 2. Fetch Winners (Optimizer Results) ---
  useEffect(() => {
    const fetchWinners = async () => {
      if (!isConnected) return;
      setLoadingDropdowns(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiveWinners(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchWinners();
  }, [isConnected]);

  // --- Handlers ---

  const handleSetupSelect = (e) => {
    const setupId = e.target.value;
    // Clear winner selection if DB strategy is picked
    setSelectedWinnerId(""); 
    
    const selectedSetup = setups.find((setup) => setup._id === setupId);
    if (selectedSetup) {
      setFormConfig((prev) => ({
        ...prev,
        strategyId: setupId,
        symbol: selectedSetup.symbol || "BTC-USD",
        timeframe: selectedSetup.timeframe || "1h",
        parameters: selectedSetup.params || {},
        strategies: selectedSetup.strategies || [],
        mlMode: selectedSetup.mlMode || "off"
      }));
    } else {
        // Handle reset
        setFormConfig(prev => ({ ...prev, strategyId: "" }));
    }
  };

  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    if (!winnerId) return;

    setSelectedWinnerId(winnerId);
    
    // Logic: Find file by botId (new) or id (legacy)
    const selectedWinner = liveWinners.find((w) => (w.botId || w.id) === winnerId);
    
    if (selectedWinner) {
        // Extract config payload safely
        const config = selectedWinner.config || {};
        
        setFormConfig((prev) => ({
            ...prev,
            // Clear DB strategy ID because we are using a file now
            strategyId: "", 
            symbol: selectedWinner.symbol || prev.symbol,
            strategies: config.strategies || [],
            // 🛠 FIX: Map 'params' from file to 'parameters' in form
            parameters: config.params || config.comboConfig || {}, 
            mlMode: config.mlMode || "off",
            riskPercentage: config.riskPercentage || prev.riskPercentage,
            // Spread strictly defined keys to avoid pollution
            mlModel: config.mlModel || prev.mlModel,
            riskManagementMode: config.riskManagementMode || prev.riskManagementMode
        }));

        toast.success(`Loaded: ${selectedWinner.symbol} (ROI: ${(selectedWinner.roi * 100).toFixed(0)}%)`, {
            icon: '📂'
        });
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleStart = async () => {
    if (!address) return toast.error("Wallet not connected");
    try {
        // Send 'parameters' as 'params' to backend
        const payload = {
            ...formConfig,
            params: formConfig.parameters, 
            userId: address
        };
        await startBot(payload);
        toast.success("Bot Started Successfully!");
    } catch (e) {
        toast.error("Failed to start bot: " + (e.response?.data?.message || e.message));
    }
  };

  // --- Render Prep ---
  const isRunning = botStatus?.status === 'running';
  
  const chartData = useMemo(() => ({
    candleData: botStatus?.candles || [],
    tradeBreakdown: (botStatus?.trades || []).map(t => ({
        ...t,
        price: t.entry_price || t.price,
        exitPrice: t.exit_price || t.exitPrice
    }))
  }), [botStatus]);

  const patchedStatus = {
      ...botStatus,
      currentPosition: botStatus?.activePosition || botStatus?.currentPosition || null,
      positions: botStatus?.activePositions || []
  };

  const activeStrategyName = selectedWinnerId 
    ? (liveWinners.find(w => (w.botId || w.id) === selectedWinnerId)?.symbol + " (File)")
    : (setups.find(s => s._id === formConfig.strategyId)?.name || "Manual Config");

  return (
    <div className="trading-bot-root">
      <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />

      {/* --- MISSION CONTROL PANEL --- */}
      <div className="form-container" style={{ padding: '20px', background: '#111', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#10b981', margin: 0 }}>Mission Control</h3>
            <span style={{ fontSize: '0.8rem', color: '#666', background: '#222', padding: '4px 8px', borderRadius: '4px' }}>
                Active: <span style={{ color: '#fff' }}>{activeStrategyName}</span>
            </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            
            {/* 1. Optimizer Results (Priority) */}
            <div className="form-group">
            <label htmlFor="selectedWinnerId" style={{color: '#f59e0b'}}>Load Alpha File</label>
            <select
                name="selectedWinnerId"
                id="selectedWinnerId"
                value={selectedWinnerId}
                onChange={handleWinnerSelect}
                className="form-input"
                disabled={loadingDropdowns || isRunning}
                style={{borderColor: selectedWinnerId ? '#f59e0b' : ''}}
            >
                <option value="">-- Browse Results --</option>
                {liveWinners.map((winner) => {
                    const id = winner.botId || winner.id;
                    const roi = winner.roi ? (winner.roi * 100).toFixed(0) : 0;
                    return (
                        <option key={id} value={id}>
                            {winner.symbol} | ROI: {roi}%
                        </option>
                    );
                })}
            </select>
            </div>

            {/* 2. Database Strategy */}
            <div className="form-group">
            <label htmlFor="strategyId">Load Saved Strategy</label>
            <select
                name="strategyId"
                id="strategyId"
                value={formConfig.strategyId}
                onChange={handleSetupSelect}
                className="form-input"
                disabled={isRunning || !!selectedWinnerId} // Disable if file selected
            >
                <option value="">-- Database --</option>
                {strategyOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            </div>

            {/* 3. Standard Inputs */}
            <div className="form-group">
            <label>Symbol</label>
            <select name="symbol" value={formConfig.symbol} onChange={handleFormChange} className="form-input" disabled={isRunning}>
                {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            </div>

            <div className="form-group">
            <label>Timeframe</label>
            <select name="timeframe" value={formConfig.timeframe} onChange={handleFormChange} className="form-input" disabled={isRunning}>
                {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            </div>

            <div className="form-group">
            <label>Risk Mode</label>
            <select name="riskManagementMode" value={formConfig.riskManagementMode} onChange={handleFormChange} className="form-input" disabled={isRunning}>
                <option value="static">Static</option>
                <option value="dynamic">Dynamic</option>
            </select>
            </div>

            <div className="form-group">
            <label>ML Mode</label>
            <select name="mlMode" value={formConfig.mlMode} onChange={handleFormChange} className="form-input" disabled={isRunning}>
                <option value="off">Off</option>
                <option value="predictions">Hybrid</option>
                <option value="on">Pure ML</option>
            </select>
            </div>

            <div className="form-group">
            <label>ML Model</label>
            <select name="mlModel" value={formConfig.mlModel} onChange={handleFormChange} className="form-input" disabled={isRunning}>
                <option value="">-- None --</option>
                {modelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            </div>

            {/* Controls */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                {!isRunning ? (
                    <button onClick={handleStart} className="primary-btn" disabled={botLoading} style={{width: '100%', padding: '10px', fontWeight: 'bold'}}>
                        {botLoading ? "STARTING..." : "⏩ START BOT"}
                    </button>
                ) : (
                    <button onClick={stopBot} className="danger-btn" disabled={botLoading} style={{width: '100%', padding: '10px', fontWeight: 'bold'}}>
                        ⏹ STOP BOT
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* --- TRADING SHELL --- */}
      <div style={{ height: 'calc(100vh - 220px)' }}>
        <TradingBotShell 
            botStatus={patchedStatus}
            logs={logs}
            chartData={chartData}
            isRunning={isRunning}
            hasData={chartData.candleData.length > 0}
            formConfig={formConfig}
            setFormConfig={setFormConfig}
            handleStart={handleStart} 
            handleStop={stopBot}
        />
      </div>
    </div>
  );
};

export default function TradingBot() {
  return (
    <UIModeProvider>
      <TradingBotContainer />
    </UIModeProvider>
  );
}
