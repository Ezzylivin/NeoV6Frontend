// File: src/pages/AuthPage.jsx (Corrected and Final Version)

import React, { useState } from 'react';
// 1. You ONLY need this one hook for authentication logic.
import { useAuth } from '../contexts/AuthContext.jsx'; 
// 2. Import useNavigate here to handle redirection.
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  // 3. Get the login and register functions from the context.
  const { login, register } = useAuth();
  // 4. Get the navigate function from the router.
  const navigate = useNavigate();

  // Local state for UI and forms
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // A single set of state for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Call the login function from the context. It only handles the API call and state.
      await login(email, password);
      // 5. After a successful login, navigate the user to the dashboard.
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials."); }
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
      // Call the register function from the context.
      await register(username, email, password);
      // 6. After a successful registration, also navigate the user to the dashboard.
      navigate('/dashboard');
    } catch (err)   {setError(err.message || "Registration failed. This user may already exist.");
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

  // The JSX remains the same.
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
