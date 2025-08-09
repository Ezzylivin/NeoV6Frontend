// File: src/components/PrivateRoute.jsx (Corrected Version)

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// 1. The import statement is a complete, clean line.
import { useAuth } from '../context/AuthContext.jsx';

// 2. The component definition starts on a new, clean line.
//    It uses the modern 'Outlet' approach for nested routes.
const PrivateRoute = () => {
  // 3. Call the hook to get the user's authentication status.
  const { isAuthenticated } = useAuth();

  // 4. Return the Outlet if authenticated, otherwise redirect to the auth page.
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default PrivateRoute;
