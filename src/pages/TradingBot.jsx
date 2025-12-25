// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v7.0 - Final Golden Copy
// 🛠 Features: Full User Flow (Wallet -> PreFlight -> Command Console)

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import DeskLayout from "../components/layouts/DeskLayout";
import "./TradingBot.css";
import "../styles/Themes.css";

// --- MODALS (Wallet, Mode, Pre-Flight) ---

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
                    <CheckItem label={`Capital ($${config.capitalAllocation})`} status={checks.capital} />
                    <CheckItem label={`Logic (${config.strategies.length} Modules)`} status={checks.strategy} />
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-1 py-3 rounded-lg font-bold text-black transition flex justify-center items-center gap-2 ${allPassed ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>
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

    if (!isConnected) return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#111] p-8 rounded-2xl border border-white/10 text-center max-w-md">
                <div className="text-4xl mb-4">🦊</div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                <div className="flex justify-center mt-6"><ConnectButton /></div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="max-w-5xl w-full p-6 text-center">
                {step === 'selection' && (
                    <>
                        <h1 className="text-3xl font-bold text-white mb-2">TRADING ENVIRONMENT</h1>
                        <p className="text-neutral-500 mb-10 text-sm">SELECT YOUR OPERATIONAL MODE</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            <div onClick={() => setStep('paper_setup')} className="group cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-emerald-500/50 p-8 rounded-xl transition-all">
                                <h3 className="text-xl font-bold text-emerald-400 mb-2">Paper Trading</h3>
                                <p className="text-neutral-400 text-sm">Simulate trades with virtual capital.</p>
                            </div>
                            <div onClick={() => { if (hasApiKeys) onSelect('live', null); else toast.error("Add API Keys first!"); }} className={`group p-8 rounded-xl border transition-all ${hasApiKeys ? 'cursor-pointer bg-[#0a0a0a] border-white/10 hover:border-red-500/50' : 'bg-neutral-900/50 border-white/5 opacity-50 cursor-not-allowed'}`}>
                                <h3 className="text-xl font-bold text-red-500 mb-2">Live Trading</h3>
                                <p className="text-neutral-400 text-sm">Execute real orders. Capital at risk.</p>
                            </div>
                        </div>
                    </>
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

// --- MAIN PAGE ---

const TradingBotContainer = () => {
  const { botStatus, logs, loading: botLoading, startBot, stopBot } = useBot();
  const { setups } = useBacktestSetupFunction();
  const { isConnected, address } = useAccount();

  const [isModeSelected, setIsModeSelected] = useState(false);
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [formConfig, setFormConfig] = useState({
    strategyId: "", symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
    tradingMode: "paper", strategies: [], mlMode: "off", mlModel: "", mlThreshold: 0.5,
    riskManagementMode: "static", riskPercentage: 1, hybridMode: "AND",
    growthCapitalTarget: 2000, maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20,
  });

  const [liveWinners, setLiveWinners] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [scanningWinners, setScanningWinners] = useState(false);

  // --- DROPDOWN OPTIONS (Passed Down) ---
  const symbolOptions = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "BNB-USD", "ADA-USD"];
  const timeframeOptions = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const modelOptions = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" },
    { id: "sol_15m_lstm", name: "SOL 15m LSTM" }
  ];

  // --- EFFECTS ---
  useEffect(() => {
    if (isConnected) {
        axios.get('https://neov6backend.onrender.com/api/users/keys', { 
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
        }).then(res => {
            const keys = Array.isArray(res.data) ? res.data : (res.data.keys || []);
            setHasApiKeys(keys.length > 0);
        }).catch(() => setHasApiKeys(false));
    }
  }, [isConnected]);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setLiveWinners(Array.isArray(res.data) ? res.data : []);
        toast.success("Strategies Refreshed");
      } catch (err) { toast.error("Failed to load alpha files"); }
      finally { setScanningWinners(false); }
  };
  useEffect(() => { if (isConnected) fetchWinners(); }, [isConnected]);

  // --- HANDLERS ---
  const handleModeSelection = (mode, balance) => {
    setFormConfig(prev => ({ ...prev, tradingMode: mode, capitalAllocation: mode === 'paper' ? balance : prev.capitalAllocation }));
    setIsModeSelected(true);
  };

  const handleSetupSelect = (e) => {
    const val = e.target.value; setSelectedSetupId(val); setSelectedWinnerId(""); 
    const setup = setups.find((s) => s._id === val);
    if (setup) {
      setFormConfig((prev) => ({
        ...prev, strategyId: val, symbol: setup.symbol, timeframe: setup.timeframe,
        strategies: (setup.strategies || []).map(s => ({ code: s.code || s.name, params: s.params || {} })),
        mlMode: setup.mlMode || "off"
      }));
    }
  };

  const handleWinnerSelect = (e) => {
    const val = e.target.value; setSelectedWinnerId(val); setSelectedSetupId(""); 
    const winner = liveWinners.find((w) => (w.botId || w.id) === val);
    if (winner) {
        const config = winner.config || {};
        const params = config.params || config.comboConfig || {};
        
        setFormConfig((prev) => ({
            ...prev, strategyId: "", symbol: winner.symbol, 
            strategies: (config.strategies || []).map(s => ({ code: s.code || "unknown", params: s.params || {} })),
            mlMode: config.mlMode || "off",
            hybridMode: params.hybridMode || "AND",
            riskPercentage: config.riskPercentage || 1,
            mlModel: config.mlModel || prev.mlModel,
            riskManagementMode: config.riskManagementMode || prev.riskManagementMode
        }));
        toast.success(`Loaded: ${winner.symbol}`);
    }
  };

  const handleConfirmStart = async () => {
    setIsStarting(true);
    try {
        await startBot({ 
            ...formConfig, userId: address, 
            comboConfig: { strategyCodes: formConfig.strategies.map(s => s.code), combinationRule: formConfig.hybridMode } 
        });
        setShowPreFlight(false);
        toast.success("Bot Started!");
    } catch (err) { toast.error("Start Failed: " + err.message); }
    finally { setIsStarting(false); }
  };

  const patchedStatus = {
      ...botStatus,
      currentPosition: botStatus?.activePosition || botStatus?.currentPosition || null,
      positions: botStatus?.activePositions || []
  };

  return (
    <UIModeProvider>
      <div className="trading-bot-root relative">
        <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
        
        {!isModeSelected && <ModeSelectionModal onSelect={handleModeSelection} isConnected={isConnected} hasApiKeys={hasApiKeys} />}
        {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

        <div className={`transition-all duration-500 ${!isModeSelected || showPreFlight ? 'filter blur-sm pointer-events-none' : ''}`}>
            {isModeSelected && (
                <DeskLayout 
                    formConfig={formConfig} setFormConfig={setFormConfig}
                    setups={setups} liveWinners={liveWinners}
                    selectedSetupId={selectedSetupId} handleSetupSelect={handleSetupSelect}
                    selectedWinnerId={selectedWinnerId} handleWinnerSelect={handleWinnerSelect}
                    scanningWinners={scanningWinners} fetchWinners={fetchWinners}
                    
                    symbolOptions={symbolOptions} timeframeOptions={timeframeOptions} modelOptions={modelOptions}

                    isRunning={botStatus?.status === 'running'}
                    botLoading={botLoading}
                    handleStart={(e) => { e.preventDefault(); setShowPreFlight(true); }} 
                    handleStop={stopBot}
                    handleClearLogs={() => {}}
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
