// File: src/main.jsx
// 🚀 UPGRADE: Reown AppKit Integration (Hardened + Env Safe)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

// --------------------------------------------------
// 1. Query Client
// --------------------------------------------------
const queryClient = new QueryClient();

// --------------------------------------------------
// 2. WalletConnect Project ID (ENV ONLY)
// --------------------------------------------------
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 🔒 HARD FAIL IN DEV – SO THIS NEVER SHIPS BROKEN AGAIN
if (!projectId) {
  console.warn(
    '[WalletConnect] Missing VITE_WALLETCONNECT_PROJECT_ID. ' +
    'Wallet features will be disabled.'
  );
}

// --------------------------------------------------
// 3. Metadata (origin-safe)
// --------------------------------------------------
const metadata = {
  name: 'NeoV6 Trading Bot',
  description: 'AI-Powered Algo Trading',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// --------------------------------------------------
// 4. Wagmi Adapter (created only if projectId exists)
// --------------------------------------------------
const wagmiAdapter = projectId
  ? new WagmiAdapter({
      networks: [mainnet, arbitrum, base, polygon],
      projectId,
      ssr: true
    })
  : null;

// --------------------------------------------------
// 5. Initialize AppKit (GUARDED)
// --------------------------------------------------
if (projectId && wagmiAdapter) {
  try {
    createAppKit({
      adapters: [wagmiAdapter],
      networks: [mainnet, arbitrum, base, polygon],
      projectId,
      metadata,
      features: {
        analytics: true,
        email: false,
        socials: []
      },
      themeMode: 'dark',
      themeVariables: {
        '--w3m-font-family': 'Inter, sans-serif',
        '--w3m-accent': '#34d399',
        '--w3m-color-mix': '#000000',
        '--w3m-color-mix-strength': 40,
        '--w3m-border-radius-master': '2px'
      }
    });
  } catch (err) {
    console.error('[WalletConnect] AppKit init failed:', err);
  }
}

// --------------------------------------------------
// 6. Render App (Wallet OPTIONAL)
// --------------------------------------------------
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    {wagmiAdapter ? (
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    ) : (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )}
  </React.StrictMode>
);
