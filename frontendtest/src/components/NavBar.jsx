import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  const baseClass = "transition hover:text-blue-400";
  const activeClass = "text-blue-400 font-semibold";

  if (!user) {
    return (
      <nav className="bg-gray-800 text-white px-6 py-4 shadow-md">
        <div className="flex justify-between max-w-7xl mx-auto items-center">
          <h1 className="text-xl font-bold tracking-wide">N.V6 SmartTradingBot</h1>
          <NavLink
            to="/"
            className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ""}`}
          >
            Login
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 shadow-md">
      <div className="flex justify-evenly max-w-7xl mx-auto items-center">
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
        <button
          onClick={logout}
          className="hover:text-red-400 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
