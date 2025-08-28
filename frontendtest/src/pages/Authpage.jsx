// File: src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginUser, registerUser, loading, error } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const result = await loginUser({ email, password });
    if (result.success) navigate('/dashboard');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const result = await registerUser({ username, email, password });
    if (result.success) navigate('/dashboard');
  };

  const toggleForm = () => {
    setIsRegister(!isRegister);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold">NeoV6</h1>
          <p className="text-gray-400">ARE YOU READY?</p>
        </div>

        <h2 className="text-2xl font-bold text-center">
          {isRegister ? 'Create an Account' : 'Login'}
        </h2>

        {error && (
          <p className="text-red-500 text-center bg-red-900 bg-opacity-50 p-3 rounded">
            {error}
          </p>
        )}

        {isRegister ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-bold text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-500 transition-colors"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
            <p className="text-center text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={toggleForm}
                className="font-medium text-blue-400 hover:underline"
              >
                Login here
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <p className="text-center text-gray-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={toggleForm}
                className="font-medium text-blue-400 hover:underline"
              >
                Register here
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
