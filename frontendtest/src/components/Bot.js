import { useBot } from "../hooks/useBot";

export default function BotPage() {
  const { status, loading, error, startBot, stopBot, getBotStatus } = useBot("bot123");

  const handleStart = () => {
    startBot({ symbol: "BTC/USDT", strategy: "scalping" });
  };

  const handleStop = () => {
    stopBot();
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>Status: {status ? JSON.stringify(status) : "Not running"}</p>
      <button onClick={handleStart}>Start Bot</button>
      <button onClick={handleStop}>Stop Bot</button>
      <button onClick={() => getBotStatus()}>Refresh Status</button>
    </div>
  );
}
