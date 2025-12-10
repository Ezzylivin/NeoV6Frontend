// ./components/Header.jsx
// 🚀 THEME UPDATE: "Carbon Grey & Emerald"

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    // CHANGED: bg-slate-900 -> bg-[#121212] (Carbon Black)
    // CHANGED: border-slate-700 -> border-white/10 (Subtle Glass Border)
    <header className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-6 py-4">
      
      {/* CHANGED: text-blue-500 -> text-emerald-400 */}
      <Link to="/dashboard" className="text-2xl font-bold text-emerald-400">
        NeoV6
      </Link>
      
      <nav className="flex items-center gap-6">
        {/* CHANGED ALL LINKS: text-slate-300 -> text-neutral-300 (True Grey) */}
        {/* CHANGED ALL HOVERS: hover:text-blue-400 -> hover:text-emerald-400 */}
        
        <Link to="/dashboard" className="text-neutral-300 hover:text-emerald-400 transition-colors">
          Dashboard
        </Link>
        <Link to="/dashboard/backtests" className="text-neutral-300 hover:text-emerald-400 transition-colors">
          Backtests
        </Link>
        <Link to="/dashboard/strategies" className="text-neutral-300 hover:text-emerald-400 transition-colors">
          Strategies
        </Link>
        <Link to="/dashboard/tradingbot" className="text-neutral-300 hover:text-emerald-400 transition-colors">
          Trading Bot
        </Link>
        
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            {/* CHANGED: text-slate-400 -> text-neutral-400 */}
            <span className="text-sm text-neutral-400">Welcome, {user?.username}!</span>
            <button 
              onClick={handleLogout} 
              // Optional: Changed red-600 to have a slight transparency or border to match theme better
              className="rounded-md bg-red-600/90 border border-red-500/20 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all"
            >
              Logout
            </button>
          </div>
        ) : (
          // CHANGED: hover:text-blue-400 -> hover:text-emerald-400
          <Link to="/" className="text-neutral-300 hover:text-emerald-400 transition-colors">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
