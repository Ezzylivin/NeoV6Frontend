// ./components/Header.jsx
// 🚀 THEME UPDATE: Custom Green Wallet Button + Logout Restoration

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
// import { useAuth } from '../context/AuthContext.jsx'; // Uncomment if you use the AuthContext

const Header = () => {
  const navigate = useNavigate();
  
  // 1. Reown/Wagmi Hooks
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  // 2. Auth Context (Optional - if you have backend session logic)
  // const { logout: authLogout } = useAuth(); 

  // 3. Handle Logout
  const handleLogout = () => {
    // A. Disconnect Wallet
    disconnect();
    
    // B. Clear Backend Session (if applicable)
    // authLogout(); 
    localStorage.removeItem('token'); // Manual cleanup example
    
    // C. Redirect
    navigate('/');
  };

  // Helper to shorten address (e.g. 0x12...3456)
  const shortAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}` 
    : '';

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

        {/* 🚀 CUSTOM WALLET CONTROLS */}
        <div className="flex items-center gap-3">
          
          {!isConnected ? (
            // STATE A: NOT CONNECTED -> GREEN BUTTON
            <button 
              onClick={() => open()} 
              className="rounded-lg bg-emerald-500 text-black px-5 py-2 text-sm font-bold hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all transform hover:-translate-y-0.5"
            >
              CONNECT WALLET
            </button>
          ) : (
            // STATE B: CONNECTED -> INFO + LOGOUT
            <>
              {/* Wallet Info Badge */}
              <button 
                onClick={() => open()} // Clicking this opens the Reown modal for network switching
                className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] border border-white/10 px-4 py-2 hover:border-emerald-500/50 transition-colors group"
              >
                {/* Network Icon (Optional) */}
                <div className={`w-2 h-2 rounded-full ${chain?.id ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></div>
                
                {/* Balance */}
                <span className="text-sm font-medium text-neutral-300 group-hover:text-white hidden md:block">
                  {balance ? `${parseFloat(balance.formatted).toFixed(3)} ${balance.symbol}` : '...'}
                </span>
                
                {/* Address Pill */}
                <span className="text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                  {shortAddress}
                </span>
              </button>

              {/* 🛑 LOGOUT BUTTON RESTORED */}
              <button 
                onClick={handleLogout}
                className="rounded-lg bg-red-600/10 border border-red-500/30 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-600 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
                title="Disconnect & Logout"
              >
                LOGOUT
              </button>
            </>
          )}
        </div>
        
      </div>
    </header>
  );
};

export default Header;
