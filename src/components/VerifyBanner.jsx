// File: src/components/VerifyBanner.jsx
// Shown across the dashboard while the logged-in user's email is unverified.
// Lets them resend the verification link. Trade-alert emails only reach verified
// addresses, so this nudges them to confirm. Auto-hides once verified.
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { resendVerification } from "../api/account.js";

export default function VerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState("");

  if (!user || user.isVerified || dismissed) return null;

  const onResend = async () => {
    setStatus("sending");
    try {
      const r = await resendVerification();
      setStatus(r?.sent === false ? "Email service not configured yet — contact admin." : "Sent — check your inbox (and spam).");
    } catch (e) {
      setStatus(e?.response?.data?.message || "Couldn't resend. Try again.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-sm text-amber-300">
      <span>📧 Verify your email{user.email ? ` (${user.email})` : ""} to turn on trade alerts.</span>
      <button
        onClick={onResend}
        disabled={status === "sending"}
        className="rounded-md border border-amber-400/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/10 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Resend link"}
      </button>
      {status && status !== "sending" && <span className="text-xs text-amber-200/80">{status}</span>}
      <button onClick={() => setDismissed(true)} className="ml-auto text-xs text-amber-300/60 hover:text-amber-200">dismiss</button>
    </div>
  );
}
