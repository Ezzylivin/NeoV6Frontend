import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './hooks/useAuth';
import PrivateRoute from './components/PrivateRoute.jsx';

import './api/logs';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Backtests from './pages/Backtests.jsx';
import UserSettings from './pages/UserSettings.jsx';
import BotTraining from './pages/BotTraining.jsx';
import NotFound from './pages/NotFound.jsx';


export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute roles={['trader', 'admin', 'analyst']}>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/backtests"
            element={
              <PrivateRoute roles={['trader', 'admin', 'analyst']}>
                <Backtests />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute roles={['trader', 'admin']}>
                <UserSettings />
              </PrivateRoute>
            }
          />

          <Route
            path="/bot-training"
            element={
              <PrivateRoute roles={['trader', 'admin']}>
                <BotTraining />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
