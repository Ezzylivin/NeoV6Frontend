import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  const baseClass = "transition hover:text-blue-400 px-4 py-2";
  const activeClass = "text-blue-400 font-semibold";

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

  return (
    <nav className="bg-black text-white px-6 py-4 flex items-center shadow-md border-b border-gray-700">
      {/* Left: Brand */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-bold tracking-wide"
