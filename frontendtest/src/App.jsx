import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx'; // Assuming AuthProvider and a useAuth hook exist

// Import the combined AuthPage, not individual Login/Register pages
import AuthPage from './pages/AuthPage.jsx';

// Import Layouts and Protected Pages
import PrivateRoute from './components/PrivateRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx'; // A layout for all protected pages
import Dashboard from './pages/Dashboard.jsx';
import Backtests from './pages/Backtests.jsx';
import UserSettings from './pages/UserSettings.jsx';
import BotTraining from './pages/BotTraining.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * A helper component to handle the root URL ("/")
 * It redirects authenticated users to the dashboard and guests to the auth page.
 */
function RootRedirect() {
  const { isAuthenticated } = useAuth(); // Hook to check auth state from AuthProvider
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />;
}

export default function App() {
  return (
    // AuthProvider must wrap the entire application
    <AuthProvider>
      <Router>
        <Routes>
          {/* 
            1. PUBLIC AUTH ROUTE: 
            A single route for both login and registration.
          */}
          <Route path="/auth" element={<AuthPage />} />

          {/* 
            2. ROOT REDIRECTION: 
            The root path "/" now intelligently redirects the user.
          */}
          <Route path="/" element={<RootRedirect />} />

          {/* 
            3. PROTECTED ROUTES (wrapped in a layout):
            These routes are protected and share a common layout (e.g., sidebar, navbar).
          */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            {/* Nested routes inherit the parent's protection and layout */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="backtests" element={<Backtests />} />
            <Route path="settings" element={<UserSettings />} />
            <Route path="bot-training" element={<BotTraining />} />
          </Route>

          {/* 4. CATCH-ALL ROUTE for unknown paths */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
