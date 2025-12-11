import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  const { loginUser, registerUser, loading, error, isAuthenticated, initializing } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  useEffect(() => {
    if (!initializing && isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, initializing, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    if (isRegister) {
        result = await registerUser(formData);
    } else {
        result = await loginUser({ identifier: formData.email, password: formData.password });
    }
    
    if (result.success) {
        navigate('/dashboard');
    }
  };

  if (initializing) return <div className="flex h-screen w-full items-center justify-center bg-gray-900">Loading...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-gray-800 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome</h1>
          <p className="text-gray-400">{isRegister ? 'Create an account to get started' : 'Sign in to your account'}</p>
        </div>
        
        {error && <div className="rounded-md bg-red-900/50 p-3 text-center text-red-300">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input 
              name="username" 
              type="text" 
              value={formData.username} 
              onChange={handleChange} 
              placeholder="Username" 
              required 
              className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-emerald-500" 
              disabled={loading} 
            />
          )}
          <input 
            name="email" 
            type="email" 
            value={formData.email} 
            onChange={handleChange} 
            placeholder="Email" 
            required 
            className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-emerald-500" 
            disabled={loading} 
          />
          <input 
            name="password" 
            type="password" 
            value={formData.password} 
            onChange={handleChange} 
            placeholder="Password" 
            required 
            className="w-full rounded-md border-gray-600 bg-gray-700 p-3 text-white focus:ring-2 focus:ring-emerald-500" 
            disabled={loading} 
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full rounded-md bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:bg-gray-500"
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Login')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)} 
            className="ml-2 font-semibold text-emerald-500 hover:underline" 
            disabled={loading}
          >
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
