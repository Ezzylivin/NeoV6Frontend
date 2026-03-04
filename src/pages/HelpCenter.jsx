// File: src/pages/HelpCenter.jsx
import React, { useState, useEffect } from "react";
import { strategyDefinitions } from "../config/strategyConfig.js"; 
import { 
    HelpCircle, Book, Zap, ShieldAlert, Cpu, 
    ChevronDown, ChevronUp, Search, ExternalLink, Activity
} from "lucide-react";
import "./HelpCenter.css";

const HelpCenter = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [systemStatus, setSystemStatus] = useState({ engine: "OPERATIONAL", latency: "42ms" });

    const toggleAccordion = (index) => {
        setActiveAccordion(activeAccordion === index ? null : index);
    };

    const faqData = [
        {
            category: "Getting Started",
            icon: <Zap size={18} className="text-emerald-500" />,
            questions: [
                { q: "What is Paper Trading?", a: "Paper trading allows you to run your AI bot with real-time market data using simulated balance. It is the best way to test strategies without risking capital." },
                { q: "How do I connect my Wallet?", a: "Use the 'Connect' button in the header. We support RainbowKit and Wagmi for secure, decentralized access." }
            ]
        },
        {
            category: "Risk Management",
            icon: <ShieldAlert size={18} className="text-rose-500" />,
            questions: [
                { q: "What is Max Pyramiding?", a: "This limits the number of concurrent 'legs' or positions the bot can open for a single trend. Max 5 is recommended for high-conviction moves." },
                { q: "How does the Trailing Stop work?", a: "The trailing stop follows the price as it moves in your favor. If the price reverses by your specified %, the position is closed to lock in profits." }
            ]
        }
    ];

    return (
        <div className="help-container animate-in fade-in duration-700">
            {/* 🔍 HEADER & SYSTEM STATUS */}
            <div className="help-header flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <HelpCircle className="text-emerald-500 w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Command Center Support</h1>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Knowledge Base & System Documentation</p>
                    </div>
                </div>

                {/* 🟢 SYSTEM HEALTH BADGE */}
                <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl shadow-xl">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Backend Mesh</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-mono font-black text-emerald-500">{systemStatus.engine}</span>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-zinc-800"></div>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Latency</span>
                        <span className="text-[10px] font-mono font-black text-zinc-200">{systemStatus.latency}</span>
                    </div>
                </div>
            </div>

            <div className="search-wrapper mb-12">
                <Search className="search-icon" size={16} />
                <input 
                    type="text" 
                    placeholder="Search strategies, risk protocols, or setup guides..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="help-search"
                />
            </div>

            {/* 🚀 PLATFORM OPERATIONS GUIDE */}
            <section className="mb-16">
                <div className="section-title mb-8">
                    <Activity size={18} className="text-emerald-500" />
                    <h2 className="text-zinc-500 font-black uppercase text-xs tracking-widest">Platform Operations Guide</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="guide-card bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                        <div className="text-4xl font-black text-emerald-500 opacity-10 absolute -right-2 -top-2">01</div>
                        <h3 className="text-sm font-black text-white uppercase mb-3">Connect & Auth</h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">Connect your Web3 wallet via the header. This establishes your unique Neural Link with the Render backend for secure execution.</p>
                    </div>
                    <div className="guide-card bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                        <div className="text-4xl font-black text-emerald-500 opacity-10 absolute -right-2 -top-2">02</div>
                        <h3 className="text-sm font-black text-white uppercase mb-3">Configure Engine</h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">Select your asset and timeframe. Choose 'Paper' for testing or 'Live' for margin. Toggle your ML Gate and Risk Protocols before ignition.</p>
                    </div>
                    <div className="guide-card bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                        <div className="text-4xl font-black text-emerald-500 opacity-10 absolute -right-2 -top-2">03</div>
                        <h3 className="text-sm font-black text-white uppercase mb-3">Monitor Flow</h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">Once ignited, monitor the 'Neural Flow' terminal. Green logs represent passed logic gates; red logs indicate vetoed signals.</p>
                    </div>
                </div>
            </section>

            <div className="help-grid">
                {/* 🧠 1. STRATEGY GLOSSARY */}
                <section className="help-section">
                    <div className="section-title flex items-center gap-2 mb-6">
                        <Cpu size={18} className="text-violet-500" />
                        <h2 className="text-zinc-500 font-black uppercase text-xs tracking-widest">Strategy Module Glossary</h2>
                    </div>
                    <div className="strategy-glossary-grid grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {Object.keys(strategyDefinitions).map((key) => (
                            <div key={key} className="glossary-card bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-emerald-400 font-black uppercase text-xs tracking-tighter">{strategyDefinitions[key].title}</h3>
                                    <span className="text-[8px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 uppercase font-black tracking-widest">Logic Layer</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
                                    {strategyDefinitions[key].whatItIs}
                                </p>
                                <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                                    <h4 className="text-[9px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Operational Logic:</h4>
                                    <p className="text-[10px] text-zinc-300 italic font-medium leading-relaxed">{strategyDefinitions[key].howItWorks}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ❓ 2. FAQ ACCORDION */}
                <section className="help-sidebar flex flex-col gap-8">
                    <div>
                        <div className="section-title flex items-center gap-2 mb-6">
                            <Book size={18} className="text-blue-500" />
                            <h2 className="text-zinc-500 font-black uppercase text-xs tracking-widest">Protocol FAQ</h2>
                        </div>
                        <div className="space-y-3">
                            {faqData.map((cat, catIdx) => (
                                <div key={catIdx} className="faq-category">
                                    <h3 className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-3 ml-1">{cat.category}</h3>
                                    {cat.questions.map((q, qIdx) => {
                                        const index = `${catIdx}-${qIdx}`;
                                        return (
                                            <div key={index} className={`faq-item mb-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all ${activeAccordion === index ? 'border-zinc-600 shadow-lg' : ''}`}>
                                                <button onClick={() => toggleAccordion(index)} className="w-full p-4 flex justify-between items-center text-left hover:bg-white/5 transition-all">
                                                    <span className="text-[11px] font-black text-zinc-300 uppercase tracking-tighter">{q.q}</span>
                                                    {activeAccordion === index ? <ChevronUp size={14} className="text-emerald-500" /> : <ChevronDown size={14} className="text-zinc-600" />}
                                                </button>
                                                {activeAccordion === index && (
                                                    <div className="px-4 pb-4 text-[10px] text-zinc-500 leading-relaxed font-medium animate-in slide-in-from-top-2 duration-300">
                                                        {q.a}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="support-cta bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[32px] text-center">
                        <h3 className="text-xs font-black uppercase mb-3 text-zinc-200 tracking-tighter">System Anomalies?</h3>
                        <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed">If you encounter unexpected engine behavior, please transmit a support ticket to our neural team.</p>
                        <button className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-lg flex items-center justify-center gap-2">
                            <ExternalLink size={14} />
                            Transmit Ticket
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HelpCenter;
