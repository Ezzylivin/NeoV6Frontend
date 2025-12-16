// File: src/pages/Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '../context/AuthContext';
import WalletBalance from '../components/WalletBalance';
import axios from 'axios';

// 🚀 CONFIG: Centralized Exchange Data
const AVAILABLE_EXCHANGES = [
  { id: 'coinbase', name: 'Coinbase', guide: "https://help.coinbase.com/en/exchange/managing-my-account/how-to-create-an-api-key" },
  { id: 'binanceus', name: 'Binance.US', guide: "https://support.binance.us/hc/en-us/articles/360050181954-How-to-Create-an-API-Key" },
  { id: 'kraken', name: 'Kraken', guide: "https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair-" },
  { id: 'gemini', name: 'Gemini', guide: "https://support.gemini.com/hc/en-us/articles/360031080192-How-do-I-create-an-API-key" },
  { id: 'cryptocom', name: 'Crypto.com', guide: "https://help.crypto.com/en/articles/3511424-api-keys" },
  { id: 'robinhood', name: 'Robinhood', guide: "https://robinhood.com/us/en/support/articles/robinhood-crypto-api/" },
  { id: 'kucoin', name: 'KuCoin', guide: "https://www.kucoin.com/support/360015102174" },
  { id: 'okx', name: 'OKX', guide: "https://www.okx.com/learn/how-to-create-an-api-key" },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { address, isConnected, chain } = useAccount();
  
  // Form State
  const [keys, setKeys] = useState({ apiKey: '', apiSecret: '', exchange: AVAILABLE_EXCHANGES[0].id });
  const [loading, setLoading] = useState(false);
  const [savedKeys, setSavedKeys] = useState([]);
  
  // 🚀 NEW: Search State for Connected List
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 NEW: Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef(null);

  // 1. Fetch Keys
  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://neov6backend.onrender.com/api/users/keys', {
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
    
    // Click outside listener to close dropdown
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
      await axios.post('https://neov6backend.onrender.com/api/users/keys', 
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
      await axios.delete(`https://neov6backend.onrender.com/api/users/keys/${exchangeName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchKeys();
    } catch (err) {
      alert("Failed to delete key");
    }
  };

  // Filter Connected List
  const filteredConnectedKeys = savedKeys.filter(key => 
    key.exchange.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter Dropdown Options
  const filteredOptions = AVAILABLE_EXCHANGES.filter(ex => 
    ex.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  // Get Current Exchange Object for Guide Link
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
                <div className="text-lg text-white font-medium">{user?.email || 'No Email Linked'}</div>
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
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                 <span className="text-2xl">🔗</span> Connected Exchanges
               </h2>
               {/* Search Bar for Connected List */}
               <div className="relative">
                 <span className="absolute left-3 top-2.5 text-neutral-500">🔍</span>
                 <input 
                   type="text" 
                   placeholder="Filter list..." 
                   className="bg-black border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-purple-500 outline-none w-full md:w-48"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
             </div>
             
             <div className="grid gap-4">
               {filteredConnectedKeys.length === 0 ? (
                 <p className="text-neutral-500 text-center py-4">No exchanges match your search.</p>
               ) : (
                 filteredConnectedKeys.map((k, i) => (
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
                      >
                        Disconnect
                      </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {/* ADD NEW KEYS FORM */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg pb-12"> {/* Extra padding bottom for dropdown space */}
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
               
               {/* 🚀 CUSTOM SEARCHABLE DROPDOWN */}
               <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm text-neutral-400 mb-1">Exchange</label>
                  
                  {/* Dropdown Trigger Button */}
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white cursor-pointer hover:border-purple-500 flex justify-between items-center"
                  >
                    <span>{AVAILABLE_EXCHANGES.find(ex => ex.id === keys.exchange)?.name}</span>
                    <span className="text-xs text-neutral-500">▼</span>
                  </div>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-[#2a2a2a] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                      {/* Search Input inside Dropdown */}
                      <input 
                        type="text"
                        placeholder="Search exchange..."
                        className="w-full bg-[#1a1a1a] p-3 text-sm text-white border-b border-white/10 focus:outline-none"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                      />
                      
                      {/* Options List */}
                      <div className="overflow-y-auto flex-1">
                        {filteredOptions.length === 0 ? (
                           <div className="p-3 text-sm text-neutral-500 text-center">No results found</div>
                        ) : (
                           filteredOptions.map((option) => (
                             <div 
                               key={option.id}
                               onClick={() => {
                                 setKeys({ ...keys, exchange: option.id });
                                 setIsDropdownOpen(false);
                                 setDropdownSearch(''); // Reset search
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

               {/* API KEY INPUT */}
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

            {/* API SECRET INPUT */}
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
