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
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              console.log('🎯 LCP:', entry.startTime.toFixed(2), 'ms');
              break;
            case 'first-input':
              const fid = entry.processingStart - entry.startTime;
              console.log('⚡ FID:', fid.toFixed(2), 'ms');
              break;
            case 'layout-shift':
              console.log('📐 CLS:', entry.value.toFixed(3));
              break;
          }
        }
      });

      observer.observe({ 
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
    }

    // Track custom metrics
    const trackCustomMetric = (name: string, value: number) => {
      if ('performance' in window) {
        performance.mark(`${name}-start`);
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name)[0];
        if (measure) {
          console.log(`📈 ${name}:`, measure.duration.toFixed(2), 'ms');
        }
      }
    };

    // Track time to interactive
    const trackTimeToInteractive = () => {
      const tti = performance.now() - startTime.current;
      metrics.current.timeToInteractive = tti;
      console.log('🚀 Time to Interactive:', tti.toFixed(2), 'ms');
      
      // Send to analytics if available
      if (typeof gtag !== 'undefined') {
        gtag('event', 'timing_complete', {
          name: 'time_to_interactive',
          value: Math.round(tti)
        });
      }
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
      
      console.log('📊 Performance Summary:', {
        totalLoadTime: `${totalTime.toFixed(2)}ms`,
        componentLoadTimes: metrics.current.componentLoadTimes,
        timeToInteractive: `${metrics.current.timeToInteractive.toFixed(2)}ms`
      });
    };
  }, []);

  return {
    trackComponentLoadStart,
    trackComponentLoadEnd,
    getMetrics: () => metrics.current
  };
};

export default usePerformanceMonitoring;
