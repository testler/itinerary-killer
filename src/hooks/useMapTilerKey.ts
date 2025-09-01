import { useState, useEffect } from 'react';

interface MapTilerKeyState {
  key: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useMapTilerKey(): MapTilerKeyState {
  const [key, setKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = async () => {
    setLoading(true);
    setError(null);

    try {
      // First try to get the proxy URL from runtime config or env
      let proxyUrl: string | undefined = import.meta.env.VITE_GOOGLE_PROXY_URL as string | undefined;
      
      if (!proxyUrl) {
        try {
          const baseUrl: string = import.meta.env.BASE_URL || '/';
          const rc = await fetch(baseUrl + 'runtime-config.json', { cache: 'no-store' });
          if (rc.ok) {
            const json = await rc.json();
            proxyUrl = json?.VITE_GOOGLE_PROXY_URL;
          }
        } catch {
          // Ignore runtime config fetch errors
        }
      }

      if (!proxyUrl) {
        throw new Error('Cloudflare endpoint URL not configured');
      }

      // Fetch the keys from the Cloudflare endpoint
      const u = new URL(proxyUrl);
      u.pathname = '/keys';
      
      const response = await fetch(u.toString(), { 
        method: 'GET', 
        mode: 'cors',
        // Add timeout to handle slow networks
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch keys: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.MAPTILER_KEY) {
        throw new Error('MAPTILER_KEY not found in response');
      }

      setKey(data.MAPTILER_KEY);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch MapTiler key:', err);
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    fetchKey();
  };

  useEffect(() => {
    fetchKey();
  }, []);

  return { key, loading, error, retry };
}
