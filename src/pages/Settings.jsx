// File: src/pages/Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '../context/AuthContext';
import WalletBalance from '../components/WalletBalance';
import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { updateEmail as updateEmailApi } from '../api/account.js';

// 🚀 CONFIG: Centralized Exchange Data 
// Currently synced with Python Neo-Engine v25 (Coinbase Spot & Kraken Margin)
const AVAILABLE_EXCHANGES = [
  { id: 'coinbase', name: 'Coinbase Advanced', guide: "https://portal.cdp.coinbase.com/projects/api-keys" },
  { id: 'kraken', name: 'Kraken Pro', guide: "https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair-" },
  
  // 🔒 US-Friendly Exchanges (Backend Routing coming soon)
  // { id: 'gemini', name: 'Gemini ActiveTrader', guide: "https://support.gemini.com/hc/en-us/articles/360031080192-How-do-I-create-an-API-key" },
  // { id: 'binanceus', name: 'Binance.US', guide: "https://support.binance.us/hc/en-us/articles/360050181954-How-to-Create-an-API-Key" },
  
  // 🚫 OFFSHORE / NON-US (Do not enable for US citizens)
  // { id: 'bybit', name: 'Bybit (Non-US)', guide: "https://learn.bybit.com/bybit-guide/how-to-create-an-api-key/" },
  // { id: 'kucoin', name: 'KuCoin (Non-US)', guide: "https://www.kucoin.com/support/360015102174" },
  // { id: 'okx', name: 'OKX (Non-US)', guide: "https://www.okx.com/learn/how-to-create-an-api-key" },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { address, isConnected, chain } = useAccount();
  
  // Form State
  const [keys, setKeys] = useState({ apiKey: '', apiSecret: '', exchange: AVAILABLE_EXCHANGES[0].id });
  const [loading, setLoading] = useState(false);
  const [savedKeys, setSavedKeys] = useState([]);

  // ✉️ Change-email state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  // Local mirror of the email so the card updates immediately after a change,
  // without needing a full re-login (the auth context user is read-only here).
  const [emailShown, setEmailShown] = useState(user?.email || '');
  const [verifiedShown, setVerifiedShown] = useState(!!user?.isVerified);

  useEffect(() => {
    setEmailShown(user?.email || '');
    setVerifiedShown(!!user?.isVerified);
  }, [user?.email, user?.isVerified]);

  const handleSaveEmail = async () => {
    const next = newEmail.trim();
    if (!next) return;
    setEmailBusy(true);
    setEmailMsg('');
    try {
      const r = await updateEmailApi(next);
      setEmailShown(r.email || next);
      setVerifiedShown(false);
      // Keep the cached user in sync so the verify banner + other pages agree.
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u) { u.email = r.email || next; u.isVerified = false; localStorage.setItem('user', JSON.stringify(u)); }
      } catch { /* ignore */ }
      setEmailMsg(r.message || (r.sent ? 'Verification email sent to the new address.' : 'Email updated.'));
      setEditingEmail(false);
      setNewEmail('');
    } catch (e) {
      setEmailMsg(e?.response?.data?.message || e.message || 'Could not update email.');
    } finally {
      setEmailBusy(false);
    }
  };

  // 🚀 NEW: Dropdown State (for the Searchable Filter)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef(null); // Used to detect clicks outside

  // 1. Fetch Keys
  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/users/keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const keyList = Array.isArray(res.data) ? res.data : (res.data.keys || []);
      setSavedKeys(keyList);
    } catch (err) {
      console.log("No keys found.");
    }
  };

  useEffect(() => {
    fetchKeys();

    // 🚀 Logic to close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Save Keys
  const handleSaveKeys = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/users/keys`, 
        { ...keys },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ API Keys encrypted and saved successfully!");
      setKeys({ apiKey: '', apiSecret: '', exchange: AVAILABLE_EXCHANGES[0].id }); 
      fetchKeys(); 
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save keys: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete Keys
  const handleDeleteKey = async (exchangeName) => {
    if (!window.confirm(`Are you sure you want to disconnect ${exchangeName}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/users/keys/${exchangeName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchKeys();
    } catch (err) {
      alert("Failed to delete key");
    }
  };

  // 🚀 Filter Logic for the Dropdown
  const filteredOptions = AVAILABLE_EXCHANGES.filter(ex => 
    ex.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  // Helper to get current exchange name/guide
  const currentExchangeObj = AVAILABLE_EXCHANGES.find(ex => ex.id === keys.exchange) || AVAILABLE_EXCHANGES[0];

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-neutral-400 mt-2">Manage your profile, wallet connections, and exchange keys.</p>
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PROFILE */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span> User Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Username</label>
                <div className="text-lg text-white font-medium">{user?.username || 'Guest'}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Email</label>
                {!editingEmail ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg text-white font-medium">{emailShown || 'No Email Linked'}</span>
                    {emailShown && (
                      verifiedShown
                        ? <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ Verified</span>
                        : <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Unverified</span>
                    )}
                    <button
                      onClick={() => { setEditingEmail(true); setNewEmail(emailShown || ''); setEmailMsg(''); }}
                      className="text-xs text-emerald-400 hover:underline ml-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new@email.com"
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 outline-none"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEmail}
                        disabled={emailBusy || !newEmail.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg font-bold"
                      >
                        {emailBusy ? 'Saving…' : 'Save & verify'}
                      </button>
                      <button
                        onClick={() => { setEditingEmail(false); setNewEmail(''); setEmailMsg(''); }}
                        className="text-sm text-neutral-400 hover:text-white px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500">A verification link will be sent to the new address. Trade alerts only go to verified emails.</p>
                  </div>
                )}
                {emailMsg && <p className="text-xs text-emerald-300/90 mt-2">{emailMsg}</p>}
              </div>
            </div>
          </div>

          {/* WALLET */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">🦊</span> Web3 Wallet
            </h2>
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center h-40 gap-4">
                <p className="text-neutral-400">No wallet connected.</p>
                <ConnectButton />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                    <span className="text-white">Connected</span>
                    <span className="text-xs text-neutral-500">({chain?.name})</span>
                  </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Balance</label>
                    <div className="text-2xl font-bold text-white mt-1">
                       <WalletBalance />
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONNECTED EXCHANGES LIST */}
        {savedKeys.length > 0 && (
          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg">
             <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
               <span className="text-2xl">🔗</span> Connected Exchanges
             </h2>
             <div className="grid gap-4">
               {savedKeys.map((k, i) => (
                 <div key={i} className="flex items-center justify-between bg-black/40 border border-white/10 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                          {k.exchange?.charAt(0).toUpperCase()}
                       </div>
                       <div>
                          <div className="font-bold capitalize text-white">
                            {AVAILABLE_EXCHANGES.find(ex => ex.id === k.exchange)?.name || k.exchange}
                          </div>
                          <div className="text-xs text-neutral-500 font-mono">Key ending in ••••{k.last4 || '****'}</div>
                       </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteKey(k.exchange)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded transition"
                      title="Remove Key"
                    >
                      Disconnect
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* ADD NEW KEYS FORM */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg pb-12">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                <span className="text-2xl">🔑</span> Add Exchange Keys
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Keys are encrypted. We never display your secret key again.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveKeys} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               
               {/* 🚀 CUSTOM SEARCHABLE DROPDOWN (Combobox) */}
               <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm text-neutral-400 mb-1">Exchange</label>
                  
                  {/* The visible button looking like a select */}
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white cursor-pointer hover:border-purple-500 flex justify-between items-center"
                  >
                    <span>{currentExchangeObj.name}</span>
                    <span className="text-xs text-neutral-500">▼</span>
                  </div>

                  {/* The Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-[#2a2a2a] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                      {/* Search Bar inside dropdown */}
                      <input 
                        type="text"
                        placeholder="Search exchange..."
                        className="w-full bg-[#1a1a1a] p-3 text-sm text-white border-b border-white/10 focus:outline-none placeholder-neutral-500"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()} 
                      />
                      
                      {/* Scrollable List */}
                      <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                           <div className="p-3 text-sm text-neutral-500 text-center">No results found</div>
                        ) : (
                           filteredOptions.map((option) => (
                             <div 
                               key={option.id}
                               onClick={() => {
                                 setKeys({ ...keys, exchange: option.id });
                                 setIsDropdownOpen(false);
                                 setDropdownSearch(''); // clear search for next time
                               }}
                               className={`px-4 py-2 text-sm cursor-pointer hover:bg-purple-600/20 hover:text-purple-300 transition ${keys.exchange === option.id ? 'bg-purple-600/10 text-purple-400' : 'text-neutral-300'}`}
                             >
                               {option.name}
                             </div>
                           ))
                        )}
                      </div>
                    </div>
                  )}

                  <a href={currentExchangeObj.guide} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline mt-2 inline-block">
                    Get {currentExchangeObj.name} Guide ↗
                  </a>
               </div>

               {/* API KEY */}
               <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-400 mb-1">API Key</label>
                  <input 
                    type="text" 
                    placeholder="Public API Key"
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                    value={keys.apiKey}
                    onChange={(e) => setKeys({...keys, apiKey: e.target.value})}
                  />
               </div>
            </div>

            {/* API SECRET */}
            <div>
              <div className="flex justify-between">
                  <label className="block text-sm text-neutral-400">API Secret</label>
              </div>
              <input 
                type="password" 
                placeholder="Private API Secret"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                value={keys.apiSecret}
                onChange={(e) => setKeys({...keys, apiSecret: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !keys.apiKey || !keys.apiSecret}
              className="mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold w-full md:w-auto"
            >
              {loading ? 'Saving...' : 'Save API Keys'}
            </button>
          </form>
        </div>
        
        {/* DANGER ZONE */}
        <div className="border-t border-white/10 pt-8 mt-8">
           <h3 className="text-red-400 font-bold mb-4">Danger Zone</h3>
           <button onClick={logout} className="border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">
             Log Out of Session
           </button>
        </div>

      </div>
    </div>
  );
}
