// File: src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage.jsx';       // Your login/register page
import Dashboard from './pages/Dashboard.jsx';     // Your dashboard page
import NotFound from './pages/NotFound.jsx';       // 404 page


const App = () => {
  

  return (
    <Routes>
      {/* Public route: login/register page */}
      <Route
        path="/"
        element={
          token ? <Navigate to="/dashboard" replace /> : <AuthPage />
        }
      />

      {/* Protected route: dashboard */}
      <Route
        path="/dashboard"
        element={
          token ? <Dashboard /> : <Navigate to="/" replace />
        }
      />

      {/* Catch-all route for unknown paths */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
