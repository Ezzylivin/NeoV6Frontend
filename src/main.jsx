// File: src/main.jsx
// 🚀 UPGRADE: Reown AppKit Integration (v1.7.7+)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. Setup Query Client
const queryClient = new QueryClient();

// 2. Project ID (From Cloud Dashboard)
const projectId = 'PASTE_YOUR_ID_HERE'; 

// 3. Metadata
const metadata = {
  name: 'NeoV6 Trading Bot',
  description: 'AI-Powered Algo Trading',
  url: 'https://neov6.app', // Update with your actual domain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, arbitrum, base, polygon],
  projectId,
  ssr: true
});

// 5. Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, arbitrum, base, polygon],
  projectId,
  metadata,
  features: {
    analytics: true,
    email: false, // Optional: Turn off email login if you want pure crypto
    socials: [],  // Optional: Turn off social login
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-font-family': 'Inter, sans-serif',
    '--w3m-accent': '#34d399', // Emerald-400
    '--w3m-color-mix': '#000000',
    '--w3m-color-mix-strength': 40,
    '--w3m-border-radius-master': '2px'
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
