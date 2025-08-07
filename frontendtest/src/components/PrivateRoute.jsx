// File: src/components/PrivateRoute.jsx (Corrected)

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// 3. Import the useAuth hook to get authentication state
import { useAuth } from '../contexts/AuthProvider.jsx';

// The 'children' prop is now handled by the <Outlet /> component from react-router-dom
// This is the modern way to handle nested routes.
const PrivateRoute = () => {
  const { isAuthenticated } = useAuth(); // Call the hook to check if the user is logged in

  // If the user is authenticated, render the nested child routes (e.g., the DashboardLayout).
  // If not, redirect them to the /auth page.
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default PrivateRoute;
