// File: src/components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, initializing } = useAuth();
  // FE#3: wait for the async token validation before deciding. Otherwise an
  // expired/revoked token in localStorage renders the dashboard (and fires a
  // burst of 401 calls) for a frame before the redirect.
  if (initializing) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading…</div>;
  }
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;
