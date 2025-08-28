import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  // Tailwind classes for active vs inactive links
  const baseClass = "transition hover:text-blue-400";
  const activeClass = "text-blue-400 font-semibold";

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center shadow-md">
      {/* Brand */}
      <h1 className="text-xl font-bold tracking-wide">NeoV6</h1>

      {/* Navigation Links */}
      <div className="flex space-x-6">
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

        {user ? (
          <button
            onClick={logout}
            className="hover:text-red-400 transition"
          >
            Logout
          </button>
        ) : (
          <NavLink
            to="/auth"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
          >
            Login
          </NavLink>
        )}
      </div>
    </nav>
  );
}
