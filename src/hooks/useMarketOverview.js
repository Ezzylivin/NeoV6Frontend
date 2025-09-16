import { useState, useEffect } from "react";
import * as dataApi from "../api/data.js";

export function useMarketOverview() {
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dataApi.fetchCombinedMacroData();
        setMarketData(data || {});
      } catch (err) {
        console.error("Failed to fetch market overview data:", err);
        setError("Failed to load market overview data.");
      } finally {
        setLoading(false);
      }
    };
    fetchMarketData();
  }, []);

  return { marketData, loading, error };
}
