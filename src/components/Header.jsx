// File: src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';

const Header = () => {
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  const handleLogout = async () => {
    // 1. Disconnect the wallet
    disconnect();
    
    // 2. Clear all local storage (removes any lingering auth tokens or cache)
    localStorage.clear(); 

    // 3. Force navigation to the Root/Login page
    // Using window.location.href forces a hard refresh, ensuring the App state resets completely.
    // This prevents the router from "thinking" you are still logged in and redirecting you back to Dashboard.
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
          <Link to="/dashboard/backtests" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Backtests
          </Link>
          <Link to="/dashboard/strategies" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Strategies
          </Link>
          <Link to="/dashboard/tradingbot" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Live Bot
          </Link>
        </nav>

        {/* 🚀 WALLET & LOGOUT WRAPPER */}
        <div className="flex items-center gap-4">
          
          {/* RainbowKit Button */}
          <div className="custom-connect-wrapper">
            <ConnectButton 
              showBalance={{ smallScreen: false, largeScreen: true }} 
              accountStatus="full"
            />
          </div>

          {/* 🔴 LOGOUT BUTTON */}
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
