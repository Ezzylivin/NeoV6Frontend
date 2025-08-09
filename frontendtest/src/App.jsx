// File: src/App.jsx (Incorporated and Final Version)

import React from 'react';
// 1. Import all necessary components from react-router-dom
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 2. Import the AuthProvider and the useAuth hook for state management
import { AuthProvider, useAuth } from './context/AuthContext.jsx'; 

// --- Import all your pages and components ---
import HomePage from './pages/HomePage.jsx';         // The public landing page
import AuthPage from './pages/AuthPage.jsx';         // The combined Login/Register page
import DashboardPage from './pages/DashboardPage.jsx'; // The protected dashboard
import PrivateRoute from './components/PrivateRoute.jsx';    // The security guard component

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
      {/* 4. Wrap everything in a Router to enable client-side navigation */}
      <Router>
        <Routes>
          {/* --- Public Routes --- */}

          {/* The root path '/' now shows the public HomePage. Anyone can see this. */}
          <Route path="/" element={<HomePage />} />
          
          {/* 
            We now use a single '/auth' route instead of separate '/login' and '/register'.
            This route renders the AuthPage component, which handles the toggling
            between login and registration forms itself.
          */}
          <Route path="/auth" element={<AuthPage />} />

          
          {/* --- Protected Routes --- */}

          {/* 
            The '/dashboard' route is now protected.
            - A guest trying to visit /dashboard will be redirected by PrivateRoute to /auth.
            - A logged-in user will be allowed to see the DashboardPage.
          */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } 
          />
          
          {/* If you had other protected pages, you would add them here in the same way. */}
          {/*
          <Route 
            path="/settings" 
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            } 
          />
          */}

        </Routes>
      </Router>
    </AuthProvider>
  );
}
