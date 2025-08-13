// File: src/components/NavBar.jsx (Corrected)

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// 1. Import the useAuth hook to get user state and functions.
import { useAuth } from '../context/AuthContext.jsx';

const NavBar = () => {
  // 2. Call the hook to get the data you need.
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // This clears the state from the context.
    navigate('/login'); // Redirect the user after logout.
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div>
        {/* These links will now only show if the user is authenticated */}
        {isAuthenticated && (
          <>
            <Link to="/dashboard" className="mr-4 hover:text-blue-400">Dashboard</Link>
            <Link to="/backtests" className="mr-4 hover:text-blue-400">Backtests</Link>
            <Link to="/bot-training" className="mr-4 hover:text-blue-400">Bot Training</Link>
            {user?.role === 'admin' && <Link to="/settings" className="mr-4 hover:text-blue-400">Settings</Link>}
          </>
        )}
      </div>
      <div>
        {/* 3. Use the 'isAuthenticated' flag for clearer conditional rendering. */}
        {isAuthenticated ? (
          <div className="flex items-center">
            <span className="mr-4">Welcome, {user.username}! (Role: {user.role})</span>
            <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">Logout</button>
          </>
        ) : (
          <Link to="/auth">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
