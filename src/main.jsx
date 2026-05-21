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
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || "YOUR_ALCHEMY_API_KEY_HERE";

// 2. Configure Chains with Private Gateways
const config = getDefaultConfig({
  appName: 'NeoV6 Trading Bot',
  projectId: '5ddc52321c8690bb3e185eee432086df', 
  chains: [mainnet, arbitrum, base, polygon],
  ssr: true, 
  
  // 🚀 ARCHITECTURAL UPGRADE: Router completely bypasses public nodes
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, { batch: true, pollingInterval: 30000 }),
    [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, { batch: true, pollingInterval: 30000 }),
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, { batch: true, pollingInterval: 30000 }),
    [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, { batch: true, pollingInterval: 30000 }),
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
