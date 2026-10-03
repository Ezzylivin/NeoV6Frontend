// File: src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ── Stale-chunk auto-recovery ──────────────────────────────────────────────
// After a deploy, a long-open tab still references the OLD code-split chunk
// hashes; those files no longer exist, so a lazy import (e.g. a route page)
// 404s and the page goes blank. Detect that specific failure and reload ONCE to
// pick up the fresh index + chunks. A short-lived sessionStorage guard prevents
// reload loops if a chunk is genuinely missing (broken build).
const CHUNK_GUARD = "neov6_chunk_reload";
const looksLikeStaleChunk = (msg = "") =>
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically imported module|'text\/html'/i.test(String(msg));
function recoverFromStaleChunk() {
  try {
    if (sessionStorage.getItem(CHUNK_GUARD)) return; // already tried this session
    sessionStorage.setItem(CHUNK_GUARD, String(Date.now()));
  } catch { /* ignore */ }
  window.location.reload();
}
window.addEventListener("vite:preloadError", (e) => { try { e.preventDefault(); } catch { /* ignore */ } recoverFromStaleChunk(); });
window.addEventListener("error", (e) => { if (looksLikeStaleChunk(e?.message)) recoverFromStaleChunk(); });
window.addEventListener("unhandledrejection", (e) => { if (looksLikeStaleChunk(e?.reason?.message || e?.reason)) recoverFromStaleChunk(); });
// Clear the guard once the app has stayed up a few seconds (a healthy load), so
// a LATER deploy in the same session can auto-recover too — without looping.
setTimeout(() => { try { sessionStorage.removeItem(CHUNK_GUARD); } catch { /* ignore */ } }, 8000);

// RainbowKit + Wagmi Imports
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi'; 
import { mainnet, arbitrum, base, polygon } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// 1. Setup Query Client
const queryClient = new QueryClient();

// 🚀 SECURITY PRACTICE: Pull your Alchemy Key from a .env file
// If you want to quick-test it, you can replace this with your raw string key temporarily: "YOUR_KEY_HERE"
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
// FE#14: when the Alchemy key is missing, DON'T point the transports at a broken
// '.../v2/YOUR_ALCHEMY_API_KEY_HERE' URL — that floods the console with CORS/RPC
// failures and wedges the wallet connector (which blocks the Live Bot page).
// Fall back to each chain's default PUBLIC RPC instead (http() with no url).
if (!ALCHEMY_KEY) {
  console.warn("⚠️ VITE_ALCHEMY_API_KEY not set — using public RPC endpoints. Set it in Vercel for higher-rate private RPC.");
}
// Alchemy transport when keyed, else the chain's default public RPC.
const rpc = (subdomain) =>
  ALCHEMY_KEY
    ? http(`https://${subdomain}.g.alchemy.com/v2/${ALCHEMY_KEY}`, { batch: true, pollingInterval: 30000 })
    : http();

// 2. Configure Chains with Private Gateways
const config = getDefaultConfig({
  appName: 'NeoV6 Trading Bot',
  projectId: '5ddc52321c8690bb3e185eee432086df', 
  chains: [mainnet, arbitrum, base, polygon],
  ssr: true, 
  
  // 🚀 ARCHITECTURAL UPGRADE: Router completely bypasses public nodes
  transports: {
    [mainnet.id]:  rpc('eth-mainnet'),
    [arbitrum.id]: rpc('arb-mainnet'),
    [base.id]:     rpc('base-mainnet'),
    [polygon.id]:  rpc('polygon-mainnet'),
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    {/* reconnectOnMount=false: don't auto-reconnect the stored wallet on every
        page load — that popped the "continue in Base Account" prompt and wedged
        pages that don't use a wallet (the whole app is paper + JWT now). Users
        can still connect manually via the wallet button for any wallet feature. */}
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#34d399', // Emerald-400
            accentColorForeground: 'black',
            borderRadius: 'medium',
            overlayBlur: 'small',
          })}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
