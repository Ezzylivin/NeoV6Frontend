import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx'; 
import GuestRoute from './components/GuestRoute.jsx';
import PrivateRoute from './components/ProtectedRoute.jsx';

import AuthPage from './pages/Authpage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BacktestsPage from './pages/Backtests.jsx';
import TradingBotPage from './pages/TradingBot.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route for guests */}
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
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="backtests" element={<BacktestsPage />} />
            <Route path="tradingbot" element={<TradingBotPage />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
