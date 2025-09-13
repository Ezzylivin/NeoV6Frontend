// File: src/pages/AuthPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginUser, registerUser, loading, error, isAuthenticated, initializing } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // This effect will run after a successful login when isAuthenticated becomes true
  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, initializing, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    if (isRegister) {
      result = await registerUser({ username, email, password });
    } else {
      // FIX: Be explicit about what you send as the identifier.
      // The backend expects an 'identifier' which can be an email or username.
      result = await loginUser({ identifier: email, password });
    }
    // The useEffect above will handle the redirect, ensuring the state is updated first.
  };

  const toggleForm = () => {
    setIsRegister(!isRegister);
    setUsername('');
    setEmail('');
    setPassword('');
  };

  if (initializing) {
    return <div className="min-h-screen flex justify-center items-center bg-black text-white">Initializing...</div>;
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-black text-white">
      <div className="w-full max-w-md p-8 bg-black border border-gray-700 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-4">{isRegister ? 'Create an Account' : 'Login'}</h2>
        
        {error && <p className="text-red-500 text-center bg-red-900 bg-opacity-50 p-3 rounded mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"/>
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"/>
          
          <button type="submit" disabled={loading} className="w-full py-3 font-bold rounded transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500">
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-4">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" onClick={toggleForm} className="font-medium text-blue-400 hover:underline">
            {isRegister ? 'Login here' : 'Register here'}
          </button>
        </p>
      </div>
    </div>
  );
}
