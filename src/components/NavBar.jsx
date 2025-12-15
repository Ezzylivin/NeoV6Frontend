// ./components/NavBar.jsx
// 🚀 THEME UPDATE: "Carbon Grey & Emerald" + Wallet Integration

import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import WalletBalance from "./WalletBalance"; // 👈 IMPORT THIS

export default function NavBar() {
  const { user, logout } = useAuth();

  // CHANGED: Blue hover/active states -> Emerald Green
  const baseClass = "transition px-3 py-2 hover:text-emerald-400";
  const activeClass = "text-emerald-400 font-semibold";

  if (!user) {
    return (
      <header className="bg-[#121212] text-white px-6 py-4 flex justify-between items-center border-b border-white/10">
        <h1 className="text-xl font-bold tracking-wide">N.V6 SmartTradingBot</h1>
        <NavLink
          to="/"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
        >
          Login
        </NavLink>
      </header>
    );
  }

  return (
    <header className="bg-[#121212] text-white px-6 py-4 flex justify-between items-center border-b border-white/10">
      {/* Left: Brand + Nav Links */}
      <div className="flex items-center space-x-6">
        <NavLink
          to="/dashboard"
          className="text-2xl font-bold tracking-wide text-white hover:text-emerald-400 transition-colors"
        >
          NeoV6
        </NavLink>
        <nav className="flex items-center space-x-4">
          <NavLink to="/dashboard" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/dashboard/backtests" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Backtests
          </NavLink>
          <NavLink to="/dashboard/strategies" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
             Strategies
          </NavLink>
          <NavLink to="/dashboard/tradingbot" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Trading Bot
          </NavLink>
          <NavLink to="/dashboard/settings" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Settings
          </NavLink>
        </nav>
      </div>

      {/* Right: User + Wallet + Logout */}
      <div className="flex items-center space-x-6">
        
        {/* 🚀 ADDED: User Info Stack */}
        <div className="flex flex-col items-end">
             <span className="text-sm text-neutral-400">Welcome, {user?.username}</span>
             {/* This renders the Component we made in Step 1 */}
             <div className="text-xs text-neutral-500 font-mono flex items-center gap-2">
                Wallet: <WalletBalance /> 
             </div>
        </div>

        <button
          onClick={logout}
          className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition border border-red-500/20"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
