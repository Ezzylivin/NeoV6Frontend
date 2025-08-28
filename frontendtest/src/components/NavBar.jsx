import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const baseClass = "transition hover:text-blue-400";
  const activeClass = "text-blue-400 font-semibold";

  if (!user) {
    return (
      <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center shadow-md">
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

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Brand */}
        <h1 className="text-xl font-bold tracking-wide">NeoV6</h1>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
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
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
          >
            Settings
          </NavLink>
        </div>

        {/* Logout button (desktop) */}
        <div className="hidden md:block">
          <button
            onClick={logout}
            className="hover:text-red-400 transition"
          >
            Logout
          </button>
        </div>

        {/* Hamburger button (mobile) */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 bg-gray-700">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/dashboard/backtests"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
            onClick={() => setIsOpen(false)}
          >
            Backtests
          </NavLink>
          <NavLink
            to="/dashboard/tradingbot"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
            onClick={() => setIsOpen(false)}
          >
            Trading Bot
          </NavLink>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
            onClick={() => setIsOpen(false)}
          >
            Settings
          </NavLink>
          <button
            onClick={() => { logout(); setIsOpen(false); }}
            className="hover:text-red-400 transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
