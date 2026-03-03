// File: src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StrategyProvider } from "./context/StrategyContext.jsx";
import PrivateRoute from "./components/ProtectedRoute.jsx";
import GuestRoute from "./components/GuestRoute.jsx";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout.jsx";

// Pages
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Backtests from "./pages/Backtests.jsx";
import HelpCenter from "./pages/HelpCenter";
import TradingBot from "./pages/TradingBot.jsx";
import Settings from "./pages/Settings.jsx";
import NotFound from "./pages/NotFound.jsx";

function App() {
  return (
    <AuthProvider>
      <StrategyProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes only accessible to guests */}
            <Route
              path="/"
              element={
                <GuestRoute>
                  <AuthPage />
                </GuestRoute>
              }
            />

            {/* Protected routes under dashboard layout */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="backtests" element={<Backtests />} />
              <Route path="/help" element={<HelpCenter />} />
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
