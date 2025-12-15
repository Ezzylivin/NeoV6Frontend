// File: src/pages/Settings.jsx
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '../context/AuthContext';
import WalletBalance from '../components/WalletBalance';
import axios from 'axios';

export default function Settings() {
  const { user, logout } = useAuth();
  const { address, isConnected, chain } = useAccount();
  
  // Local state for API Keys form
  const [keys, setKeys] = useState({ apiKey: '', apiSecret: '', exchange: 'coinbase' });
  const [loading, setLoading] = useState(false);

  // Handler to save API keys to backend
  const handleSaveKeys = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // NOTE: You need to create this route on your backend later!
      await axios.post('https://neov6backend.onrender.com/api/users/keys', 
        { 
          exchange: keys.exchange,
          apiKey: keys.apiKey,
          apiSecret: keys.apiSecret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ API Keys encrypted and saved successfully!");
      setKeys({ apiKey: '', apiSecret: '', exchange: 'coinbase' }); // Clear form
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save keys: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-neutral-400 mt-2">Manage your profile, wallet connections, and exchange keys.</p>
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. PROFILE CARD */}
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
              <div>
                 <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">User ID (Database)</label>
                 <div className="text-xs font-mono text-neutral-400 bg-black/30 p-2 rounded mt-1 overflow-x-auto">
                   {user?._id || 'Not connected'}
                 </div>
              </div>
            </div>
          </div>

          {/* 2. WEB3 WALLET CARD */}
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
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Address</label>
                  <div className="text-sm font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 p-2 rounded mt-1">
                    {address}
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

        {/* 3. EXCHANGE API KEYS (Full Width) */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                <span className="text-2xl">🔑</span> Exchange API Keys
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Required for <strong>Live Trading</strong> mode. Keys are encrypted before storage.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20">
              ⚠️ Never share your Secret Key
            </span>
          </div>

          <form onSubmit={handleSaveKeys} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Exchange Select */}
               <div>
                  <label className="block text-sm text-neutral-400 mb-1">Exchange</label>
                  <select 
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    value={keys.exchange}
                    onChange={(e) => setKeys({...keys, exchange: e.target.value})}
                  >
                    <option value="coinbase">Coinbase Advanced</option>
                    <option value="binance">Binance</option>
                    <option value="kraken">Kraken</option>
                  </select>
               </div>
               {/* API Key Input */}
               <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-400 mb-1">API Key</label>
                  <input 
                    type="text" 
                    placeholder="Enter public API key..."
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                    value={keys.apiKey}
                    onChange={(e) => setKeys({...keys, apiKey: e.target.value})}
                  />
               </div>
            </div>

            {/* Secret Key Input */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">API Secret</label>
              <input 
                type="password" 
                placeholder="Enter private API secret..."
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                value={keys.apiSecret}
                onChange={(e) => setKeys({...keys, apiSecret: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !keys.apiKey || !keys.apiSecret}
              className="mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-purple-900/20"
            >
              {loading ? 'Encrypting & Saving...' : 'Save API Keys'}
            </button>
          </form>
        </div>

        {/* 4. DANGER ZONE */}
        <div className="border-t border-white/10 pt-8 mt-8">
           <h3 className="text-red-400 font-bold mb-4">Danger Zone</h3>
           <button 
             onClick={logout}
             className="border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
           >
             Log Out of Session
           </button>
        </div>

      </div>
    </div>
  );
}
