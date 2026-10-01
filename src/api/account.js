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
