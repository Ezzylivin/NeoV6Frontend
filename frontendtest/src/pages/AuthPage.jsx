import React, { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import { useRegister } from '../hooks/useRegister';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);

  // Login hook
  const { loginUser, loading: loginLoading, error: loginError } = useLogin();
  // Register hook
  const { registerUser, loading: registerLoading, error: registerError } = useRegister();

  const navigate = useNavigate();

  // Shared form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Extra username field for register only
  const [username, setUsername] = useState('');

  // Handle login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginUser(email, password);
      navigate('/dashboard');
    } catch {
      // Error handled in hook error state
    }
  };

  // Handle register submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(username, email, password);
      navigate('/dashboard');
    } catch {
      // Error handled in hook error state
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl mb-6 text-center">{isRegister ? 'Register' : 'Login'}</h1>

      {isRegister ? (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <button
            type="submit"
            disabled={registerLoading}
            className="bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            {registerLoading ? 'Registering...' : 'Register'}
          </button>
          {registerError && <p className="text-red-600">{registerError}</p>}
          <p className="mt-4 text-center">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className="text-blue-500 underline"
            >
              Login here
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loginLoading}
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loginLoading ? 'Logging in...' : 'Login'}
          </button>
          {loginError && <p className="text-red-600">{loginError}</p>}
          <p className="mt-4 text-center">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className="text-blue-500 underline"
            >
              Register here
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
