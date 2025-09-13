import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import PrivateRoute from './components/ProtectedRoute.jsx'; // Corrected filename from your previous files
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes only accessible to guests (not logged in) */}
          <Route path="/" element={<GuestRoute><AuthPage /></GuestRoute>} />
          
          {/* Protected routes that share the main dashboard layout */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="backtests" element={<Backtests />} />
            <Route path="strategies" element={<Strategies />} />
            <Route path="tradingbot" element={<TradingBot />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all route for pages that don't exist */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
