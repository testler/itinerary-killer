// Location functionality test utility
export function testLocationSupport() {
  console.log('=== Location Support Test ===');
  
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    console.error('❌ Geolocation is NOT supported by this browser');
    return false;
  }
  
  console.log('✅ Geolocation is supported');
  
  // Check if we're in a secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    console.warn('⚠️ Not in a secure context. Geolocation may not work in some browsers.');
  } else {
    console.log('✅ Running in secure context');
  }
  
  // Test permission status (if supported)
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      console.log(`📍 Permission status: ${result.state}`);
      if (result.state === 'denied') {
        console.error('❌ Location permission denied by user');
      } else if (result.state === 'prompt') {
        console.log('ℹ️ Location permission not yet requested');
      } else if (result.state === 'granted') {
        console.log('✅ Location permission granted');
      }
    }).catch((error) => {
      console.warn('⚠️ Could not check permission status:', error);
    });
  } else {
    console.log('ℹ️ Permission API not supported, cannot check status');
  }
  
  return true;
}

export function testGetCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    console.log('🔄 Testing getCurrentPosition...');
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location obtained successfully:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        });
        resolve(position);
      },
      (error) => {
        console.error('❌ Location error:', {
          code: error.code,
          message: error.message
        });
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error('❌ Permission denied - user blocked location access');
            break;
          case error.POSITION_UNAVAILABLE:
            console.error('❌ Position unavailable - location information unavailable');
            break;
          case error.TIMEOUT:
            console.error('❌ Timeout - location request timed out');
            break;
          default:
            console.error('❌ Unknown error occurred');
        }
        
        reject(error);
      },
      options
    );
  });
}

// Run tests when imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        console.log('🔍 Running location tests...');
        testLocationSupport();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      console.log('🔍 Running location tests...');
      testLocationSupport();
    }, 1000);
  }
}
