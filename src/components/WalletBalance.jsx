import React from 'react';
import { useAccount, useBalance } from 'wagmi';

const WalletBalance = () => {
  const { address, isConnected } = useAccount();
  
  // Fetch native balance (ETH, MATIC, etc. based on network)
  const { data, isError, isLoading } = useBalance({
    address: address,
  });

  if (!isConnected) return <span className="text-neutral-500">--</span>;
  if (isLoading) return <span className="animate-pulse text-neutral-500">Loading...</span>;
  if (isError) return <span className="text-red-400">Error</span>;

  // FE#17: guard the brief window where data is still undefined but not loading —
  // parseFloat(undefined).toFixed() renders "NaN".
  const amount = Number.parseFloat(data?.formatted);
  return (
    <span className="font-mono text-emerald-400">
      {Number.isFinite(amount) ? amount.toFixed(4) : "--"} {data?.symbol || ""}
    </span>
  );
};

export default WalletBalance;
