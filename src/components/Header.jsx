// File: src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // redirect user to login page
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: '#000000', // true black
    color: 'white',
    borderBottom: '1px solid #444'
  };

  const navStyle = {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center'
  };

  const linkStyle = {
    color: '#3b82f6', // blue links
    textDecoration: 'none',
    fontWeight: '500'
  };

  const buttonStyle = {
    marginLeft: '1rem',
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '5px',
    cursor: 'pointer'
  };

  return (
    <header style={headerStyle}>
      <div className="logo">
        <Link
          to="/dashboard"
          style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}
        >
          Neo-V6
        </Link>
      </div>

      <nav style={navStyle}>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/dashboard/backtests" style={linkStyle}>Backtests</Link>
        <Link to="/dashboard/tradingbot" style={linkStyle}>Trading Bot</Link>
        {isAuthenticated && <Link to="/dashboard/settings" style={linkStyle}>Settings</Link>}

        {isAuthenticated ? (
          <>
            <span>Welcome, {user?.username}!</span>
            <button onClick={handleLogout} style={buttonStyle}>Logout</button>
          </>
        ) : (
          <Link to="/login" style={linkStyle}>Login</Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
