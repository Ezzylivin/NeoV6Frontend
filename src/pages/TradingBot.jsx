// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v7.0 - Full User Flow Restored (Wallet -> Mode -> PreFlight -> Command)

import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import DeskLayout from "../components/layouts/DeskLayout";
import "./TradingBot.css";
import "../styles/Themes.css";

// --- 1. MODAL COMPONENTS (Restored) ---

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, hasApiKeys, address }) => {
    const [checks, setChecks] = useState({ wallet: false, keys: false, capital: false, strategy: false });

    useEffect(() => {
        setChecks({
            wallet: !!address,
            keys: config.tradingMode === 'paper' || hasApiKeys,
            capital: Number(config.capitalAllocation) >= 100,
            strategy: (config.strategies && config.strategies.length > 0)
        });
    }, [config, hasApiKeys, address]);

    const allPassed = Object.values(checks).every(Boolean);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-emerald-500">🚀</span> Pre-Flight Check
                </h3>
                
                <div className="space-y-3 mb-8">
                    <CheckItem label="Wallet Connection" status={checks.wallet} />
                    <CheckItem label={config.tradingMode === 'live' ? "API Keys (Required)" : "API Keys (Optional)"} status={checks.keys} />
                    <CheckItem label={`Capital Allocation ($${config.capitalAllocation})`} status={checks.capital} />
                    <CheckItem label={`Active Logic (${config.strategies.length} Modules)`} status={checks.strategy} />
                </div>

                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition">
                        Abort
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={!allPassed || isStarting}
                        className={`flex-1 py-3 rounded-lg font-bold text-black transition flex justify-center items-center gap-2 ${allPassed ? 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}
                    >
                        {isStarting ? 'Igniting...' : 'LAUNCH BOT'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CheckItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5">
        <span className="text-sm text-neutral-300">{label}</span>
        {status ? <span className="text-green-500 font-bold text-xs">✔ OK</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}
    </div>
);

const ModeSelectionModal = ({ onSelect, isConnected, hasApiKeys }) => {
    const [step, setStep] = useState('selection');
    const [paperBalance, setPaperBalance] = useState(10000);
    const navigate = useNavigate();

    if (!isConnected) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
                <div className="bg-[#111] p-8 rounded-2xl border border-white/10 text-center max-w-md">
                    <div className="text-4xl mb-4">🦊</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                    <p className="text-neutral-400 mb-6 text-sm">Access to the Neural Command Deck requires verification.</p>
                    <div className="flex justify-center"><ConnectButton /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="max-w-5xl w-full p-6">
                {step === 'selection' && (
                    <div className="text-center">
                         <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">TRADING ENVIRONMENT</h1>
                         <p className="text-neutral-500 mb-10 text-sm">SELECT YOUR OPERATIONAL MODE</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            <div onClick={() => setStep('paper_setup')} className="group cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-emerald-500/50 p-8 rounded-xl transition-all duration-300 hover:bg-[#111]">
                                <h3 className="text-xl font-bold text-emerald-400 mb-2">Paper Trading</h3>
                                <p className="text-neutral-400 text-sm mb-4">Simulate trades with virtual capital. Zero risk.</p>
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Configure Simulation →</span>
                            </div>
                            <div 
                                onClick={() => { if (hasApiKeys) onSelect('live', null); else toast.error("Add API Keys in Settings first!"); }} 
                                className={`group p-8 rounded-xl border transition-all duration-300 ${hasApiKeys ? 'cursor-pointer bg-[#0a0a0a] border-white/10 hover:border-red-500/50 hover:bg-[#150505]' : 'bg-neutral-900/50 border-white/5 opacity-50 cursor-not-allowed'}`}
                            >
                                <h3 className={`text-xl font-bold mb-2 ${hasApiKeys ? 'text-red-500' : 'text-neutral-500'}`}>Live Trading</h3>
                                <p className="text-neutral-400 text-sm mb-4">Execute real orders. Capital at risk.</p>
                                {hasApiKeys ? (
                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Enter Danger Zone →</span>
                                ) : (
                                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">⚠ Keys Missing</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {step === 'paper_setup' && (
                    <div className="max-w-sm mx-auto bg-[#111] border border-white/10 p-8 rounded-xl">
                        <h3 className="text-xl font-bold text-white mb-4">Initial Balance</h3>
                        <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded p-3 text-xl text-white mb-6 focus:border-emerald-500 outline-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setStep('selection')} className="flex-1 py-3 text-neutral-400 hover:text-white">Back</button>
                            <button onClick={() => onSelect('paper', paperBalance)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded">Start</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 2. MAIN CONTAINER ---

const TradingBotContainer = () => {
  const { botStatus, logs, loading: botLoading, startBot, stopBot } = useBot();
  const { setups } = useBacktestSetupFunction();
  const { isConnected, address } = useAccount();

  // --- State ---
  const [isModeSelected, setIsModeSelected] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [formConfig, setFormConfig] = useState({
    strategyId: "",
    symbol: "BTC-USD",
    timeframe: "1h",
    capitalAllocation: 1000,
    tradingMode: "paper",
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

  const [liveWinners, setLiveWinners] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [scanningWinners, setScanningWinners] = useState(false);

  // --- Options ---
  const symbolOptions = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "BNB-USD", "ADA-USD"];
  const timeframeOptions = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const modelOptions = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" },
    { id: "sol_15m_lstm", name: "SOL 15m LSTM" }
  ];

  // --- Init Effects ---
  useEffect(() => {
    // Check for API Keys
    if (isConnected) {
        const checkKeys = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get('https://neov6backend.onrender.com/api/users/keys', { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                const keys = Array.isArray(res.data) ? res.data : (res.data.keys || []);
                setHasApiKeys(keys.length > 0);
            } catch (err) { setHasApiKeys(false); }
        };
        checkKeys();
    }
  }, [isConnected]);

  useEffect(() => {
    // Check Session
    const savedSession = sessionStorage.getItem('botSession');
    if (savedSession) {
        const { mode, balance } = JSON.parse(savedSession);
        setFormConfig(prev => ({ ...prev, tradingMode: mode, capitalAllocation: balance || prev.capitalAllocation }));
        setIsModeSelected(true);
    }
  }, []);

  useEffect(() => {
    // Fetch Winners
    const fetchWinners = async () => {
      if (!isConnected) return;
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiveWinners(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setScanningWinners(false);
      }
    };
    fetchWinners();
  }, [isConnected]);

  // --- Handlers ---

  const handleModeSelection = (mode, balance) => {
    const allocation = mode === 'paper' ? balance : formConfig.capitalAllocation;
    setFormConfig(prev => ({ ...prev, tradingMode: mode, capitalAllocation: allocation }));
    sessionStorage.setItem('botSession', JSON.stringify({ mode, balance: allocation }));
    setIsModeSelected(true);
  };

  const handleSetupSelect = (e) => {
    const setupId = e.target.value;
    setSelectedSetupId(setupId);
    setSelectedWinnerId(""); 

    const selectedSetup = setups.find((s) => s._id === setupId);
    if (selectedSetup) {
      setFormConfig((prev) => ({
        ...prev,
        strategyId: setupId,
        symbol: selectedSetup.symbol || "BTC-USD",
        timeframe: selectedSetup.timeframe || "1h",
        strategies: (selectedSetup.strategies || []).map(s => ({
            code: s.code || s.name,
            params: s.params || s.parameters || {}
        })),
        mlMode: selectedSetup.mlMode || "off"
      }));
    }
  };

  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    if (!winnerId) return;
    setSelectedWinnerId(winnerId);
    setSelectedSetupId(""); 

    const selectedWinner = liveWinners.find((w) => (w.botId || w.id) === winnerId);
    if (selectedWinner) {
        const config = selectedWinner.config || {};
        const safeStrategies = (config.strategies || []).map(s => ({
            code: s.code || "unknown",
            params: s.params || s.parameters || {}
        }));

        setFormConfig((prev) => ({
            ...prev,
            strategyId: "", 
            symbol: selectedWinner.symbol || prev.symbol,
            strategies: safeStrategies,
            mlMode: config.mlMode || "off",
            riskPercentage: config.riskPercentage || 1,
            mlModel: config.mlModel || prev.mlModel,
            riskManagementMode: config.riskManagementMode || prev.riskManagementMode
        }));
        toast.success(`Loaded: ${selectedWinner.symbol}`);
    }
  };

  // ✅ Trigger Pre-Flight instead of immediate start
  const handleStartClick = (e) => {
    if (e) e.preventDefault();
    if (!address) return toast.error("Wallet not connected");
    setShowPreFlight(true);
  };

  // ✅ Actual Start Logic (Called by Modal)
  const handleConfirmStart = async () => {
    setIsStarting(true);
    try {
        const payload = {
            ...formConfig,
            userId: address,
            comboConfig: {
                strategyCodes: formConfig.strategies.map(s => s.code),
                combinationRule: formConfig.hybridMode || 'AND'
            }
        };
        await startBot(payload);
        setShowPreFlight(false);
        toast.success("Bot Started Successfully!");
    } catch (err) {
        toast.error("Start Failed: " + err.message);
    } finally {
        setIsStarting(false);
    }
  };

  const handleClearLogs = () => { };

  const patchedStatus = {
      ...botStatus,
      currentPosition: botStatus?.activePosition || botStatus?.currentPosition || null,
      positions: botStatus?.activePositions || []
  };

  return (
    <UIModeProvider>
      <div className="trading-bot-root relative">
        <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
        
        {/* 1. WALL & MODE SELECTION */}
        {!isModeSelected && (
            <ModeSelectionModal 
                onSelect={handleModeSelection} 
                isConnected={isConnected} 
                hasApiKeys={hasApiKeys} 
            />
        )}

        {/* 2. PRE-FLIGHT CHECK */}
        {showPreFlight && (
            <PreFlightModal 
                config={formConfig} 
                onConfirm={handleConfirmStart} 
                onCancel={() => setShowPreFlight(false)} 
                isStarting={isStarting} 
                hasApiKeys={hasApiKeys} 
                address={address} 
            />
        )}

        {/* 3. COMMAND CENTER (Blurred if modal active) */}
        <div className={`transition-all duration-500 ${!isModeSelected || showPreFlight ? 'filter blur-sm pointer-events-none' : ''}`}>
            {isModeSelected && (
                <DeskLayout 
                    formConfig={formConfig} setFormConfig={setFormConfig}
                    setups={setups} liveWinners={liveWinners}
                    selectedSetupId={selectedSetupId} handleSetupSelect={handleSetupSelect}
                    selectedWinnerId={selectedWinnerId} handleWinnerSelect={handleWinnerSelect}
                    scanningWinners={scanningWinners} 
                    fetchWinners={async () => {
                        const token = localStorage.getItem("token");
                        const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
                        setLiveWinners(response.data || []);
                        toast.success("Refreshed");
                    }}
                    
                    symbolOptions={symbolOptions}
                    timeframeOptions={timeframeOptions}
                    modelOptions={modelOptions}

                    isRunning={botStatus?.status === 'running'}
                    botLoading={botLoading}
                    handleStart={handleStartClick} // Connects to Pre-Flight
                    handleStop={stopBot}
                    handleClearLogs={handleClearLogs}
                    botStatus={patchedStatus}
                    logs={logs}
                    visibleLogs={logs}
                />
            )}
        </div>
      </div>
    </UIModeProvider>
  );
};

export default TradingBotContainer;
