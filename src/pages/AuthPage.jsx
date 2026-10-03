import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';

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

  if (initializing) return <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-emerald-500">Loading...</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      {/* 🟢 CHANGED: Background to "Money Green" (bg-emerald-600) */}
      <div className="w-full max-w-md space-y-6 rounded-xl bg-emerald-600 p-8 border border-emerald-500 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
        <div className="text-center">
          {/* 🟢 CHANGED: Text to White for contrast on dark green */}
          <h1 className="text-3xl font-bold text-white">Welcome</h1>
          <p className="text-emerald-100 font-medium">{isRegister ? 'Create an account to get started' : 'Sign in to your account'}</p>
        </div>
        
        {error && <div className="rounded-md bg-red-500/20 p-3 text-center text-white border border-red-500/50 font-semibold">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input 
              name="username" 
              type="text" 
              value={formData.username} 
              onChange={handleChange} 
              placeholder="Username" 
              required 
              // 🟢 CHANGED: Inputs are Darker Green (emerald-800) with Light Text
              className="w-full rounded-md border-emerald-500 bg-emerald-800 p-3 text-white placeholder-emerald-300 focus:border-white focus:outline-none focus:ring-2 focus:ring-emerald-400" 
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
            // 🟢 CHANGED: Inputs are Darker Green (emerald-800) with Light Text
            className="w-full rounded-md border-emerald-500 bg-emerald-800 p-3 text-white placeholder-emerald-300 focus:border-white focus:outline-none focus:ring-2 focus:ring-emerald-400" 
            disabled={loading} 
          />
          <input 
            name="password" 
            type="password" 
            value={formData.password} 
            onChange={handleChange} 
            placeholder="Password" 
            required 
            // 🟢 CHANGED: Inputs are Darker Green (emerald-800) with Light Text
            className="w-full rounded-md border-emerald-500 bg-emerald-800 p-3 text-white placeholder-emerald-300 focus:border-white focus:outline-none focus:ring-2 focus:ring-emerald-400" 
            disabled={loading}
          />
          {!isRegister && (
            <div className="text-right -mt-1">
              <Link to="/forgot-password" className="text-xs text-emerald-200 hover:text-white hover:underline">Forgot password?</Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading} 
            // 🟢 CHANGED: Button is Deep Green (emerald-900) to pop against Money Green bg
            className="w-full rounded-md bg-emerald-900 py-3 font-bold text-white transition hover:bg-emerald-950 disabled:bg-emerald-800/50 shadow-lg"
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Login')}
          </button>
        </form>

        <p className="text-center text-sm text-emerald-100">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)} 
            className="ml-2 font-bold text-white hover:text-emerald-200 hover:underline" 
            disabled={loading}
          >
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </p>

        {/* ⚖️ Legal footer — consent + links (open in a new tab so the form isn't lost) */}
        <div className="mt-4 border-t border-emerald-500/20 pt-3 text-center text-[11px] leading-relaxed text-emerald-200/80">
          {isRegister && (
            <p className="mb-1">By creating an account you agree to our Terms and acknowledge the Risk Disclosure.</p>
          )}
          <p className="flex flex-wrap items-center justify-center gap-x-2">
            <Link to="/legal?doc=terms" target="_blank" className="hover:text-white hover:underline">Terms</Link>
            <span className="text-emerald-500/40">·</span>
            <Link to="/legal?doc=privacy" target="_blank" className="hover:text-white hover:underline">Privacy</Link>
            <span className="text-emerald-500/40">·</span>
            <Link to="/legal?doc=risk" target="_blank" className="hover:text-white hover:underline">Risk Disclosure</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
