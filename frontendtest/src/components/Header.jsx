// File: src/components/Header.jsx

import React from 'react';
// Import Link for client-side navigation, useAuth for state, and useNavigate for redirection
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // This clears the state from the context
    navigate('/auth'); // This navigates the user to the auth page
  };

  // Basic inline styles for demonstration
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: '#1a202c',
    color: 'white',
    borderBottom: '1px solid #4a5568'
  };

  const navStyle = {
    display: 'flex',
    gap: '1.5rem'
  };

  return (
    <header style={headerStyle}>
      <div className="logo">
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem' }}>
          NeoV6
        </Link>
      </div>
      <nav style={navStyle}>
        {/* Only show these links if the user is authenticated */}
        {isAuthenticated && (
          <>
            <Link to="/dashboard" style={{ color: 'white' }}>Dashboard</Link>
            <Link to="/settings" style={{ color: 'white' }}>Settings</Link>
            <Link to="/bot-training" style={{ color: 'white' }}>Training</Link>
            <div>
              <span>Welcome, {user?.username}!</span>
              <button onClick={handleLogout} style={{ marginLeft: '1rem', background: '#e53e3e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer' }}>
                Logout
              </button>
            </div>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
