// File: src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '../context/AuthContext';
import WalletBalance from '../components/WalletBalance';
import axios from 'axios';

export default function Settings() {
  const { user, logout } = useAuth();
  const { address, isConnected, chain } = useAccount();
  
  // Form State
  const [keys, setKeys] = useState({ apiKey: '', apiSecret: '', exchange: 'coinbase' });
  const [loading, setLoading] = useState(false);
  
  // 🚀 NEW: State for existing keys
  const [savedKeys, setSavedKeys] = useState([]);

  // 🚀 HELPER: Dynamic Guide Links
  const exchangeGuides = {
    coinbase: "https://help.coinbase.com/en/exchange/managing-my-account/how-to-create-an-api-key",
    binance: "https://www.binance.com/en/support/faq/how-to-create-api-on-binance-360002502072",
    kraken: "https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair-"
  };

  // 1. Fetch Keys on Load
  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      // NOTE: Ensure your backend has a GET route that returns { exchange: 'coinbase', last4: 'a1b2' }
      const res = await axios.get('https://neov6backend.onrender.com/api/users/keys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fallback if backend returns object instead of array
      const keyList = Array.isArray(res.data) ? res.data : (res.data.keys || []);
      setSavedKeys(keyList);
    } catch (err) {
      console.log("No keys found or error fetching keys.");
    }
  };

  useEffect(() => {
    fetchKeys();
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
      setKeys({ apiKey: '', apiSecret: '', exchange: 'coinbase' }); 
      fetchKeys(); // Refresh the list
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
      fetchKeys(); // Refresh list
    } catch (err) {
      alert("Failed to delete key");
    }
  };

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

        {/* 🚀 NEW SECTION: MANAGE KEYS */}
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
                          <div className="font-bold capitalize text-white">{k.exchange}</div>
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
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-lg">
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
               <div>
                  <label className="block text-sm text-neutral-400 mb-1">Exchange</label>
                  <select 
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    value={keys.exchange}
                    onChange={(e) => setKeys({...keys, exchange: e.target.value})}
                  >
                    <option value="coinbase">Coinbase</option>
                    <option value="binance">Binance</option>
                    <option value="kraken">Kraken</option>
                  </select>
                  <a href={exchangeGuides[keys.exchange]} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline mt-2 inline-block">
                    Get Guide ↗
                  </a>
               </div>
               <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-400 mb-1">API Key</label>
                  <input 
                    type="text" 
                    placeholder="Public API Key"
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500"
                    value={keys.apiKey}
                    onChange={(e) => setKeys({...keys, apiKey: e.target.value})}
                  />
               </div>
            </div>
            <div>
              <div className="flex justify-between">
                 <label className="block text-sm text-neutral-400">API Secret</label>
              </div>
              <input 
                type="password" 
                placeholder="Private API Secret"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500"
                value={keys.apiSecret}
                onChange={(e) => setKeys({...keys, apiSecret: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !keys.apiKey || !keys.apiSecret}
              className="mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold"
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
