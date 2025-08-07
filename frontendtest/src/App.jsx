// File: src/App.jsx (Corrected)

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// 1. Corrected the file path and added useAuth to the import
import { AuthProvider, useAuth } from './contexts/AuthProvider.jsx'; 

// Import pages and components
import AuthPage from './pages/AuthPage.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Backtests from './pages/Backtests.jsx';
import UserSettings from './pages/UserSettings.jsx';
import BotTraining from './pages/BotTraining.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * RootRedirect now works because useAuth is correctly imported and provided.
 */
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="backtests" element={<Backtests />} />
            <Route path="settings" element={<UserSettings roles={['trader', 'admin']} />} />
            <Route path="bot-training" element={<BotTraining roles={['trader', 'admin']} />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
