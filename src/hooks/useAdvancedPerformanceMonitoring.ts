import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  
  // Custom metrics
  timeToInteractive: number;
  timeToFirstPaint: number;
  timeToFirstContentfulPaint: number;
  totalLoadTime: number;
  
  // Component metrics
  componentLoadTimes: Record<string, number>;
  renderTimes: Record<string, number>;
  
  // User interaction metrics
  firstClickTime: number;
  scrollDepth: number;
  interactionCount: number;
  
  // Memory metrics
  memoryUsage: number;
  memoryLimit: number;
  
  // Network metrics
  networkRequests: number;
  totalTransferSize: number;
  averageResponseTime: number;
}

interface UserBehavior {
  sessionStart: number;
  lastActivity: number;
  pageViews: number;
  interactions: Record<string, number>;
  navigationPath: string[];
  timeOnPage: number;
  scrollEvents: number;
  clickEvents: number;
  touchEvents: number;
}

interface PerformanceThresholds {
  excellent: { lcp: 2500, fid: 100, cls: 0.1 };
  good: { lcp: 4000, fid: 300, cls: 0.25 };
  needsImprovement: { lcp: 7000, fid: 500, cls: 0.4 };
}

export const useAdvancedPerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [userBehavior, setUserBehavior] = useState<UserBehavior>({
    sessionStart: Date.now(),
    lastActivity: Date.now(),
    pageViews: 0,
    interactions: {},
    navigationPath: [],
    timeOnPage: 0,
    scrollEvents: 0,
    clickEvents: 0,
    touchEvents: 0
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceScore, setPerformanceScore] = useState<number>(0);
  
  // Start time reserved for future timing needs
  // const startTime = useRef<number>(performance.now());
  const componentStartTimes = useRef<Record<string, number>>({});
  const renderStartTimes = useRef<Record<string, number>>({});
  const observerRef = useRef<PerformanceObserver | null>(null);
  // Reserved for future use
  // const activityTimer = useRef<number | null>(null);
  const sessionTimer = useRef<number | null>(null);
  const monitorIntervalRef = useRef<number | null>(null);
  const startedRef = useRef<boolean>(false);
  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const touchHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);

  // Performance thresholds
  const thresholds: PerformanceThresholds = {
    excellent: { lcp: 2500, fid: 100, cls: 0.1 },
    good: { lcp: 4000, fid: 300, cls: 0.25 },
    needsImprovement: { lcp: 7000, fid: 500, cls: 0.4 }
  };

  // Calculate performance score
  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;
    
    // LCP scoring (25% weight)
    if (metrics.lcp <= thresholds.excellent.lcp) score -= 0;
    else if (metrics.lcp <= thresholds.good.lcp) score -= 10;
    else if (metrics.lcp <= thresholds.needsImprovement.lcp) score -= 25;
    else score -= 40;
    
    // FID scoring (25% weight)
    if (metrics.fid <= thresholds.excellent.fid) score -= 0;
    else if (metrics.fid <= thresholds.good.fid) score -= 10;
    else if (metrics.fid <= thresholds.needsImprovement.fid) score -= 25;
    else score -= 40;
    
    // CLS scoring (25% weight)
    if (metrics.cls <= thresholds.excellent.cls) score -= 0;
    else if (metrics.cls <= thresholds.good.cls) score -= 10;
    else if (metrics.cls <= thresholds.needsImprovement.cls) score -= 25;
    else score -= 40;
    
    // TTFB scoring (15% weight)
    if (metrics.ttfb <= 800) score -= 0;
    else if (metrics.ttfb <= 1800) score -= 5;
    else if (metrics.ttfb <= 3000) score -= 15;
    else score -= 25;
    
    // Time to Interactive scoring (10% weight)
    if (metrics.timeToInteractive <= 3800) score -= 0;
    else if (metrics.timeToInteractive <= 7300) score -= 5;
    else if (metrics.timeToInteractive <= 10200) score -= 10;
    else score -= 20;
    
    return Math.max(0, score);
  }, [thresholds]);

  // Track component load start
  const trackComponentLoadStart = useCallback((componentName: string) => {
    componentStartTimes.current[componentName] = performance.now();
    console.log(`📊 Component load started: ${componentName}`);
  }, []);

  // Track component load end
  const trackComponentLoadEnd = useCallback((componentName: string) => {
    const startTime = componentStartTimes.current[componentName];
    if (startTime) {
      const loadTime = performance.now() - startTime;
      setMetrics(prev => prev ? {
        ...prev,
        componentLoadTimes: {
          ...prev.componentLoadTimes,
          [componentName]: loadTime
        }
      } : null);
      
      console.log(`📊 ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      
      // Optional: integrate with analytics if present
    }
  }, []);

  // Track render start
  const trackRenderStart = useCallback((componentName: string) => {
    renderStartTimes.current[componentName] = performance.now();
  }, []);

  // Track render end
  const trackRenderEnd = useCallback((componentName: string) => {
    const startTime = renderStartTimes.current[componentName];
    if (startTime) {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => prev ? {
        ...prev,
        renderTimes: {
          ...prev.renderTimes,
          [componentName]: renderTime
        }
      } : null);
      
      console.log(`🎨 ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  }, []);

  // Track user interaction
  const trackUserInteraction = useCallback((interactionType: string, _details?: any) => {
    setUserBehavior(prev => ({
      ...prev,
      lastActivity: Date.now(),
      interactions: {
        ...prev.interactions,
        [interactionType]: (prev.interactions[interactionType] || 0) + 1
      }
    }));

    // Send to analytics if available
    // Optional: integrate with analytics if present
  }, []);

  // Track navigation
  const trackNavigation = useCallback((path: string) => {
    setUserBehavior(prev => ({
      ...prev,
      pageViews: prev.pageViews + 1,
      navigationPath: [...prev.navigationPath, path],
      timeOnPage: Date.now() - prev.lastActivity
    }));
  }, []);

  // Get memory information
  const getMemoryInfo = useCallback((): { usage: number; limit: number } => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usage: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return { usage: 0, limit: 0 };
  }, []);

  // Get network information
  const getNetworkInfo = useCallback((): { requests: number; transferSize: number; avgResponseTime: number } => {
    const entries = performance.getEntriesByType('resource');
    const totalTransfer = entries.reduce((sum, entry) => sum + ((entry as any).transferSize || 0), 0);
    const avgResponseTime = entries.reduce((sum, entry) => sum + ((entry as any).responseEnd || 0) - ((entry as any).responseStart || 0), 0) / entries.length;
    
    return {
      requests: entries.length,
      transferSize: totalTransfer,
      avgResponseTime: avgResponseTime || 0
    };
  }, []);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    if (startedRef.current) return;
    console.log('🚀 Starting advanced performance monitoring...');
    setIsMonitoring(true);
    startedRef.current = true;

    // Initialize metrics
    const initialMetrics: PerformanceMetrics = {
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      timeToInteractive: 0,
      timeToFirstPaint: 0,
      timeToFirstContentfulPaint: 0,
      totalLoadTime: 0,
      componentLoadTimes: {},
      renderTimes: {},
      firstClickTime: 0,
      scrollDepth: 0,
      interactionCount: 0,
      memoryUsage: 0,
      memoryLimit: 0,
      networkRequests: 0,
      totalTransferSize: 0,
      averageResponseTime: 0
    };
    
    setMetrics(initialMetrics);
    
    // Set up Core Web Vitals observer
    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              setMetrics(prev => prev ? { ...prev, lcp: entry.startTime } : null);
              console.log('🎯 LCP:', entry.startTime.toFixed(2), 'ms');
              break;
              
            case 'first-input':
              const fid = (entry as any).processingStart - (entry as any).startTime;
              setMetrics(prev => prev ? { ...prev, fid } : null);
              console.log('⚡ FID:', fid.toFixed(2), 'ms');
              break;
              
            case 'layout-shift':
              setMetrics(prev => prev ? { ...prev, cls: (entry as any).value } : null);
              console.log('📐 CLS:', (entry as any).value?.toFixed?.(3));
              break;
              
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              setMetrics(prev => prev ? { 
                ...prev, 
                ttfb: navEntry.responseStart - navEntry.requestStart,
                timeToFirstPaint: (performance.getEntriesByName('first-paint')[0] as any)?.startTime || 0,
                timeToFirstContentfulPaint: (performance.getEntriesByName('first-contentful-paint')[0] as any)?.startTime || 0
              } : null);
              break;
          }
        }
      });
      
      observerRef.current.observe({ 
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] 
      });
    }
    
    // Set up activity tracking
    const trackActivity = () => {
      setUserBehavior(prev => ({ ...prev, lastActivity: Date.now() }));
    };

    clickHandlerRef.current = () => {
      trackActivity();
      trackUserInteraction('click');
      setUserBehavior(prev => ({ ...prev, clickEvents: prev.clickEvents + 1 }));
    };
    document.addEventListener('click', clickHandlerRef.current);

    touchHandlerRef.current = () => {
      trackActivity();
      trackUserInteraction('touch');
      setUserBehavior(prev => ({ ...prev, touchEvents: prev.touchEvents + 1 }));
    };
    document.addEventListener('touchstart', touchHandlerRef.current, { passive: true } as any);

    scrollHandlerRef.current = () => {
      trackActivity();
      setUserBehavior(prev => ({ ...prev, scrollEvents: prev.scrollEvents + 1 }));
      // Reserved: scroll depth tracking disabled to simplify types
    };
    document.addEventListener('scroll', scrollHandlerRef.current, { passive: true } as any);
    
    // Set up periodic monitoring
    monitorIntervalRef.current = setInterval(() => {
      const memoryInfo = getMemoryInfo();
      const networkInfo = getNetworkInfo();
      setMetrics(prev => prev ? {
        ...prev,
        memoryUsage: memoryInfo.usage,
        memoryLimit: memoryInfo.limit,
        networkRequests: networkInfo.requests,
        totalTransferSize: networkInfo.transferSize,
        averageResponseTime: networkInfo.avgResponseTime
      } : prev);
    }, 5000) as unknown as number; // Every 5 seconds
    
    // Set up session timer
    sessionTimer.current = setInterval(() => {
      setUserBehavior(prev => ({ ...prev, timeOnPage: Date.now() - prev.sessionStart }));
    }, 1000); // Every second
  }, [getMemoryInfo, getNetworkInfo, trackUserInteraction]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    if (!startedRef.current) return;
    console.log('🛑 Stopping performance monitoring...');
    setIsMonitoring(false);
    startedRef.current = false;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }

    if (sessionTimer.current) {
      clearInterval(sessionTimer.current);
      sessionTimer.current = null;
    }

    if (clickHandlerRef.current) {
      document.removeEventListener('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (touchHandlerRef.current) {
      document.removeEventListener('touchstart', touchHandlerRef.current as any);
      touchHandlerRef.current = null;
    }
    if (scrollHandlerRef.current) {
      document.removeEventListener('scroll', scrollHandlerRef.current as any);
      scrollHandlerRef.current = null;
    }
  }, []);

  // Generate performance report
  const generateReport = useCallback((): string => {
    if (!metrics) return 'No performance data available';
    
    const score = calculatePerformanceScore(metrics);
    const report = `
🚀 Performance Report
====================

📊 Performance Score: ${score}/100
${score >= 90 ? '🟢 Excellent' : score >= 70 ? '🟡 Good' : score >= 50 ? '🟠 Needs Improvement' : '🔴 Poor'}

🎯 Core Web Vitals:
• LCP: ${metrics.lcp.toFixed(2)}ms ${metrics.lcp <= thresholds.excellent.lcp ? '🟢' : metrics.lcp <= thresholds.good.lcp ? '🟡' : '🔴'}
• FID: ${metrics.fid.toFixed(2)}ms ${metrics.fid <= thresholds.excellent.fid ? '🟢' : metrics.fid <= thresholds.good.fid ? '🟡' : '🔴'}
• CLS: ${metrics.cls.toFixed(3)} ${metrics.cls <= thresholds.excellent.cls ? '🟢' : metrics.cls <= thresholds.good.cls ? '🟡' : '🔴'}

⏱️ Timing Metrics:
• TTFB: ${metrics.ttfb.toFixed(2)}ms
• First Paint: ${metrics.timeToFirstPaint.toFixed(2)}ms
• First Contentful Paint: ${metrics.timeToFirstContentfulPaint.toFixed(2)}ms
• Time to Interactive: ${metrics.timeToInteractive.toFixed(2)}ms

🧠 Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB / ${(metrics.memoryLimit / 1024 / 1024).toFixed(2)}MB

🌐 Network: ${metrics.networkRequests} requests, ${(metrics.totalTransferSize / 1024).toFixed(2)}KB transferred

👤 User Behavior:
• Session Duration: ${Math.round(userBehavior.timeOnPage / 1000)}s
• Page Views: ${userBehavior.pageViews}
• Interactions: ${Object.values(userBehavior.interactions).reduce((sum, count) => sum + count, 0)}
• Scroll Events: ${userBehavior.scrollEvents}
• Click Events: ${userBehavior.clickEvents}
• Touch Events: ${userBehavior.touchEvents}
• Scroll Events: ${userBehavior.scrollEvents}
    `;
    
    return report;
  }, [metrics, userBehavior, calculatePerformanceScore, thresholds]);

  // Export data for analytics
  const exportData = useCallback(() => {
    if (!metrics) return null;
    
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      userBehavior,
      performanceScore: calculatePerformanceScore(metrics),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null
    };
    
    return data;
  }, [metrics, userBehavior, calculatePerformanceScore]);

  // Initialize monitoring on mount
  useEffect(() => {
    startMonitoring();
    return () => {
      stopMonitoring();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate performance score when metrics change
  useEffect(() => {
    if (metrics) {
      const score = calculatePerformanceScore(metrics);
      setPerformanceScore(score);
    }
  }, [metrics, calculatePerformanceScore]);

  return {
    // State
    metrics,
    userBehavior,
    isMonitoring,
    performanceScore,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    trackComponentLoadStart,
    trackComponentLoadEnd,
    trackRenderStart,
    trackRenderEnd,
    trackUserInteraction,
    trackNavigation,
    
    // Utilities
    generateReport,
    exportData,
    calculatePerformanceScore
  };
};

export default useAdvancedPerformanceMonitoring;
