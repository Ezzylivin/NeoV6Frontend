// File: src/pages/ResetPassword.jsx
// Public page hit from the reset-password email link (/reset-password?token=...).
// Lets the user set a new password, validates it, and sends them to sign in.
import React, { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/account.js";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | done | error
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setMsg("Passwords don't match."); return; }
    setState("saving"); setMsg("");
    try {
      await resetPassword(token, pw);
      setState("done");
      setMsg("Password updated. Redirecting to sign in…");
      setTimeout(() => navigate("/"), 1800);
    } catch (e2) {
      setState("error");
      setMsg(e2?.response?.data?.message || "Reset failed or the link expired.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f14", color: "#e7eef6", fontFamily: "system-ui,Segoe UI,Arial,sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#131b24", border: "1px solid #1f2b38", borderRadius: 16, padding: 28 }}>
        <h1 style={{ color: "#34d399", margin: "0 0 6px", fontSize: 20 }}>Choose a new password</h1>
        {!token ? (
          <p style={{ color: "#f87171", fontSize: 14 }}>Missing reset token. Request a new link from the sign-in page.</p>
        ) : state === "done" ? (
          <p style={{ color: "#34d399", fontSize: 14 }}>{msg}</p>
        ) : (
          <form onSubmit={submit}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8 chars)" autoFocus
              style={{ width: "100%", background: "#0b0f14", border: "1px solid #1f2b38", borderRadius: 10, padding: "11px 14px", color: "#e7eef6", fontSize: 14, boxSizing: "border-box" }} />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password"
              style={{ width: "100%", marginTop: 10, background: "#0b0f14", border: "1px solid #1f2b38", borderRadius: 10, padding: "11px 14px", color: "#e7eef6", fontSize: 14, boxSizing: "border-box" }} />
            {msg && <p style={{ color: state === "error" ? "#f87171" : "#8aa0b4", fontSize: 12, marginTop: 10 }}>{msg}</p>}
            <button type="submit" disabled={state === "saving"}
              style={{ width: "100%", marginTop: 14, background: "#34d399", color: "#04110b", padding: "11px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: state === "saving" ? 0.6 : 1 }}>
              {state === "saving" ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
        <Link to="/" style={{ display: "inline-block", marginTop: 18, color: "#8aa0b4", fontSize: 13, textDecoration: "none" }}>← Back to sign in</Link>
      </div>
    </div>
  );
}
