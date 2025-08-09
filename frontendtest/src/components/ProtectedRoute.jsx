// File: src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx }) => {
  const { user } = useAuth();

  if (!user) {
    // Not logged in, redirect to login page
    return <Navigate to="/" replace />;
  }

  // Logged in, render the child component(s)
  return children;
};

export default ProtectedRoute;
