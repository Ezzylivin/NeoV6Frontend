// File: src/pages/HelpCenter.jsx
import React, { useState } from "react";
import { strategyDefinitions } from "../config/strategyConfig.js"; 
import { 
    HelpCircle, Book, Zap, ShieldAlert, Cpu, 
    ChevronDown, ChevronUp, Search, ExternalLink 
} from "lucide-react";
import "./HelpCenter.css"; // We will create this below

const HelpCenter = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeAccordion, setActiveAccordion] = useState(null);

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
            {/* 🔍 HEADER & SEARCH */}
            <div className="help-header">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <HelpCircle className="text-emerald-500 w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Command Center Support</h1>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Knowledge Base & System Documentation</p>
                    </div>
                </div>

                <div className="search-wrapper">
                    <Search className="search-icon" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search strategies, risk protocols, or setup guides..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="help-search"
                    />
                </div>
            </div>

            <div className="help-grid">
                {/* 🧠 1. STRATEGY GLOSSARY (Dynamic from Config) */}
                <section className="help-section">
                    <div className="section-title">
                        <Cpu size={18} className="text-violet-500" />
                        <h2>Strategy Module Glossary</h2>
                    </div>
                    <div className="strategy-glossary-grid">
                        {Object.keys(strategyDefinitions).map((key) => (
                            <div key={key} className="glossary-card">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-emerald-400 font-black uppercase text-xs">{strategyDefinitions[key].title}</h3>
                                    <span className="text-[9px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase font-black">Module</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                                    {strategyDefinitions[key].whatItIs}
                                </p>
                                <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                                    <h4 className="text-[9px] font-black uppercase text-zinc-500 mb-1">How it trades:</h4>
                                    <p className="text-[10px] text-zinc-300 italic">{strategyDefinitions[key].howItWorks}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ❓ 2. FAQ ACCORDION */}
                <section className="help-sidebar">
                    <div className="section-title">
                        <Book size={18} className="text-blue-500" />
                        <h2>Protocol FAQ</h2>
                    </div>
                    <div className="space-y-4">
                        {faqData.map((cat, catIdx) => (
                            <div key={catIdx} className="faq-category">
                                <div className="flex items-center gap-2 mb-3 ml-2">
                                    {cat.icon}
                                    <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{cat.category}</h3>
                                </div>
                                {cat.questions.map((q, qIdx) => {
                                    const index = `${catIdx}-${qIdx}`;
                                    return (
                                        <div key={index} className={`faq-item ${activeAccordion === index ? 'active' : ''}`}>
                                            <button onClick={() => toggleAccordion(index)} className="faq-question">
                                                <span>{q.q}</span>
                                                {activeAccordion === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            {activeAccordion === index && (
                                                <div className="faq-answer">
                                                    {q.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="support-cta">
                        <h3 className="text-xs font-black uppercase mb-2">Still need assistance?</h3>
                        <button className="cta-button">
                            <ExternalLink size={14} />
                            Open Documentation
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HelpCenter;
