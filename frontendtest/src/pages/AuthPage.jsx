// File: src/pages/AuthPage.jsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Using the context for login/register logic
import './AuthPage.css'; // Importing the final, complete styles

const AuthPage = () => {
  // Get the login and register functions directly from our context
  const { login, register } = useAuth();

  // Local state for the component's UI (from the advanced version)
  const [activeForm, setActiveForm] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // The robust handleLogin function with full error handling
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      // No navigation needed. The context and router handle it automatically.
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // The robust handleRegister function with full error handling
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(username, email, password);
      // No navigation or alert needed. The context handles the login,
      // and the router handles the redirect.
    } catch (err) {
      setError(err.message || 'Registration failed. The user may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to clear state when toggling between forms
  const toggleForm = (formName) => {
    setError('');
    setIsLoading(false);
    setActiveForm(formName);
  };

  // The final JSX structure with controlled inputs and user feedback
  return (
    <div className="auth-page-container">
      <div className="form-container">
        <div className="form-toggle">
          <button onClick={() => toggleForm('login')} className={activeForm === 'login' ? 'active' : ''}>
            Login
          </button>
          <button onClick={() => toggleForm('register')} className={activeForm === 'register' ? 'active' : ''}>
            Register
          </button>
        </div>

        {/* Display API error messages in a dedicated element */}
        {error && <p className="error-message">{error}</p>}

        {activeForm === 'login' ? (
          <form onSubmit={handleLogin}>
            <h2>Login</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <h2>Register</h2>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
