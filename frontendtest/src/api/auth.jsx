// File: src/api/auth.js

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';


export const registerUser = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

 const data = await res.json(); {
 if (!res.ok) throw new Error('Registration failed');
 
}

return data;
};



export const loginUser = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
   const data = await res.json(); {
  if (!res.ok) throw new Error('login failed');
 
}

return data;
};
