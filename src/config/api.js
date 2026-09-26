// Central API base URLs. Override per environment with Vite env vars:
//   VITE_API_URL       -> main backend (Node/Express on Render), e.g. https://your-backend.onrender.com
//   VITE_CRYPTO_API_URL-> crypto market-data service (Flask), including the /api suffix
//
// Everything that talks to the backend must import from here so there is a
// single source of truth (previously 5+ files hardcoded divergent URLs, some
// wrongly defaulting to the ML port).

const stripTrailing = (u) => u.replace(/\/$/, "").replace(/\/api$/, "");

// Main backend base (no trailing /api). SOCKET_URL connects here too.
export const BACKEND_URL = stripTrailing(
  import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com"
);

// Main backend REST base (with /api).
export const API_BASE = `${BACKEND_URL}/api`;

// Crypto market-data service (Flask) REST base (includes /api).
export const CRYPTO_API = (
  import.meta.env.VITE_CRYPTO_API_URL || "https://crypto-lpzi.onrender.com/api"
).replace(/\/$/, "");
