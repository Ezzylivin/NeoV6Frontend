import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx'; 
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // --- STATE ---
  const [isRegister, setIsRegister] = useState(false);
  // We now only need ONE state for the login identifier.
  const [loginIdentifier, setLoginIdentifier] = useState(''); 
  const [email, setEmail] = useState(''); // Still needed for registration form
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // FIX: Pass the 'loginIdentifier' state variable to the context's login function.
      await login(loginIdentifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle register (This function does not need to change)
  const handleRegisterSubmit = async (e) => { /* ... */ };

  const toggleForm = () => {
    setIsRegister(!isRegister);
    setError('');
    // Clear all form fields
    setEmail('');
    setPassword('');
    setUsername('');
    setLoginIdentifier('');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="auth-container w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        {/* ... Title and error display ... */}
        <h2 className="text-2xl font-bold text-center">{isRegister ? 'Create an Account' : 'Login'}</h2>
        {error && <p className="text-red-500 ...">{error}</p>}
        
        {isRegister ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            {/* Register form remains the same */}
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="..."/>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="..."/>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="..."/>
            <button type="submit" disabled={loading} className="...">
              {loading ? 'Registering...' : 'Register'}
            </button>
            {/* ... toggle button ... */}
          </form>
        ) : (
          // --- LOGIN FORM (UPDATED) ---
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {/* FIX: A single input field for username OR email */}
            <input 
              type="text" // Use type="text" to allow for usernames
              value={loginIdentifier} 
              onChange={e => setLoginIdentifier(e.target.value)} 
              placeholder="Username or Email" 
              required 
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Password" 
              required 
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <button type="submit" disabled={loading} className="w-full ...">
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {/* ... toggle button ... */}
          </form>
        )}
      </div>
    </div>
  );
};
