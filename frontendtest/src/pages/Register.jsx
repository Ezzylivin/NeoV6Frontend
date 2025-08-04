import React, { useState } from 'react';
import { registerUser } from '../api/auth.js';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await registerUser(email, password);
      navigate('/login');
    } catch {
      setError('Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border rounded shadow">
      <h1 className="text-2xl mb-4">Register</h1>
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
        <button className="bg-green-600 text-white py-2 rounded hover:bg-green-700">Register</button>
      </form>
      <p className="mt-4">Have an account? <a href="/login" className="text-blue-500">Login here</a></p>
    </div>
  );
};

export default Register;
