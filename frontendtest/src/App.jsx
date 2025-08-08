// File: src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NotFound from './pages/NotFound.jsx';

// TODO: Replace this with your real auth state from context or hook
const isAuthenticated = false;

const App = () => {
  return (
    <Routes>
      {/* Public route: login/register page */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
        }
      />

      {/* Protected route: dashboard */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />
        }
      />

      {/* Catch-all route for unknown paths */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
