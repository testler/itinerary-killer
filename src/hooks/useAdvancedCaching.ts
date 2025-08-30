import { useEffect, useCallback, useRef } from 'react';
import { useServiceWorker } from './useServiceWorker';

interface CacheStrategy {
  name: string;
  priority: 'high' | 'medium' | 'low';
  maxAge: number; // milliseconds
  maxSize: number; // number of items
}

interface PreloadItem {
  url: string;
  type: 'image' | 'script' | 'style' | 'data';
  priority: number;
  estimatedSize: number;
}

export const useAdvancedCaching = () => {
  const { cacheMapTiles, getCacheInfo, clearCache } = useServiceWorker();
  const preloadQueue = useRef<PreloadItem[]>([]);
  const connectionInfo = useRef<any>(null);
  const userBehavior = useRef<Record<string, number>>({});

  // Cache strategies for different content types
  const cacheStrategies: Record<string, CacheStrategy> = {
    mapTiles: {
      name: 'Map Tiles',
      priority: 'high',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000
    },
    images: {
      name: 'Images',
      priority: 'medium',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 500
    },
    apiResponses: {
      name: 'API Responses',
      priority: 'medium',
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxSize: 200
    },
    staticAssets: {
      name: 'Static Assets',
      priority: 'high',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxSize: 100
    }
  };

  // Get connection information
  const getConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      return {
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        saveData: conn.saveData || false
      };
    }
    return null;
  }, []);

  // Determine optimal cache strategy based on connection
  const getOptimalCacheStrategy = useCallback((contentType: string) => {
    const connection = getConnectionInfo();
    const baseStrategy = cacheStrategies[contentType] || cacheStrategies.staticAssets;

    if (!connection) return baseStrategy;

    // Adjust strategy based on connection quality
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return {
        ...baseStrategy,
        maxAge: baseStrategy.maxAge * 2, // Cache longer on slow connections
        maxSize: Math.floor(baseStrategy.maxSize * 0.5) // Reduce cache size
      };
    }

    if (connection.effectiveType === '3g') {
      return {
        ...baseStrategy,
        maxAge: baseStrategy.maxAge * 1.5,
        maxSize: Math.floor(baseStrategy.maxSize * 0.8)
      };
    }

    // Fast connection - use aggressive caching
    if (connection.effectiveType === '4g') {
      return {
        ...baseStrategy,
        maxAge: baseStrategy.maxAge,
        maxSize: Math.floor(baseStrategy.maxSize * 1.2)
      };
    }

    return baseStrategy;
  }, [getConnectionInfo]);

  // Predictive preloading based on user behavior
  const predictAndPreload = useCallback(async () => {
    const behavior = userBehavior.current;
    const predictions: PreloadItem[] = [];

    // Analyze user behavior patterns
    if (behavior['add-item'] > 2) {
      // User frequently adds items - preload add modal
      predictions.push({
        url: '/src/components/AddItemModal.tsx',
        type: 'script',
        priority: 0.8,
        estimatedSize: 50
      });
    }

    if (behavior['view-map'] > 3) {
      // User frequently views map - preload map tiles
      const currentViewport = getCurrentMapViewport();
      if (currentViewport) {
        const tileUrls = generateTileUrls(currentViewport);
        predictions.push(...tileUrls.map(url => ({
          url,
          type: 'image',
          priority: 0.9,
          estimatedSize: 20
        })));
      }
    }

    if (behavior['import-data'] > 1) {
      // User imports data - preload import modal
      predictions.push({
        url: '/src/components/ImportJsonModal.tsx',
        type: 'script',
        priority: 0.7,
        estimatedSize: 40
      });
    }

    // Sort by priority and add to preload queue
    predictions.sort((a, b) => b.priority - a.priority);
    preloadQueue.current.push(...predictions);

    // Execute preloading
    await executePreloadQueue();
  }, []);

  // Execute preload queue
  const executePreloadQueue = useCallback(async () => {
    const connection = getConnectionInfo();
    const maxConcurrent = connection?.effectiveType === '4g' ? 6 : 
                         connection?.effectiveType === '3g' ? 4 : 2;

    const items = preloadQueue.current.splice(0, maxConcurrent);
    
    const preloadPromises = items.map(async (item) => {
      try {
        switch (item.type) {
          case 'image':
            await preloadImage(item.url);
            break;
          case 'script':
            await preloadScript(item.url);
            break;
          case 'style':
            await preloadStyle(item.url);
            break;
          case 'data':
            await preloadData(item.url);
            break;
        }
        console.log(`📥 Preloaded: ${item.url}`);
      } catch (error) {
        console.log(`❌ Failed to preload: ${item.url}`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }, [getConnectionInfo]);

  // Preload image
  const preloadImage = useCallback((url: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  // Preload script
  const preloadScript = useCallback((url: string) => {
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }, []);

  // Preload style
  const preloadStyle = useCallback((url: string) => {
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }, []);

  // Preload data
  const preloadData = useCallback(async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to preload data');
    return response.json();
  }, []);

  // Track user behavior for predictive loading
  const trackUserAction = useCallback((action: string) => {
    userBehavior.current[action] = (userBehavior.current[action] || 0) + 1;
    
    // Trigger predictive preloading after certain thresholds
    if (userBehavior.current[action] % 3 === 0) {
      predictAndPreload();
    }
  }, [predictAndPreload]);

  // Intelligent map tile caching
  const cacheMapTilesIntelligently = useCallback(async (center: [number, number], zoom: number) => {
    const connection = getConnectionInfo();
    const strategy = getOptimalCacheStrategy('mapTiles');
    
    // Determine caching radius based on connection quality
    let radius = 1; // Default: cache 1 tile radius
    if (connection?.effectiveType === '4g') radius = 3;
    else if (connection?.effectiveType === '3g') radius = 2;
    else if (connection?.effectiveType === '2g') radius = 1;
    
    const tileUrls = generateTileUrlsForArea(center, zoom, radius);
    
    try {
      await cacheMapTiles(tileUrls);
      console.log(`🗺️ Cached ${tileUrls.length} map tiles intelligently`);
    } catch (error) {
      console.error('❌ Failed to cache map tiles intelligently:', error);
    }
  }, [cacheMapTiles, getConnectionInfo, getOptimalCacheStrategy]);

  // Generate tile URLs for a specific area
  const generateTileUrlsForArea = useCallback((center: [number, number], zoom: number, radius: number) => {
    const urls: string[] = [];
    const [lat, lng] = center;
    
    // Convert lat/lng to tile coordinates
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    
    // Generate URLs for tiles in radius
    for (let x = xtile - radius; x <= xtile + radius; x++) {
      for (let y = ytile - radius; y <= ytile + radius; y++) {
        if (x >= 0 && x < n && y >= 0 && y < n) {
          urls.push(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
        }
      }
    }
    
    return urls;
  }, []);

  // Get current map viewport (placeholder - implement based on your map library)
  const getCurrentMapViewport = useCallback(() => {
    // This should return the current map bounds
    // Implementation depends on your map library (Leaflet, Google Maps, etc.)
    return null;
  }, []);

  // Generate tile URLs (placeholder)
  const generateTileUrls = useCallback((viewport: any) => {
    // Implementation depends on your map library
    return [];
  }, []);

  // Cache management
  const manageCache = useCallback(async () => {
    try {
      const cacheInfo = await getCacheInfo();
      const connection = getConnectionInfo();
      
      // Implement cache eviction based on strategies
      for (const [cacheName, info] of Object.entries(cacheInfo)) {
        const strategy = cacheStrategies[cacheName] || cacheStrategies.staticAssets;
        
        if (info.size > strategy.maxSize) {
          console.log(`🗑️ Cache ${cacheName} exceeds size limit, clearing...`);
          await clearCache(cacheName);
        }
      }
    } catch (error) {
      console.error('❌ Failed to manage cache:', error);
    }
  }, [getCacheInfo, clearCache, getConnectionInfo]);

  // Initialize connection monitoring
  useEffect(() => {
    connectionInfo.current = getConnectionInfo();
    
    // Monitor connection changes
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      const handleChange = () => {
        connectionInfo.current = getConnectionInfo();
        console.log('📡 Connection changed:', connectionInfo.current);
        
        // Adjust caching strategy based on new connection
        manageCache();
      };
      
      conn.addEventListener('change', handleChange);
      return () => conn.removeEventListener('change', handleChange);
    }
  }, [getConnectionInfo, manageCache]);

  // Periodic cache management
  useEffect(() => {
    const interval = setInterval(() => {
      manageCache();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [manageCache]);

  return {
    // Cache strategies
    cacheStrategies,
    getOptimalCacheStrategy,
    
    // Preloading
    predictAndPreload,
    executePreloadQueue,
    
    // User behavior tracking
    trackUserAction,
    userBehavior: userBehavior.current,
    
    // Map tile caching
    cacheMapTilesIntelligently,
    
    // Cache management
    manageCache,
    
    // Connection info
    connectionInfo: connectionInfo.current,
    getConnectionInfo
  };
};

export default useAdvancedCaching;
