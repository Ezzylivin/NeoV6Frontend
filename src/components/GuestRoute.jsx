import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GuestRoute = ({ children }) => {
  const { isAuthenticated, initializing } = useAuth();

  // FE#3: wait for token validation before deciding, to avoid a flash of the
  // auth page for an already-logged-in user (or vice-versa).
  if (initializing) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading…</div>;
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export default GuestRoute;
