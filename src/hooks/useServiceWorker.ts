import { useEffect, useState, useCallback } from 'react';

// Global registration guard to prevent duplicate registrations across multiple
// hook consumers (App, caching, network hooks, etc.)
let globalRegistration: ServiceWorkerRegistration | null = null;
let registrationInFlight: Promise<ServiceWorkerRegistration | null> | null = null;

interface ServiceWorkerState {
  isSupported: boolean;
  isInstalled: boolean;
  isUpdated: boolean;
  isOnline: boolean;
  cacheInfo: Record<string, any>;
}

interface CacheInfo {
  size: number;
  urls: string[];
}

export const useServiceWorker = () => {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isInstalled: false,
    isUpdated: false,
    isOnline: navigator.onLine,
    cacheInfo: {}
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported');
      return null;
    }

    try {
      // If we've already registered (or are registering), reuse that
      if (globalRegistration) {
        setRegistration(globalRegistration);
        setSwState(prev => ({ ...prev, isInstalled: true }));
        return globalRegistration;
      }
      if (registrationInFlight) {
        const existing = await registrationInFlight;
        if (existing) {
          setRegistration(existing);
          setSwState(prev => ({ ...prev, isInstalled: true }));
        }
        return existing;
      }

      console.log('🚀 Registering Service Worker...');
      // Respect Vite base URL so registration works on sub-paths (e.g. GitHub Pages)
      const BASE_URL: string = ((import.meta as any).env?.BASE_URL || '/') as string;
      const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, '/')}${path.replace(/^\/+/, '')}`;

      const swUrl = joinUrl(BASE_URL, 'sw.js');
      const scopeUrl = BASE_URL; // scope must equal the base path

      registrationInFlight = navigator.serviceWorker.register(swUrl, {
        scope: scopeUrl,
        updateViaCache: 'none'
      });
      const reg = await registrationInFlight;
      globalRegistration = reg;
      registrationInFlight = null;

      console.log('✅ Service Worker registered successfully:', reg);
      setRegistration(reg);
      setSwState(prev => ({ ...prev, isInstalled: true }));

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found');
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 New Service Worker available');
              setSwState(prev => ({ ...prev, isUpdated: true }));
            }
          });
        }
      });

      return reg;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  }, []);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (registration) {
      try {
        console.log('🔄 Updating Service Worker...');
        await registration.update();
        setSwState(prev => ({ ...prev, isUpdated: false }));
      } catch (error) {
        console.error('❌ Service Worker update failed:', error);
      }
    }
  }, [registration]);

  // Skip waiting (activate new service worker immediately)
  const skipWaiting = useCallback(async () => {
    if (registration && registration.waiting) {
      try {
        console.log('⏭️ Skipping waiting for Service Worker...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page to activate the new service worker
        window.location.reload();
      } catch (error) {
        console.error('❌ Failed to skip waiting:', error);
      }
    }
  }, [registration]);

  // Get cache information
  const getCacheInfo = useCallback(async () => {
    if (registration && registration.active) {
      try {
        const messageChannel = new MessageChannel();
        
        return new Promise<Record<string, CacheInfo>>((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'CACHE_INFO') {
              setSwState(prev => ({ ...prev, cacheInfo: event.data.data }));
              resolve(event.data.data);
            } else if (event.data.type === 'CACHE_INFO_ERROR') {
              reject(new Error(event.data.error));
            }
          };

          registration.active!.postMessage(
            { type: 'GET_CACHE_INFO' },
            [messageChannel.port2]
          );
        });
      } catch (error) {
        console.error('❌ Failed to get cache info:', error);
        return {};
      }
    }
    return {};
  }, [registration]);

  // Clear specific cache
  const clearCache = useCallback(async (cacheName?: string) => {
    if (registration && registration.active) {
      try {
        const messageChannel = new MessageChannel();
        
        return new Promise<void>((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'CACHE_CLEARED') {
              console.log('🗑️ Cache cleared successfully');
              resolve();
            } else if (event.data.type === 'CACHE_CLEAR_ERROR') {
              reject(new Error(event.data.error));
            }
          };

          registration.active!.postMessage(
            { type: 'CLEAR_CACHE', cacheName },
            [messageChannel.port2]
          );
        });
      } catch (error) {
        console.error('❌ Failed to clear cache:', error);
        throw error;
      }
    }
  }, [registration]);

  // Cache map tiles
  const cacheMapTiles = useCallback(async (tileUrls: string[]) => {
    if (registration && registration.active) {
      try {
        const messageChannel = new MessageChannel();
        
        return new Promise<any[]>((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'MAP_TILES_CACHED') {
              console.log('🗺️ Map tiles cached successfully');
              resolve(event.data.results);
            } else if (event.data.type === 'MAP_TILES_CACHE_ERROR') {
              reject(new Error(event.data.error));
            }
          };

          registration.active!.postMessage(
            { type: 'CACHE_MAP_TILES', tiles: tileUrls },
            [messageChannel.port2]
          );
        });
      } catch (error) {
        console.error('❌ Failed to cache map tiles:', error);
        throw error;
      }
    }
  }, [registration]);

  // Request background sync
  const requestBackgroundSync = useCallback(async (tag: string, data?: any) => {
    if (registration && 'sync' in registration) {
      try {
        console.log('🔄 Requesting background sync:', tag);
        await (registration.sync as any).register(tag, data);
        console.log('✅ Background sync registered');
      } catch (error) {
        console.error('❌ Background sync registration failed:', error);
        throw error;
      }
    } else {
      console.log('⚠️ Background sync not supported');
    }
  }, [registration]);

  // Request push notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('❌ Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPushNotifications = useCallback(async () => {
    if (!registration) {
      console.log('❌ Service Worker not registered');
      return null;
    }

    try {
      const permission = await requestNotificationPermission();
      if (!permission) {
        return null;
      }

      const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || '';
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      console.log('🔔 Push notification subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      return null;
    }
  }, [registration, requestNotificationPermission]);

  // Convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Initialize service worker
  useEffect(() => {
    registerServiceWorker();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 App is online');
      setSwState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      console.log('📱 App is offline');
      setSwState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    if (!registration) return;

    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Message from Service Worker:', event.data);

      switch (event.data.type) {
        case 'BACKGROUND_SYNC_START':
          console.log('🔄 Background sync started');
          break;
          
        case 'BACKGROUND_SYNC_COMPLETE':
          console.log('✅ Background sync completed');
          break;
          
        case 'BACKGROUND_SYNC_ERROR':
          console.log('❌ Background sync failed:', event.data.message);
          break;
          
        default:
          console.log('Unknown message type:', event.data.type);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [registration]);

  return {
    // State
    ...swState,
    registration,
    
    // Actions
    registerServiceWorker,
    updateServiceWorker,
    skipWaiting,
    getCacheInfo,
    clearCache,
    cacheMapTiles,
    requestBackgroundSync,
    requestNotificationPermission,
    subscribeToPushNotifications
  };
};

export default useServiceWorker;
