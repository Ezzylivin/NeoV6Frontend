import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  const baseClass = "transition px-3 py-2 hover:text-blue-300";
  const activeClass = "text-blue-400 font-semibold";

  if (!user) {
    return (
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center border-b border-gray-700">
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
    <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center border-b border-gray-700">
      {/* Left: Brand + Nav Links */}
      <div className="flex items-center space-x-6">
        <NavLink
          to="/dashboard"
          className="text-2xl font-bold tracking-wide text-white hover:text-blue-300"
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
          <NavLink to="/dashboard/tradingbot" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Trading Bot
          </NavLink>
          <NavLink to="/dashboard/settings" className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}>
            Settings
          </NavLink>
        </nav>
      </div>

      {/* Right: User + Logout */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-300">Welcome, {user?.username}</span>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
