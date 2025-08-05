import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../hooks/useAuth';

const NavBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <div>
        <Link to="/dashboard" className="mr-4">Dashboard</Link>
        <Link to="/backtests" className="mr-4">Backtests</Link>
        <Link to="/bot-training" className="mr-4">Bot Training</Link>
        {user?.role === 'admin' && <Link to="/settings" className="mr-4">Settings</Link>}
      </div>
      <div>
        {user ? (
          <>
            <span className="mr-4">Role: {user.role}</span>
            <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded">Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
