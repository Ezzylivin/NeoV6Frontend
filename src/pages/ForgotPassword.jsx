// File: src/pages/ForgotPassword.jsx
// Public page: enter your email to get a password-reset link. Always shows the
// same confirmation whether or not the email exists (no account enumeration).
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/account.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending"); setMsg("");
    try {
      const r = await requestPasswordReset(email.trim());
      setMsg(r?.message || "If that email is registered, a reset link is on its way.");
    } catch (e2) {
      setMsg(e2?.response?.data?.message || "Something went wrong — try again.");
    }
    setState("sent");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f14", color: "#e7eef6", fontFamily: "system-ui,Segoe UI,Arial,sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#131b24", border: "1px solid #1f2b38", borderRadius: 16, padding: 28 }}>
        <h1 style={{ color: "#34d399", margin: "0 0 6px", fontSize: 20 }}>Reset your password</h1>
        <p style={{ color: "#8aa0b4", fontSize: 13, margin: "0 0 18px" }}>Enter your account email and we'll send a reset link.</p>
        {state === "sent" ? (
          <>
            <p style={{ color: "#e7eef6", fontSize: 14 }}>{msg}</p>
            <p style={{ color: "#6b7684", fontSize: 12, marginTop: 10 }}>Check your inbox (and spam). The link expires in 1 hour.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoFocus
              style={{ width: "100%", background: "#0b0f14", border: "1px solid #1f2b38", borderRadius: 10, padding: "11px 14px", color: "#e7eef6", fontSize: 14, boxSizing: "border-box" }}
            />
            <button type="submit" disabled={state === "sending" || !email.trim()}
              style={{ width: "100%", marginTop: 14, background: "#34d399", color: "#04110b", padding: "11px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: state === "sending" ? 0.6 : 1 }}>
              {state === "sending" ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <Link to="/" style={{ display: "inline-block", marginTop: 18, color: "#8aa0b4", fontSize: 13, textDecoration: "none" }}>← Back to sign in</Link>
      </div>
    </div>
  );
}
