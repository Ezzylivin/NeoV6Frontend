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
  const handleRegisterSubmit = async (e) => {  e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // FIX: Pass the 'loginIdentifier' state variable to the context's login function.
      await register(username, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || "Registration failed. This user may already exist.");
    } finally {
      setLoading(false);
    }
  }; };

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
        <div className="text-center">
          <h1 className="text-4xl font-bold">NeoV6</h1>
          <p className="text-gray-400">ARE YOU READY ?</p>
        </div>
        <h2 className="text-2xl font-bold text-center">{isRegister ? 'Create an Account' : 'Login'}</h2>
        {error && <p className="text-red-500 text-center bg-red-900 bg-opacity-50 p-3 rounded">{error}</p>}
        
        {isRegister ? (
          // --- REGISTER FORM ---
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="w-full p-3 bg-gray-700 ..."/>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full p-3 bg-gray-700 ..."/>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full p-3 bg-gray-700 ..."/>
            <button type="submit" disabled={loading} className="w-full ...">
              {loading ? 'Registering...' : 'Register'}
            </button>
            <p className="text-center ...">
              Already have an account?{' '}
              <button type="button" onClick={toggleForm} className="...">Login here</button>
            </p>
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
            <p className="text-center ...">
              Don't have an account?{' '}
              <button type="button" onClick={toggleForm} className="...">Register here</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
