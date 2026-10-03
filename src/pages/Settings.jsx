// File: src/pages/Settings.jsx
// Account settings — revamped to match the Plans/Admin aesthetic (dark cards,
// lucide icons, emerald accents) and wired into the subscription system: a
// Subscription card shows the current plan and links to Plans to upgrade/manage.
// All original logic (email change, exchange API keys, wallet, logout) is kept.
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '../context/AuthContext';
import WalletBalance from '../components/WalletBalance';
import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { updateEmail as updateEmailApi } from '../api/account.js';
import {
  User as UserIcon, Mail, Wallet, KeyRound, ShieldCheck, ShieldAlert,
  CreditCard, LogOut, CheckCircle2, AlertTriangle, ExternalLink, Crown, Sparkles, Trash2,
} from 'lucide-react';

// 🚀 CONFIG: Centralized Exchange Data
// Currently synced with Python Neo-Engine v25 (Coinbase Spot & Kraken Margin)
const AVAILABLE_EXCHANGES = [
  { id: 'coinbase', name: 'Coinbase Advanced', guide: "https://portal.cdp.coinbase.com/projects/api-keys" },
  { id: 'kraken', name: 'Kraken Pro', guide: "https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair-" },
];

// Plan presentation (mirrors backend config/tiers.js names). Paper is free for
// all; a non-free tier (or admin) unlocks live trading.
const TIER_META = {
  free:   { label: 'Free',   note: 'Unlimited paper trading', live: false },
  trader: { label: 'Trader', note: 'Live on up to 3 coins',   live: true },
  pro:    { label: 'Pro',    note: 'Live on up to 8 coins',   live: true },
  whale:  { label: 'Whale',  note: 'Unlimited live',          live: true },
};

// iconColor is a full Tailwind class (not interpolated) so the JIT compiler
// always generates it.
function Card({ icon: Icon, title, iconColor = 'text-emerald-400', right, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Icon className={`h-5 w-5 ${iconColor}`} /> {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { isConnected, chain } = useAccount();

  // Form State
  const [keys, setKeys] = useState({ apiKey: '', apiSecret: '', exchange: AVAILABLE_EXCHANGES[0].id });
  const [loading, setLoading] = useState(false);
  const [savedKeys, setSavedKeys] = useState([]);

  // ✉️ Change-email state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
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

  // Searchable exchange dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef(null);

  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${token}` } });
      const keyList = Array.isArray(res.data) ? res.data : (res.data.keys || []);
      setSavedKeys(keyList);
    } catch (err) {
      console.log("No keys found.");
    }
  };

  useEffect(() => {
    fetchKeys();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveKeys = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/users/keys`, { ...keys }, { headers: { Authorization: `Bearer ${token}` } });
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

  const handleDeleteKey = async (exchangeName) => {
    if (!window.confirm(`Are you sure you want to disconnect ${exchangeName}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/users/keys/${exchangeName}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchKeys();
    } catch (err) {
      alert("Failed to delete key");
    }
  };

  const filteredOptions = AVAILABLE_EXCHANGES.filter(ex => ex.name.toLowerCase().includes(dropdownSearch.toLowerCase()));
  const currentExchangeObj = AVAILABLE_EXCHANGES.find(ex => ex.id === keys.exchange) || AVAILABLE_EXCHANGES[0];

  // Account meta
  const tier = (user?.tier) || 'free';
  const tierMeta = TIER_META[tier] || TIER_META.free;
  const isAdmin = user?.role === 'admin';
  const liveUnlocked = tierMeta.live || isAdmin;
  const subStatus = user?.subscriptionStatus;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  return (
    <div className="min-h-screen bg-[#0d0d0f] p-4 text-neutral-200 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="mt-1 text-neutral-400">Your profile, subscription, wallet, and exchange connections.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tier === 'free' ? 'bg-white/10 text-neutral-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
              {tier === 'whale' ? <Crown className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {tierMeta.label} plan
            </span>
            {isAdmin && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" /> Admin
              </span>
            )}
          </div>
        </div>

        {/* TOP ROW: Profile + Subscription */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* PROFILE */}
          <Card icon={UserIcon} title="Profile">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Username</label>
                <div className="text-lg font-medium text-white">{user?.username || 'Guest'}</div>
                {memberSince && <div className="text-xs text-neutral-500">Member since {memberSince}</div>}
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Email</label>
                {!editingEmail ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-lg font-medium text-white">
                      <Mail className="h-4 w-4 text-neutral-500" /> {emailShown || 'No email linked'}
                    </span>
                    {emailShown && (verifiedShown
                      ? <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                      : <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400"><AlertTriangle className="h-3 w-3" /> Unverified</span>)}
                    <button onClick={() => { setEditingEmail(true); setNewEmail(emailShown || ''); setEmailMsg(''); }}
                      className="ml-1 text-xs text-emerald-400 hover:underline">Change</button>
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com"
                      className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-emerald-500" autoFocus />
                    <div className="flex items-center gap-2">
                      <button onClick={handleSaveEmail} disabled={emailBusy || !newEmail.trim()}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                        {emailBusy ? 'Saving…' : 'Save & verify'}
                      </button>
                      <button onClick={() => { setEditingEmail(false); setNewEmail(''); setEmailMsg(''); }}
                        className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">Cancel</button>
                    </div>
                    <p className="text-xs text-neutral-500">A verification link is sent to the new address. Trade alerts only go to verified emails.</p>
                  </div>
                )}
                {emailMsg && <p className="mt-2 text-xs text-emerald-300/90">{emailMsg}</p>}
              </div>
            </div>
          </Card>

          {/* SUBSCRIPTION */}
          <Card icon={CreditCard} title="Subscription"
            right={<Link to="/dashboard/plans" className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400">
              {tier === 'free' ? 'Upgrade' : 'Manage plan'}
            </Link>}>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{tierMeta.label}</div>
                  <div className="text-sm text-neutral-400">{tierMeta.note}</div>
                </div>
                {subStatus && (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-neutral-300">{subStatus}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {liveUnlocked
                  ? <><ShieldCheck className="h-4 w-4 text-emerald-400" /><span className="text-emerald-300">Live trading unlocked</span></>
                  : <><ShieldAlert className="h-4 w-4 text-amber-400" /><span className="text-amber-300">Paper only — upgrade to trade live</span></>}
              </div>
              <p className="text-xs text-neutral-500">
                Paper trading is free and unlimited on every plan. Paid plans unlock real-money deployment once a strategy passes validation.
              </p>
            </div>
          </Card>
        </div>

        {/* ADMIN QUICK-LINK (admins only) */}
        {isAdmin && (
          <Link to="/dashboard/admin"
            className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 transition hover:bg-amber-500/[0.1]">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-400" />
              <div>
                <div className="font-semibold text-white">Admin Control</div>
                <div className="text-sm text-neutral-400">Manage users, tiers, and the global kill switch.</div>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-amber-400" />
          </Link>
        )}

        {/* WALLET */}
        <Card icon={Wallet} title="Web3 Wallet">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <p className="text-neutral-400">No wallet connected.</p>
              <ConnectButton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Status</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                  <span className="text-white">Connected</span>
                  <span className="text-xs text-neutral-500">({chain?.name})</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Balance</label>
                <div className="mt-1 text-2xl font-bold text-white"><WalletBalance /></div>
              </div>
            </div>
          )}
        </Card>

        {/* CONNECTED EXCHANGES */}
        {savedKeys.length > 0 && (
          <Card icon={KeyRound} title="Connected Exchanges" iconColor="text-purple-400">
            <div className="grid gap-3">
              {savedKeys.map((k, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-400">
                      {k.exchange?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold capitalize text-white">{AVAILABLE_EXCHANGES.find(ex => ex.id === k.exchange)?.name || k.exchange}</div>
                      <div className="font-mono text-xs text-neutral-500">Key ending in ••••{k.last4 || '****'}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteKey(k.exchange)}
                    className="flex items-center gap-1 rounded p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300" title="Remove Key">
                    <Trash2 className="h-4 w-4" /> Disconnect
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ADD KEYS */}
        <Card icon={KeyRound} title="Add Exchange Keys" iconColor="text-purple-400">
          <p className="-mt-2 mb-4 text-sm text-neutral-400">Keys are encrypted at rest. We never display your secret again. Needed only for live trading.</p>
          <form onSubmit={handleSaveKeys} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Searchable dropdown */}
              <div className="relative" ref={dropdownRef}>
                <label className="mb-1 block text-sm text-neutral-400">Exchange</label>
                <div onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-black px-4 py-2 text-white hover:border-purple-500">
                  <span>{currentExchangeObj.name}</span><span className="text-xs text-neutral-500">▼</span>
                </div>
                {isDropdownOpen && (
                  <div className="absolute z-50 mt-2 flex max-h-60 w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#2a2a2a] shadow-xl">
                    <input type="text" placeholder="Search exchange..." value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)} autoFocus onClick={(e) => e.stopPropagation()}
                      className="w-full border-b border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-neutral-500 focus:outline-none" />
                    <div className="custom-scrollbar flex-1 overflow-y-auto">
                      {filteredOptions.length === 0 ? (
                        <div className="p-3 text-center text-sm text-neutral-500">No results found</div>
                      ) : filteredOptions.map((option) => (
                        <div key={option.id}
                          onClick={() => { setKeys({ ...keys, exchange: option.id }); setIsDropdownOpen(false); setDropdownSearch(''); }}
                          className={`cursor-pointer px-4 py-2 text-sm transition hover:bg-purple-600/20 hover:text-purple-300 ${keys.exchange === option.id ? 'bg-purple-600/10 text-purple-400' : 'text-neutral-300'}`}>
                          {option.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <a href={currentExchangeObj.guide} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-purple-400 hover:underline">
                  {currentExchangeObj.name} guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {/* API KEY */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-neutral-400">API Key</label>
                <input type="text" placeholder="Public API Key" value={keys.apiKey}
                  onChange={(e) => setKeys({ ...keys, apiKey: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white outline-none focus:border-purple-500" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-400">API Secret</label>
              <input type="password" placeholder="Private API Secret" value={keys.apiSecret}
                onChange={(e) => setKeys({ ...keys, apiSecret: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-2 text-white outline-none focus:border-purple-500" />
            </div>
            <button type="submit" disabled={loading || !keys.apiKey || !keys.apiSecret}
              className="mt-2 w-full rounded-lg bg-purple-600 px-6 py-2 font-bold text-white hover:bg-purple-500 disabled:opacity-50 md:w-auto">
              {loading ? 'Saving…' : 'Save API Keys'}
            </button>
          </form>
        </Card>

        {/* DANGER ZONE */}
        <Card icon={LogOut} title="Session" iconColor="text-red-400">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-400">Sign out of this device. Your bots keep running.</p>
            <button onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 px-6 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-500 hover:text-white">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}
