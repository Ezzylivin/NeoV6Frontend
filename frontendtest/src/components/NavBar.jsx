import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center shadow-md">
      {/* Brand */}
      <h1 className="text-xl font-bold tracking-wide">NeoV6</h1>

      {/* Navigation Links */}
      <div className="flex space-x-6">
        <Link to="/dashboard" className="hover:text-blue-400 transition">Dashboard</Link>
        <Link to="/backtests" className="hover:text-blue-400 transition">Backtests</Link> {/* ✅ New */}
        <Link to="/tradingbot" className="hover:text-blue-400 transition">Trading Bot</Link> {/* ✅ New */}
        <Link to="/settings" className="hover:text-blue-400 transition">Settings</Link>

        {user ? (
          <button
            onClick={logout}
            className="hover:text-red-400 transition"
          >
            Logout
          </button>
        ) : (
          <Link to="/auth" className="hover:text-blue-400 transition">Login</Link>
        )}
      </div>
    </nav>
  );
}
