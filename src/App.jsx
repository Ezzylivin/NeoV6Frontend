// File: src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import GuestRoute from './components/GuestRoute.jsx';
import PrivateRoute from './components/ProtectedRoute.jsx';

import AuthPage from './pages/Authpage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Backtests from './pages/Backtests.jsx';
import TradingBot from './pages/TradingBot.jsx';
import Settings from './pages/Settings.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx'; // contains Header

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <AuthPage />
              </GuestRoute>
            }
          />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout /> {/* Header included in layout */}
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="backtests" element={<Backtests />} />
            <Route path="tradingbot" element={<TradingBot />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex justify-center items-center min-h-screen text-white bg-black">
                404 Not Found
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
