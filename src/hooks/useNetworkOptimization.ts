import { useEffect, useCallback, useRef, useState } from 'react';
import { useServiceWorker } from './useServiceWorker';

interface NetworkQuality {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface BatchedRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  priority: number;
  timestamp: number;
}

interface RequestBatch {
  id: string;
  requests: BatchedRequest[];
  maxDelay: number;
  createdAt: number;
}

export const useNetworkOptimization = () => {
  const { requestBackgroundSync } = useServiceWorker();
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const requestQueue = useRef<BatchedRequest[]>([]);
  const activeBatches = useRef<Map<string, RequestBatch>>(new Map());
  const connectionMonitor = useRef<any>(null);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);

  // Network quality thresholds
  const NETWORK_THRESHOLDS = {
    excellent: { downlink: 10, rtt: 50 },
    good: { downlink: 5, rtt: 100 },
    fair: { downlink: 2, rtt: 200 },
    poor: { downlink: 0.5, rtt: 500 }
  };

  // Get current network quality
  const getNetworkQuality = useCallback((): NetworkQuality | null => {
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

  // Determine optimal batch size based on network quality
  const getOptimalBatchSize = useCallback((quality: NetworkQuality): number => {
    if (quality.effectiveType === '4g' && quality.downlink > 10) return 10;
    if (quality.effectiveType === '4g') return 8;
    if (quality.effectiveType === '3g') return 5;
    if (quality.effectiveType === '2g') return 3;
    return 2; // Default for slow connections
  }, []);

  // Determine optimal batch delay based on network quality
  const getOptimalBatchDelay = useCallback((quality: NetworkQuality): number => {
    if (quality.effectiveType === '4g' && quality.rtt < 50) return 100; // 100ms
    if (quality.effectiveType === '4g') return 200; // 200ms
    if (quality.effectiveType === '3g') return 500; // 500ms
    if (quality.effectiveType === '2g') return 1000; // 1 second
    return 2000; // 2 seconds for very slow connections
  }, []);

  // Add request to batch queue
  const addToBatch = useCallback((request: Omit<BatchedRequest, 'id' | 'timestamp'>) => {
    const batchedRequest: BatchedRequest = {
      ...request,
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // Add to queue based on priority
    const insertIndex = requestQueue.current.findIndex(
      req => req.priority < batchedRequest.priority
    );
    
    if (insertIndex === -1) {
      requestQueue.current.push(batchedRequest);
    } else {
      requestQueue.current.splice(insertIndex, 0, batchedRequest);
    }

    // Schedule batch processing
    scheduleBatchProcessing();
  }, []);

  // Schedule batch processing
  const scheduleBatchProcessing = useCallback(() => {
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }

    const quality = getNetworkQuality();
    if (!quality) return;

    const delay = getOptimalBatchDelay(quality);
    
    batchTimer.current = setTimeout(() => {
      processBatch();
    }, delay);
  }, [getNetworkQuality, getOptimalBatchDelay]);

  // Process request batch
  const processBatch = useCallback(async () => {
    if (requestQueue.current.length === 0) return;

    const quality = getNetworkQuality();
    if (!quality) return;

    const batchSize = getOptimalBatchSize(quality);
    const batchId = `batch_${Date.now()}`;
    
    // Take requests up to batch size
    const requests = requestQueue.current.splice(0, batchSize);
    
    const batch: RequestBatch = {
      id: batchId,
      requests,
      maxDelay: getOptimalBatchDelay(quality),
      createdAt: Date.now()
    };

    activeBatches.current.set(batchId, batch);
    
    try {
      console.log(`📦 Processing batch ${batchId} with ${requests.length} requests`);
      await executeBatch(batch);
      console.log(`✅ Batch ${batchId} completed successfully`);
    } catch (error) {
      console.error(`❌ Batch ${batchId} failed:`, error);
      
      // Re-queue failed requests with lower priority
      requests.forEach(req => {
        req.priority = Math.max(0, req.priority - 1);
        requestQueue.current.push(req);
      });
    } finally {
      activeBatches.current.delete(batchId);
    }
  }, [getNetworkQuality, getOptimalBatchSize, getOptimalBatchDelay]);

  // Execute batch of requests
  const executeBatch = useCallback(async (batch: RequestBatch) => {
    const { requests } = batch;
    const quality = getNetworkQuality();
    
    if (!quality) {
      throw new Error('Network quality information unavailable');
    }

    // Group requests by type for optimization
    const getRequests = requests.filter(req => req.method === 'GET');
    const postRequests = requests.filter(req => req.method === 'POST');
    const putRequests = requests.filter(req => req.method === 'PUT');
    const deleteRequests = requests.filter(req => req.method === 'DELETE');

    // Execute requests in parallel based on network quality
    const maxConcurrent = quality.effectiveType === '4g' ? 6 : 
                         quality.effectiveType === '3g' ? 4 : 2;

    const results = [];

    // Process GET requests (can be parallel)
    if (getRequests.length > 0) {
      const chunks = chunkArray(getRequests, maxConcurrent);
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(req => executeRequest(req))
        );
        results.push(...chunkResults);
      }
    }

    // Process other requests (sequential for data integrity)
    for (const req of [...postRequests, ...putRequests, ...deleteRequests]) {
      try {
        const result = await executeRequest(req);
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }

    return results;
  }, [getNetworkQuality]);

  // Execute individual request
  const executeRequest = useCallback(async (request: BatchedRequest) => {
    const { url, method, data } = request;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': request.id,
        'X-Batch-Processing': 'true'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Chunk array into smaller arrays
  const chunkArray = useCallback(<T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }, []);

  // Adaptive image quality based on network
  const getAdaptiveImageQuality = useCallback((baseUrl: string): string => {
    const quality = getNetworkQuality();
    if (!quality) return baseUrl;

    // Adjust image quality based on network conditions
    if (quality.effectiveType === '4g' && quality.downlink > 10) {
      return baseUrl; // Full quality
    } else if (quality.effectiveType === '4g') {
      return baseUrl.replace(/\.(jpg|png)$/, '_medium.$1');
    } else if (quality.effectiveType === '3g') {
      return baseUrl.replace(/\.(jpg|png)$/, '_low.$1');
    } else {
      return baseUrl.replace(/\.(jpg|png)$/, '_verylow.$1');
    }
  }, [getNetworkQuality]);

  // Adaptive loading strategy
  const getAdaptiveLoadingStrategy = useCallback(() => {
    const quality = getNetworkQuality();
    if (!quality) return 'conservative';

    if (quality.effectiveType === '4g' && quality.downlink > 10) {
      return 'aggressive'; // Load everything
    } else if (quality.effectiveType === '4g') {
      return 'balanced'; // Load most things
    } else if (quality.effectiveType === '3g') {
      return 'conservative'; // Load essential things
    } else {
      return 'minimal'; // Load only critical things
    }
  }, [getNetworkQuality]);

  // Request background sync for offline requests
  const requestOfflineSync = useCallback(async (tag: string, data?: any) => {
    try {
      await requestBackgroundSync(tag, data);
      console.log('🔄 Background sync requested for offline operation');
    } catch (error) {
      console.error('❌ Failed to request background sync:', error);
      throw error;
    }
  }, [requestBackgroundSync]);

  // Monitor network connection
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      setIsOnline(true);
      
      // Process any queued requests
      if (requestQueue.current.length > 0) {
        scheduleBatchProcessing();
      }
    };

    const handleOffline = () => {
      console.log('📱 Network connection lost');
      setIsOnline(false);
      
      // Clear batch timer
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
        batchTimer.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [scheduleBatchProcessing]);

  // Monitor connection quality changes
  useEffect(() => {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      
      const handleConnectionChange = () => {
        const quality = getNetworkQuality();
        setNetworkQuality(quality);
        
        if (quality) {
          console.log('📡 Network quality changed:', quality);
          
          // Adjust batch processing based on new quality
          if (requestQueue.current.length > 0) {
            scheduleBatchProcessing();
          }
        }
      };

      // Set initial quality
      handleConnectionChange();
      
      // Listen for changes
      conn.addEventListener('change', handleConnectionChange);
      
      return () => {
        conn.removeEventListener('change', handleConnectionChange);
      };
    }
  }, [getNetworkQuality, scheduleBatchProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
    };
  }, []);

  return {
    // Network state
    networkQuality,
    isOnline,
    
    // Batch processing
    addToBatch,
    processBatch,
    
    // Adaptive strategies
    getAdaptiveImageQuality,
    getAdaptiveLoadingStrategy,
    
    // Offline support
    requestOfflineSync,
    
    // Network utilities
    getNetworkQuality,
    getOptimalBatchSize,
    getOptimalBatchDelay,
    
    // Queue status
    queueLength: requestQueue.current.length,
    activeBatches: Array.from(activeBatches.current.values())
  };
};

export default useNetworkOptimization;
