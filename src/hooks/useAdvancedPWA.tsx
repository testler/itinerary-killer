import { useState, useEffect, useCallback, useRef } from 'react';
import pushNotificationService from '../services/pushNotificationService';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAFeatures {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  hasPushSupport: boolean;
  hasBackgroundSync: boolean;
  hasFileHandling: boolean;
  hasShareTarget: boolean;
}

interface PWAState {
  features: PWAFeatures;
  installPrompt: PWAInstallPrompt | null;
  isInstalling: boolean;
  installationProgress: number;
  lastUpdateCheck: Date | null;
  updateAvailable: boolean;
  offlineQueue: any[];
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
}

export const useAdvancedPWA = () => {
  const [state, setState] = useState<PWAState>({
    features: {
      isInstallable: false,
      isInstalled: false,
      isStandalone: false,
      isOnline: navigator.onLine,
      hasPushSupport: 'serviceWorker' in navigator && 'PushManager' in window,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window,
      hasFileHandling: 'launchQueue' in window,
      hasShareTarget: 'share' in navigator
    },
    installPrompt: null,
    isInstalling: false,
    installationProgress: 0,
    lastUpdateCheck: null,
    updateAvailable: false,
    offlineQueue: [],
    syncStatus: 'idle'
  });

  const installPromptRef = useRef<PWAInstallPrompt | null>(null);
  const beforeInstallPromptHandler = useRef<((event: Event) => void) | null>(null);
  const appInstalledHandler = useRef<(() => void) | null>(null);

  // Check if app is installed
  const checkInstallationStatus = useCallback(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    
    setState(prev => ({
      ...prev,
      features: {
        ...prev.features,
        isInstalled
      }
    }));
  }, []);

  // Check if app is in standalone mode
  const checkStandaloneMode = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    setState(prev => ({
      ...prev,
      features: {
        ...prev.features,
        isStandalone
      }
    }));
  }, []);

  // Handle beforeinstallprompt event
  const handleBeforeInstallPrompt = useCallback((event: Event) => {
    event.preventDefault();
    installPromptRef.current = event as any;
    
    setState(prev => ({
      ...prev,
      features: {
        ...prev.features,
        isInstallable: true
      },
      installPrompt: event as any
    }));
    
    console.log('📱 Install prompt captured');
  }, []);

  // Handle app installed event
  const handleAppInstalled = useCallback(() => {
    setState(prev => ({
      ...prev,
      features: {
        ...prev.features,
        isInstalled: true,
        isInstallable: false
      },
      installPrompt: null
    }));
    
    console.log('✅ App installed successfully');
    
    // Track installation
    // Optional: integrate with analytics if present
  }, []);

  // Handle online/offline status changes
  const handleOnlineStatusChange = useCallback(() => {
    const isOnline = navigator.onLine;
    
    setState(prev => ({
      ...prev,
      features: {
        ...prev.features,
        isOnline
      }
    }));
    
    if (isOnline && state.offlineQueue.length > 0) {
      // defer to next tick to avoid dependency ordering
      setTimeout(() => processOfflineQueue(), 0);
    }
    
    console.log(`🌐 Network status: ${isOnline ? 'Online' : 'Offline'}`);
  }, [state.offlineQueue]);

  // Process offline queue when back online
  const processOfflineQueue = useCallback(async () => {
    if (state.offlineQueue.length === 0) return;
    
    setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const queue = [...state.offlineQueue];
      let successCount = 0;
      
      for (const item of queue) {
        try {
          // Process each queued item
          await processQueuedItem(item);
          successCount++;
        } catch (error) {
          console.error('❌ Failed to process queued item:', error);
        }
      }
      
      // Remove processed items from queue
      setState(prev => ({
        ...prev,
        offlineQueue: prev.offlineQueue.filter(item => 
          !queue.some(queuedItem => queuedItem.id === item.id)
        ),
        syncStatus: 'completed'
      }));
      
      // Send notification about sync completion
      if (successCount > 0) {
        await pushNotificationService.sendOfflineSyncNotification('items', successCount);
      }
      
      console.log(`🔄 Processed ${successCount} offline items`);
    } catch (error) {
      console.error('❌ Failed to process offline queue:', error);
      setState(prev => ({ ...prev, syncStatus: 'error' }));
    }
  }, [state.offlineQueue]);

  // Process individual queued item
  const processQueuedItem = async (_item: any) => {
    // This would typically sync with your backend
    // For now, we'll just simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Example processing logic:
    // if (item.type === 'add') {
    //   await addItemToBackend(item.data);
    // } else if (item.type === 'update') {
    //   await updateItemInBackend(item.data);
    // }
  };

  // Add item to offline queue
  const addToOfflineQueue = useCallback((item: any) => {
    const queuedItem = {
      ...item,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    setState(prev => ({
      ...prev,
      offlineQueue: [...prev.offlineQueue, queuedItem]
    }));
    
    console.log('📝 Item added to offline queue:', queuedItem);
  }, []);

  // Install the PWA
  const installPWA = useCallback(async () => {
    if (!installPromptRef.current) {
      console.log('❌ No install prompt available');
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isInstalling: true, installationProgress: 0 }));
      
      // Simulate installation progress
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          installationProgress: Math.min(prev.installationProgress + 20, 90)
        }));
      }, 200);
      
      // Show install prompt
      await installPromptRef.current.prompt();
      
      // Wait for user choice
      const { outcome } = await installPromptRef.current.userChoice;
      
      clearInterval(progressInterval);
      
      if (outcome === 'accepted') {
        setState(prev => ({ 
          ...prev, 
          installationProgress: 100,
          features: { ...prev.features, isInstallable: false }
        }));
        
        // Clear the prompt
        installPromptRef.current = null;
        
        console.log('✅ PWA installation accepted');
        return true;
      } else {
        setState(prev => ({ 
          ...prev, 
          installationProgress: 0,
          isInstalling: false 
        }));
        
        console.log('❌ PWA installation dismissed');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to install PWA:', error);
      setState(prev => ({ 
        ...prev, 
        installationProgress: 0,
        isInstalling: false 
      }));
      return false;
    } finally {
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          isInstalling: false,
          installationProgress: 0 
        }));
      }, 1000);
    }
  }, []);

  // Check for app updates
  const checkForUpdates = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, lastUpdateCheck: new Date() }));
      
      // This would typically check with your service worker
      // For now, we'll simulate update checking
      const hasUpdate = Math.random() > 0.7; // 30% chance of update
      
      setState(prev => ({ ...prev, updateAvailable: hasUpdate }));
      
      if (hasUpdate) {
        console.log('🔄 App update available');
        
        // Send notification about update
        await pushNotificationService.sendLocalNotification({
          title: '🔄 Update Available',
          body: 'A new version of the app is available. Refresh to update.',
          requireInteraction: true,
          actions: [
            {
              action: 'refresh',
              title: 'Refresh Now'
            },
            {
              action: 'later',
              title: 'Later'
            }
          ]
        });
      } else {
        console.log('✅ App is up to date');
      }
      
      return hasUpdate;
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
      return false;
    }
  }, []);

  // Share content
  const shareContent = useCallback(async (data: { title: string; text: string; url?: string }) => {
    if (!navigator.share) {
      console.log('❌ Web Share API not supported');
      return false;
    }
    
    try {
      await navigator.share(data);
      console.log('📤 Content shared successfully');
      return true;
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error('❌ Failed to share content:', error);
      }
      return false;
    }
  }, []);

  // Handle file opening
  const handleFileOpen = useCallback(async (file: File) => {
    if (!('launchQueue' in window)) {
      console.log('❌ File handling not supported');
      return false;
    }
    
    try {
      // This would typically handle the file based on its type
      console.log('📁 File opened:', file.name);
      
      // Example: Handle JSON import
      if (file.type === 'application/json') {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Emit custom event for file handling
        window.dispatchEvent(new CustomEvent('file-opened', { 
          detail: { file, data, type: 'json' } 
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to handle file:', error);
      return false;
    }
  }, []);

  // Get app information
  const getAppInfo = useCallback(() => {
    return {
      name: 'Itinerary Killer',
      version: '1.0.0',
      description: 'Plan your perfect Orlando adventure',
      features: state.features,
      lastUpdate: state.lastUpdateCheck,
      updateAvailable: state.updateAvailable
    };
  }, [state.features, state.lastUpdateCheck, state.updateAvailable]);

  // Get offline queue status
  const getOfflineQueueStatus = useCallback(() => {
    return {
      count: state.offlineQueue.length,
      items: state.offlineQueue,
      syncStatus: state.syncStatus
    };
  }, [state.offlineQueue, state.syncStatus]);

  // Clear offline queue
  const clearOfflineQueue = useCallback(() => {
    setState(prev => ({ ...prev, offlineQueue: [] }));
    console.log('🗑️ Offline queue cleared');
  }, []);

  // Initialize PWA features
  useEffect(() => {
    // Check initial status
    checkInstallationStatus();
    checkStandaloneMode();
    
    // Set up event listeners
    beforeInstallPromptHandler.current = handleBeforeInstallPrompt;
    appInstalledHandler.current = handleAppInstalled;
    
    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler.current);
    window.addEventListener('appinstalled', appInstalledHandler.current);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Check for updates periodically
    const updateCheckInterval = setInterval(checkForUpdates, 1000 * 60 * 60); // Every hour
    
    // Check installation status periodically
    const installCheckInterval = setInterval(checkInstallationStatus, 1000 * 60 * 5); // Every 5 minutes to reduce churn
    
    return () => {
      // Clean up event listeners
      if (beforeInstallPromptHandler.current) {
        window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler.current);
      }
      if (appInstalledHandler.current) {
        window.removeEventListener('appinstalled', appInstalledHandler.current);
      }
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      
      // Clear intervals
      clearInterval(updateCheckInterval);
      clearInterval(installCheckInterval);
    };
  }, [checkInstallationStatus, checkStandaloneMode, handleBeforeInstallPrompt, handleAppInstalled, handleOnlineStatusChange, checkForUpdates]);

  return {
    // State
    ...state,
    
    // Actions
    installPWA,
    checkForUpdates,
    shareContent,
    handleFileOpen,
    addToOfflineQueue,
    clearOfflineQueue,
    processOfflineQueue,
    
    // Utilities
    getAppInfo,
    getOfflineQueueStatus
  };
};

export default useAdvancedPWA;
