// File: src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import WalletBalance from './WalletBalance';

// Ledger dashboard is served by the FastAPI backend (external to this SPA),
// so it's a normal anchor, not a react-router <Link>. Point VITE_API_URL at
// your backend base in Vercel env vars; the fallback is the raw server:port.
const LEDGER_URL = `${import.meta.env.VITE_API_URL ?? 'http://74.208.28.77:8000'}/ledger`;

const Header = () => {
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  // FE#7: AuthContext persists the user under the 'user' key (not 'userInfo'),
  // so the old read was always empty. Parse safely and fall back across fields.
  let userInfo = {};
  try { userInfo = JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch { userInfo = {}; }
  const displayName = userInfo.username || userInfo.name || userInfo.email;
  const isAdmin = userInfo.role === "admin";

  const handleLogout = async () => {
    disconnect();
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-6 py-4">

      {/* BRANDING */}
      <Link to="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-emerald-400 hover:opacity-80 transition-opacity">
        <span className="text-xl">⬢</span> NeoV6
      </Link>

      {/* NAVIGATION */}
      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Dashboard
          </Link>
          <Link to="/dashboard/help" data-tour="nav-help" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Help
          </Link>
          <Link to="/dashboard/backtests" data-tour="nav-lab" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Strategy Lab
          </Link>
          {/* 🚢 Unified Fleet command center (replaces the single Live Bot) */}
          <Link to="/dashboard/tradingbot" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Fleet
          </Link>
          {/* 🧠 Trade Learning Ledger (in-app page) */}
          <Link to="/dashboard/ledger" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Ledger
          </Link>

          {/* 💳 Plans / upgrade to live trading */}
          <Link to="/dashboard/plans" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Plans
          </Link>

          {/* 🚀 ADDED: Settings Link */}
          <Link to="/dashboard/settings" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Settings
          </Link>

          {/* 🛡️ Admin control — only rendered for admins (route is self-guarded too) */}
          {isAdmin && (
            <Link to="/dashboard/admin" className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {/* 🚀 RIGHT SIDE: WALLET + USER INFO + LOGOUT */}
        <div className="flex items-center gap-4">

          {/* User Info & Wallet Balance Stack */}
          {displayName && (
             <div className="flex flex-col items-end mr-2">
                <span className="text-xs text-neutral-400">Welcome, {displayName}</span>
                <div className="text-xs text-neutral-500 font-mono flex items-center gap-1">
                   Wallet: <WalletBalance />
                </div>
             </div>
          )}

          {/* RainbowKit Button */}
          <div className="custom-connect-wrapper">
            <ConnectButton
              showBalance={{ smallScreen: false, largeScreen: true }}
              accountStatus="avatar"
            />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            title="Disconnect & Logout"
          >
            Logout
          </button>

        </div>

      </div>
    </header>
  );
};

export default Header;
