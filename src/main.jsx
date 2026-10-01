// File: src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

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
    <WagmiProvider config={config}>
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
