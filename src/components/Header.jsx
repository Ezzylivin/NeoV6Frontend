// File: src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import WalletBalance from './WalletBalance';

const Header = () => {
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  // Retrieve user info from local storage
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

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
          <NavLink to="/dashboard/help" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Help
          </NavLink>
          <Link to="/dashboard/backtests" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Backtests
          </Link>
          <Link to="/dashboard/tradingbot" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Live Bot
          </Link>
          {/* 🚀 ADDED: Settings Link */}
          <Link to="/dashboard/settings" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Settings
          </Link>
        </nav>

        {/* 🚀 RIGHT SIDE: WALLET + USER INFO + LOGOUT */}
        <div className="flex items-center gap-4">
          
          {/* User Info & Wallet Balance Stack */}
          {userInfo.username && (
             <div className="flex flex-col items-end mr-2">
                <span className="text-xs text-neutral-400">Welcome, {userInfo.username}</span>
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
