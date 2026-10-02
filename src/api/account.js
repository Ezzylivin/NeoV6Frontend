// File: src/api/account.js
// Email verification endpoints (Node backend proxies nothing here — these are the
// backend's own user routes). verifyEmailToken is called from the public /verify-email
// page; resendVerification is called from the in-app banner (requires login).
import api from "./apiClient.js";

export const verifyEmailToken = async (token) => {
  const res = await api.get(`/users/verify/${encodeURIComponent(token)}`);
  return res.data;
};

export const resendVerification = async () => {
  const res = await api.post("/users/resend-verification");
  return res.data;
};

// Change the logged-in user's email. Backend resets verification and emails the
// NEW address a fresh verification link. Returns { email, isVerified:false, sent }.
export const updateEmail = async (email) => {
  const res = await api.put("/users/email", { email });
  return res.data;
};

// Start a password reset — backend emails a reset link. Always resolves (no leak).
export const requestPasswordReset = async (email) => {
  const res = await api.post("/users/forgot-password", { email });
  return res.data;
};

// Complete a password reset with the emailed token + a new password.
export const resetPassword = async (token, password) => {
  const res = await api.post("/users/reset-password", { token, password });
  return res.data;
};
