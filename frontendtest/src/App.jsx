// File: src/App.jsx (Incorporated and Final Version)

import React from 'react';
// 1. Import all necessary components from react-router-dom
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 2. Import the AuthProvider and the useAuth hook for state management
import { AuthProvider, useAuth } from './context/AuthContext.jsx'; 
import GuestRoute from './components/GuestRoute.jsx';

// --- Import all your pages and components ---
        // The public landing page
import AuthPage from './pages/Authpage.jsx';         // The combined Login/Register page
import Dashboard from './pages/Dashboard.jsx'; // The protected dashboard
import PrivateRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';// The security guard component

/**
 * A helper component to handle what guests see vs. what logged-in users see
 * when they visit the root URL.
 * In this setup, we want everyone to see the HomePage, so this component isn't strictly
 * necessary, but it's a good pattern to be aware of if you wanted to redirect logged-in
 * users away from the homepage automatically.
 */


// App is the main component and is a default export
export default function App() {
  return (
    // 3. Wrap the entire application in AuthProvider to give all components
    //    access to the user's authentication state.
     <AuthProvider>
      <Router>
        <Routes>
          {/* --- GUEST-ONLY ROUTES --- */}
          {/* These routes are for users who are NOT logged in. */}
          <Route path="/auth" element={
            <GuestRoute>
              <AuthPage />
            </GuestRoute>
          } />
                
          {/* --- PROTECTED ROUTES --- */}
          {/* This parent route protects all children and provides the main layout. */}
          <Route path="/Dashboard" element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }>
            {/* 
              This is the INDEX ROUTE for the protected section.
              A logged-in user visiting "/" will see the Dashboard.
            */}
            <Route index element={<Dashboard />} />

            {/* Other protected routes */}
            <Route path="dashboard" element={<Dashboard />} />
            {/* <Route path="settings" element={<SettingsPage />} /> */}
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  );
}
