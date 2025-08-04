// File: frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getToken, removeToken } from '../utils/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!getToken();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
    // A simple way to force a re-render to update the navbar state
    window.location.reload(); 
  };

  if (!isAuthenticated) {
    return null; // Don't show the navbar on login/register pages
  }

  return (
    <nav style={{ background: '#333', padding: '10px', display: 'flex', gap: '15px' }}>
      <Link to="/" style={{ color: 'white' }}>Dashboard</Link>
      <Link to="/bot" style={{ color: 'white' }}>Bot Control</Link>
      <Link to="/logs" style={{ color: 'white' }}>Logs</Link>
      <Link to="/backtest" style={{ color: 'white' }}>Backtest</Link>
      <Link to="/bot-training" style={{ color: 'blue' }}>Bot Training</Link>
      <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</button>
    </nav>
  );
};

export default Navbar;

