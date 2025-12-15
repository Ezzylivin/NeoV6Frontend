// File: src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

// 1. Setup Query Client
const queryClient = new QueryClient();

// 2. Get Project ID
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 3. Metadata
const metadata = {
  name: 'NeoV6 Trading Bot',
  description: 'AI-Powered Algo Trading',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const root = ReactDOM.createRoot(document.getElementById('root'));

// 🛡️ SAFETY CHECK: If ID is missing, don't even try to render the App
if (!projectId) {
  console.error("❌ Missing VITE_WALLETCONNECT_PROJECT_ID in .env file");
  root.render(
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#121212', 
      color: '#ef4444',
      fontFamily: 'monospace' 
    }}>
      <h1 style={{ fontSize: '2rem' }}>Configuration Error</h1>
      <p>Missing <code>VITE_WALLETCONNECT_PROJECT_ID</code></p>
      <p style={{ color: '#888', marginTop: '1rem' }}>
        Please add your Project ID to the <code>.env</code> file and restart the server.
      </p>
    </div>
  );
} else {
  // 4. Initialize AppKit ONLY if ID exists
  const wagmiAdapter = new WagmiAdapter({
    networks: [mainnet, arbitrum, base, polygon],
    projectId,
    ssr: true
  });

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

  // 5. Render App
  root.render(
    <React.StrictMode>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
}
