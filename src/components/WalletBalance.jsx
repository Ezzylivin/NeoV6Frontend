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

  return (
    <span className="font-mono text-emerald-400">
      {parseFloat(data?.formatted).toFixed(4)} {data?.symbol}
    </span>
  );
};

export default WalletBalance;
