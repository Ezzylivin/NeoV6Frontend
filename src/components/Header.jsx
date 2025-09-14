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
    <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-6 py-4">
      <Link to="/dashboard" className="text-2xl font-bold text-blue-500">
        NeoV6
      </Link>
      <nav className="flex items-center gap-6">
        <Link to="/dashboard" className="text-slate-300 hover:text-blue-400">Dashboard</Link>
        <Link to="/dashboard/backtests" className="text-slate-300 hover:text-blue-400">Backtests</Link>
        <Link to="/dashboard/strategies" className="text-slate-300 hover:text-blue-400">Strategies</Link>
        {/* --- NEW LINK ADDED HERE --- */}
        <Link to="/dashboard/tradingbot" className="text-slate-300 hover:text-blue-400">Trading Bot</Link>
        
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Welcome, {user?.username}!</span>
            <button 
              onClick={handleLogout} 
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link to="/" className="text-slate-300 hover:text-blue-400">Login</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
