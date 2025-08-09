import React, { useState, useContext } from 'react';
import { useLogin } from '../hooks/useLogin';
import { useRegister } from '../hooks/useRegister';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthProvider';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const { login } = useContext(AuthContext);
  const { loginUser, loading: loginLoading, error: loginError } = useLogin();
  const { registerUser, loading: registerLoading, error: registerError } = useRegister();
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // Handle login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const { user, token } = await loginUser(email, password);
    if (user && token) {
      login(user, token);
      navigate('/dashboard');
    }
  };

  // Handle register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { user, token } = await registerUser(username, email, password);
    if (user && token) {
      login(user, token);
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-container max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl mb-6 text-center">{isRegister ? 'Register' : 'Login'}</h1>
      {isRegister ? (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            required
            className="p-2 border rounded"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="p-2 border rounded"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
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
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="p-2 border rounded"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
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
