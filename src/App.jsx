import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { StrategyProvider } from './context/StrategyContext.jsx'; // ✅ Import Strategy Context
import PrivateRoute from './components/ProtectedRoute.jsx';
import GuestRoute from './components/GuestRoute.jsx';

// Layouts
import DashboardLayout from './layouts/DashboardLayout.jsx';

// Pages
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Backtests from './pages/Backtests.jsx';
import Strategies from './pages/Strategies.jsx';
import TradingBot from './pages/TradingBot.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

// ✅ 1. Import the setAuthToken function
import { setAuthToken } from './api/apiClient.js';

// ✅ 2. Initialize token once on app load
const initializeApp = () => {
  const token = localStorage.getItem('userToken');
  if (token) setAuthToken(token);
};
initializeApp();

function App() {
  return (
    <AuthProvider>
      <StrategyProvider> {/* ✅ Wrap app with StrategyProvider */}
        <BrowserRouter>
          <Routes>
            {/* Public routes only accessible to guests */}
            <Route path="/" element={<GuestRoute><AuthPage /></GuestRoute>} />

            {/* Protected routes under dashboard layout */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="backtests" element={<Backtests />} />
              <Route path="strategies" element={<Strategies />} />
              <Route path="tradingbot" element={<TradingBot />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all for unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StrategyProvider>
    </AuthProvider>
  );
}

export default App;
