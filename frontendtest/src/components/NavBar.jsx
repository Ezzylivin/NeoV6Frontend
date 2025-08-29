import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  // Base styling for all NavLinks
  const baseNavLinkClass = "transition px-4 py-2 text-white hover:text-blue-400";
  // Styling for the currently active NavLink
  const activeNavLinkClass = "text-blue-400 font-semibold";

  // Common button classes for consistency (e.g., primary action button look)
  const primaryButtonClass = "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50";

  // Navbar for guests (login link only)
  if (!user) {
    return (
      <nav className="bg-black text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-wide">N.V6 SmartTradingBot</h1>
        <NavLink
          to="/"
          className={({ isActive }) => `${baseNavLinkClass} ${isActive ? activeNavLinkClass : ""}`}
        >
          {/* Changed to a button-like appearance for consistency if desired, otherwise revert to just baseNavLinkClass */}
          <span className={`${primaryButtonClass}`}>Login</span>
        </NavLink>
      </nav>
    );
  }

  // Navbar for logged-in users
  return (
    <nav className="bg-black text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-gray-700">
      <h1 className="text-xl font-bold tracking-wide">NeoV6</h1>

      {/* This div correctly spaces out the NavLinks and the Logout button */}
      <div className="flex space-x-6 items-center"> {/* Added items-center for vertical alignment */}
        <NavLink to="/dashboard" className={({ isActive }) => `${baseNavLinkClass} ${isActive ? activeNavLinkClass : ""}`}>Dashboard</NavLink>
        <NavLink to="/dashboard/backtests" className={({ isActive }) => `${baseNavLinkClass} ${isActive ? activeNavLinkClass : ""}`}>Backtests</NavLink>
        <NavLink to="/dashboard/tradingbot" className={({ isActive }) => `${baseNavLinkClass} ${isActive ? activeNavLinkClass : ""}`}>Trading Bot</NavLink>
        <NavLink to="/dashboard/settings" className={({ isActive }) => `${baseNavLinkClass} ${isActive ? activeNavLinkClass : ""}`}>Settings</NavLink>

        {/* Logout button made consistent with primary button styling */}
        <button onClick={logout} className={`${primaryButtonClass} bg-red-600 hover:bg-red-700`}>Logout</button>
      </div>
    </nav>
  );
}
