// ./components/Header.jsx
// 🚀 THEME UPDATE: "Carbon Grey & Emerald" + REAL WALLET

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-6 py-4">
      
      {/* BRANDING */}
      <Link to="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-emerald-400 hover:opacity-80 transition-opacity">
        <span className="text-xl">⬢</span> NeoV6
      </Link>
      
      {/* NAVIGATION & WALLET */}
      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Dashboard
          </Link>
          <Link to="/dashboard/backtests" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Backtests
          </Link>
          <Link to="/dashboard/strategies" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Strategies
          </Link>
          <Link to="/dashboard/tradingbot" className="text-sm font-medium text-neutral-300 hover:text-emerald-400 transition-colors">
            Live Bot
          </Link>
        </nav>

        {/* 🚀 REAL WALLET CONNECTION BUTTON */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus || authenticationStatus === 'authenticated');

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button 
                        onClick={openConnectModal} 
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/50 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all"
                      >
                        CONNECT WALLET
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button 
                        onClick={openChainModal} 
                        className="rounded-lg bg-red-500/10 border border-red-500/50 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        WRONG NETWORK
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-3">
                      {/* Network Switcher */}
                      <button
                        onClick={openChainModal}
                        className="flex items-center gap-2 rounded-lg bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                      >
                        {chain.hasIcon && (
                          <div
                            style={{
                              background: chain.iconBackground,
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              overflow: 'hidden',
                              marginRight: 4,
                            }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                style={{ width: 20, height: 20 }}
                              />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </button>

                      {/* Account Balance & Address */}
                      <button 
                        onClick={openAccountModal} 
                        className="flex items-center gap-3 rounded-lg bg-[#1a1a1a] border border-white/10 px-4 py-2 hover:border-emerald-500/50 transition-colors group"
                      >
                        <span className="text-sm font-medium text-neutral-300 group-hover:text-emerald-400">
                          {account.displayBalance
                            ? `(${account.displayBalance})`
                            : ''}
                        </span>
                        <span className="text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                          {account.displayName}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
};

export default Header;
