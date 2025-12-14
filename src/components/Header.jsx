// ./components/Header.jsx
// 🚀 THEME UPDATE: AppKit Integration

import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
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

        {/* 🚀 APPKIT BUTTON */}
        {/* This web component handles the entire wallet flow */}
        <appkit-button /> 
        
      </div>
    </header>
  );
};

export default Header;
