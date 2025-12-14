// File: src/main.jsx
// 🚀 UPGRADE: Added Real Wallet Providers (Wagmi + RainbowKit)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 1. Web3 Imports
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, arbitrum, base, polygon } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// 2. Configure Chains
// Note: Get a free Project ID at https://cloud.walletconnect.com for production
const config = getDefaultConfig({
  appName: 'NeoV6 Trading Bot',
  projectId: 'YOUR_PROJECT_ID_HERE', 
  chains: [mainnet, arbitrum, base, polygon],
});

// 3. Setup Query Client (Required by Wagmi)
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* 4. Theme Match: Carbon & Emerald */}
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#34d399', // Emerald-400
            accentColorForeground: 'black', // Text on the button
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
