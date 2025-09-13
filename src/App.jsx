// File: src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import GuestRoute from './components/GuestRoute';
import DashboardLayout from './layouts/DashboardLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Backtests from './pages/Backtests';
import Strategies from './pages/Strategies'; // <-- 1. Import the new page

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GuestRoute><AuthPage /></GuestRoute>} />
          
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="backtests" element={<Backtests />} />
            <Route path="strategies" element={<Strategies />} /> {/* <-- 2. Add the route */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
