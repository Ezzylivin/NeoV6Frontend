// File: src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider.jsx'; 

// Pages & Layouts
import AuthPage from './pages/AuthPage.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Backtests from './pages/Backtests.jsx';
import UserSettings from './pages/UserSettings.jsx';
import BotTraining from './pages/BotTraining.jsx';
import NotFound from './pages/NotFound.jsx';

// Components
import PrivateRoute from './components/PrivateRoute.jsx';

// Redirect component for root path
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Routes */}
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

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
