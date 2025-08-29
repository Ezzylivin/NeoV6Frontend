import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  const baseClass = "transition hover:text-blue-400 px-4 py-2";
  const activeClass = "text-blue-400 font-semibold";

  // Guest navbar
  if (!user) {
    return (
      <nav className="bg-black text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-wide">N.V6 SmartTradingBot</h1>
        <NavLink
          to="/"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
        >
          Login
        </NavLink>
      </nav>
    );
  }

  // Logged-in navbar
  return (
    <nav className="bg-black text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-gray-700">
      {/* Brand */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-bold tracking-wide">NeoV6</h1>
      </div>

      {/* Navigation Links */}
      <div className="flex space-x-8">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/dashboard/backtests"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
        >
          Backtests
        </NavLink>
        <NavLink
          to="/dashboard/tradingbot"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
        >
          Trading Bot
        </NavLink>
