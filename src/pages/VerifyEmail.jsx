// File: src/pages/VerifyEmail.jsx
// Public page hit from the verification email link (/verify-email?token=...).
// Calls the backend verify endpoint, shows the result, and (if the user is
// logged in on this device) flips the cached user to verified.
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmailToken } from "../api/account.js";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState("verifying"); // verifying | ok | error
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) { setState("error"); setMsg("Missing verification token."); return; }
    verifyEmailToken(token)
      .then((d) => {
        setState("ok");
        setMsg(d?.message || "Your email is verified.");
        try {
          const u = JSON.parse(localStorage.getItem("user") || "null");
          if (u) { u.isVerified = true; localStorage.setItem("user", JSON.stringify(u)); }
        } catch { /* ignore */ }
      })
      .catch((e) => {
        setState("error");
        setMsg(e?.response?.data?.message || "Verification failed or the link expired.");
      });
  }, [token]);

  const icon = state === "ok" ? "✅" : state === "error" ? "⚠️" : "⏳";
  const title = state === "ok" ? "Email verified" : state === "error" ? "Verification problem" : "Verifying…";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f14", color: "#e7eef6", fontFamily: "system-ui,Segoe UI,Arial,sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#131b24", border: "1px solid #1f2b38", borderRadius: 16, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>{icon}</div>
        <h1 style={{ color: "#34d399", margin: "0 0 10px", fontSize: 20 }}>{title}</h1>
        <p style={{ color: "#8aa0b4", fontSize: 14, margin: 0 }}>{msg}</p>
        <Link to="/dashboard/tradingbot" style={{ display: "inline-block", marginTop: 20, background: "#34d399", color: "#04110b", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
          Go to the app
        </Link>
      </div>
    </div>
  );
}
