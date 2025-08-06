import React, { useState } from 'react';
import './AuthPage.css'; // We'll create this CSS file next

// We receive onLoginSuccess as a prop from the App component
const AuthPage = ({ onLoginSuccess }) => {
  // useState hook to manage which form is active ('login' or 'register')
  const [activeForm, setActiveForm] = useState('login');

  const handleRegister = (e) => {
    e.preventDefault();
    // In a real app, you would call your API here:
    // registerUser(email, password);
    alert('Registration successful! Please log in.');
    setActiveForm('login'); // Switch to login form after registration
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // In a real app, you would call your API here:
    // const userData = await loginUser(email, password);
    // if (userData) {
    //   onLoginSuccess(userData);
    // }
    alert('Login successful!');
    onLoginSuccess(); // This function is passed from App.jsx to update the state
  };

  return (
    <div className="auth-page-container">
      <div className="form-container">
        <div className="form-toggle">
          <button
            onClick={() => setActiveForm('login')}
            className={activeForm === 'login' ? 'active' : ''}
          >
            Login
          </button>
          <button
            onClick={() => setActiveForm('register')}
            className={activeForm === 'register' ? 'active' : ''}
          >
            Register
          </button>
        </div>

        {/* Conditional Rendering: Show Login form */}
        {activeForm === 'login' && (
          <form id="login-form" className="form" onSubmit={handleLogin}>
            <h2>Login</h2>
            <input type="email" placeholder="Email" required />
            <input type="password" placeholder="Password" required />
            <button type="submit">Login</button>
          </form>
        )}

        {/* Conditional Rendering: Show Register form */}
        {activeForm === 'register' && (
          <form id="register-form" className="form" onSubmit={handleRegister}>
            <h2>Register</h2>
            <input type="text" placeholder="Username" required />
            <input type="email" placeholder="Email" required />
            <input type="password" placeholder="Password" required />
            <button type="submit">Register</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;```

#### **`src/components/AuthPage.css`**
This is the stylesheet for our component. It's nearly identical to the previous CSS, but scoped to this component.

```css
.auth-page-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: #0f172a; /* Match the body background */
}

.form-container {
  background-color: #1e293b; /* A slightly lighter shade for the form */
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  color: #ffffff;
}

.form-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.form-toggle button {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.3s;
}

.form-toggle button.active {
  color: #ffffff;
  border-bottom: 2px solid #3b82f6;
}

.form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #ffffff;
}

.form input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background-color: #334155;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #ffffff;
  box-sizing: border-box;
}

.form input::placeholder {
  color: #94a3b8;
}

.form button {
  width: 100%;
  padding: 0.75rem;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.form button:hover {
  background-color: #2563eb;
}
