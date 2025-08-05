// File: src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

// Pages
import Dashboard from './pages/Dashboard.jsx';
import BotTraining from './pages/BotTraining.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';



// Context / Auth
import { AuthProvider } from './hooks/useAuth.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/train" element={<BotTraining />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);
