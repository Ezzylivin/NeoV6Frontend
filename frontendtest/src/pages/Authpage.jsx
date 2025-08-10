// File: src/pages/AuthPage.jsx (Corrected and Final Version)

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js'; 
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
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
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      // The extra brace was removed from here.
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(username, email, password);
      navigate('/dashboard');
    } catch (err) { // <-- The structure is now a clean try...catch...finally block
      setError(err.message || "Registration failed. This user may already exist.");
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = () => {
    setIsRegister(!isRegister);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
  }

  // The JSX is unchanged and correct.
  return (
    <div className="auth-container max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl mb-6 text-center">{isRegister ? 'Register' : 'Login'}</h1>
      
      {error && <p className="text-red-600 mb-4">{error}</p>}
      
      {isRegister ? (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="p-2 border rounded" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="p-2 border rounded" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="p-2 border rounded" />
          <button type="submit" disabled={loading} className="bg-green-600 text-white py-2 rounded hover:bg-green-700">
            {loading ? 'Registering...' : 'Register'}
          </button>
          <p className="mt-4 text-center">
            Already have an account?{' '}
            <button type="button" onClick={toggleForm} className="text-blue-500 underline">
              Login here
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="p-2 border rounded" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="p-2 border rounded" />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="mt-4 text-center">
            Don't have an account?{' '}
            <button type="button" onClick={toggleForm} className="text-blue-500 underline">
              Register here
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
