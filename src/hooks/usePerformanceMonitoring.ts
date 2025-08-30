import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  timeToFirstByte: number;
  timeToInteractive: number;
  totalLoadTime: number;
  componentLoadTimes: Record<string, number>;
}

export const usePerformanceMonitoring = () => {
  const startTime = useRef<number>(performance.now());
  const componentStartTimes = useRef<Record<string, number>>({});
  const metrics = useRef<PerformanceMetrics>({
    timeToFirstByte: 0,
    timeToInteractive: 0,
    totalLoadTime: 0,
    componentLoadTimes: {}
  });

  // Track component load start
  const trackComponentLoadStart = (componentName: string) => {
    componentStartTimes.current[componentName] = performance.now();
  };

  // Track component load end
  const trackComponentLoadEnd = (componentName: string) => {
    const startTime = componentStartTimes.current[componentName];
    if (startTime) {
      const loadTime = performance.now() - startTime;
      metrics.current.componentLoadTimes[componentName] = loadTime;
      
      // Log component performance
      console.log(`📊 ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }
  };

  // Track overall app performance
  useEffect(() => {
    const advancedMetricsActive = (window as any).__IK_ADV_METRICS_ACTIVE === true;
    // Track Core Web Vitals
    if (!advancedMetricsActive && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'largest-contentful-paint': {
              const lcp = (entry as any).startTime as number;
              console.log('🎯 LCP:', lcp.toFixed(2), 'ms');
              break;
            }
            case 'first-input': {
              const e = entry as any;
              const fid = (e.processingStart ?? 0) - (e.startTime ?? 0);
              console.log('⚡ FID:', fid.toFixed(2), 'ms');
              break;
            }
            case 'layout-shift': {
              const cls = (entry as any).value as number;
              console.log('📐 CLS:', cls?.toFixed?.(3));
              break;
            }
          }
        }
      });

      observer.observe({ 
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
    }

    // Track custom metrics
    // Reserved for future custom metrics

    // Track time to interactive
    const trackTimeToInteractive = () => {
      const tti = performance.now() - startTime.current;
      metrics.current.timeToInteractive = tti;
      if (!advancedMetricsActive) {
        console.log('🚀 Time to Interactive:', tti.toFixed(2), 'ms');
      }
      
      // Send to analytics if available
      // Optional: integrate with analytics if present
    };

    // Wait for app to be interactive
    const checkInteractive = () => {
      if (document.readyState === 'complete') {
        trackTimeToInteractive();
      } else {
        setTimeout(checkInteractive, 100);
      }
    };

    checkInteractive();

    return () => {
      // Calculate total load time
      const totalTime = performance.now() - startTime.current;
      metrics.current.totalLoadTime = totalTime;
      
      if (!advancedMetricsActive) {
        console.log('📊 Performance Summary:', {
          totalLoadTime: `${totalTime.toFixed(2)}ms`,
          componentLoadTimes: metrics.current.componentLoadTimes,
          timeToInteractive: `${metrics.current.timeToInteractive.toFixed(2)}ms`
        });
      }
    };
  }, []);

  return {
    trackComponentLoadStart,
    trackComponentLoadEnd,
    getMetrics: () => metrics.current
  };
};

export default usePerformanceMonitoring;
