// File: src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// RainbowKit + Wagmi Imports
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, arbitrum, base, polygon } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// 1. Setup Query Client
const queryClient = new QueryClient();

// 2. Configure Chains
// You can use the SAME Project ID you generated earlier
const config = getDefaultConfig({
  appName: 'NeoV6 Trading Bot',
  projectId: '5ddc52321c8690bb3e185eee432086df', // Your ID works here too!
  chains: [mainnet, arbitrum, base, polygon],
  ssr: true, // Prevents hydration errors
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Theme: Matches your Emerald/Carbon look */}
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
