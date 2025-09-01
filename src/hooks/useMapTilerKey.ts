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
      console.log('Initial proxyUrl from env:', proxyUrl);
      
      if (!proxyUrl) {
        try {
          const baseUrl: string = import.meta.env.BASE_URL || '/';
          console.log('Trying to fetch runtime config from:', baseUrl + 'runtime-config.json');
          const rc = await fetch(baseUrl + 'runtime-config.json', { cache: 'no-store' });
          if (rc.ok) {
            const json = await rc.json();
            proxyUrl = json?.VITE_GOOGLE_PROXY_URL;
            console.log('ProxyUrl from runtime config:', proxyUrl);
          }
        } catch (configError) {
          console.warn('Failed to fetch runtime config:', configError);
        }
      }

      if (!proxyUrl) {
        throw new Error('Cloudflare endpoint URL not configured. Check VITE_GOOGLE_PROXY_URL env var or runtime-config.json');
      }

      // Fetch the keys from the Cloudflare endpoint
      const u = new URL(proxyUrl);
      u.pathname = '/keys';
      
      console.log('Fetching MapTiler key from:', u.toString());
      
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
      console.log('Response data keys:', Object.keys(data));
      
      if (!data.MAPTILER_KEY) {
        throw new Error('MAPTILER_KEY not found in response. Available keys: ' + Object.keys(data).join(', '));
      }

      console.log('Successfully fetched MapTiler key');
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
