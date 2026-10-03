// File: src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StrategyProvider } from "./context/StrategyContext.jsx";
import PrivateRoute from "./components/ProtectedRoute.jsx";
import GuestRoute from "./components/GuestRoute.jsx";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout.jsx";

// AuthPage stays eager so the public landing/login paints instantly.
import AuthPage from "./pages/AuthPage.jsx";

// Heavy protected pages are code-split: each loads as its own chunk only when
// visited, so the charting libs + TradingBot (~1600 lines) don't ship up front.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Backtests = lazy(() => import("./pages/Backtests.jsx"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const FleetCommand = lazy(() => import("./pages/FleetCommand.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const LedgerDashboard = lazy(() => import("./pages/LedgerDashboard.jsx"));
const Plans = lazy(() => import("./pages/Plans.jsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const RouteFallback = () => (
  <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading…</div>
);

function App() {
  return (
    <AuthProvider>
      <StrategyProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="help" element={<HelpCenter />} />
              <Route path="tradingbot" element={<FleetCommand />} />
              <Route path="settings" element={<Settings />} />
              <Route path="ledger" element={<LedgerDashboard />} />
              <Route path="fleet" element={<FleetCommand />} />
              {/* 💳 Subscription storefront (paper is free; paid unlocks live) */}
              <Route path="plans" element={<Plans />} />
              {/* 🛡️ Admin control plane — self-guards to admins (redirects others) */}
              <Route path="admin" element={<AdminPanel />} />
            </Route>

            {/* 📧 Public email-verification landing (clicked from the email link) */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            {/* 🔑 Public password-reset flow */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Catch-all for unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </StrategyProvider>
    </AuthProvider>
  );
}

export default App;
