import React, { useState } from 'react';
import { loginUser } from '../api/auth.js';
import { useNavigate } from 'react-router-dom';



const Login = () => {
  
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await loginUser(email, password);
      login(data.access_token); 
       const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border rounded shadow">
      <h1 className="text-2xl mb-4">Login</h1>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          className="p-2 border rounded"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 border rounded"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
      </form>
      <p className="mt-4">No account? <a href="/register" className="text-blue-500">Register here</a></p>
    </div>
  );
};

export default Login;
