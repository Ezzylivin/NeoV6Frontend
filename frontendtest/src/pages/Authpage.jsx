// File: src/pages/AuthPage.jsx (Corrected and Simplified)

import React, { useState } from 'react';
// 1. You ONLY need this one hook for authentication logic.
import { useAuth } from '../context/AuthContext.jsx'; 

// We no longer need useLogin, useRegister, or useNavigate because the context handles it.

export default function AuthPage() {
  // 2. Get the complete login and register functions from the single source of truth.
  const { login, register } = useAuth();

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
      // 3. Just call the login function. It handles the API call,
      //    state update, and navigation all by itself.
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
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
      // 4. Call the register function. It handles everything.
      await register(username, email, password);
    } catch (err) {
      setError(err.message || "Registration failed. This user may already exist.");
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = () => {
    setIsRegister(!isRegister);
    // Clear form fields and errors when toggling
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
  }

  // The JSX is largely the same, but now uses the single loading/error state
  return (
    <div className="auth-container max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl mb-6 text-center">{isRegister ? 'Register' : 'Login'}</h1>
      
      {/* Display a single error message at the top */}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      
      {isRegister ? (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          {/* ... Register form inputs ... */}
          <button type="submit" disabled={loading} className="bg-green-600 ...">
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
          {/* ... Login form inputs ... */}
          <button type="submit" disabled={loading} className="bg-blue-600 ...">
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
