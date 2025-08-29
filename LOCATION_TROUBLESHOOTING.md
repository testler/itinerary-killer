# Location Functionality Troubleshooting Guide

## Common Issues and Solutions

### 1. Location Not Working at All

**Symptoms:**
- Location button shows error state
- No location marker appears on map
- Console shows geolocation errors

**Solutions:**
1. **Check Browser Permissions:**
   - Look for a location permission prompt in your browser
   - Check browser settings for location permissions
   - Ensure the site is allowed to access location

2. **Check HTTPS/HTTP:**
   - Modern browsers require HTTPS for geolocation
   - Local development (localhost) should work
   - If using HTTP, switch to HTTPS

3. **Browser Compatibility:**
   - Ensure you're using a modern browser
   - Try Chrome, Firefox, Safari, or Edge
   - Check if geolocation is enabled in browser settings

### 2. Permission Denied Error

**Symptoms:**
- Console shows "Permission denied" error
- Location button shows error state

**Solutions:**
1. **Reset Browser Permissions:**
   - Click the lock/info icon in the address bar
   - Reset location permission to "Ask" or "Allow"
   - Refresh the page

2. **Check Browser Settings:**
   - Chrome: Settings > Privacy and security > Site Settings > Location
   - Firefox: Settings > Privacy & Security > Permissions > Location
   - Safari: Preferences > Websites > Location

### 3. Location Times Out

**Symptoms:**
- Location request takes too long
- Console shows timeout error

**Solutions:**
1. **Check Internet Connection:**
   - Ensure stable internet connection
   - Try refreshing the page

2. **Check GPS/Location Services:**
   - Enable location services on your device
   - Ensure GPS is enabled
   - Try moving to an area with better GPS signal

### 4. Inaccurate Location

**Symptoms:**
- Location marker is far from actual position
- High accuracy numbers in the status

**Solutions:**
1. **Wait for Better GPS Signal:**
   - Move to an open area
   - Wait a few minutes for GPS to stabilize
   - Ensure clear view of the sky

2. **Check Device Settings:**
   - Enable high-accuracy mode in device location settings
   - Ensure GPS and network location are enabled

### 5. Manual Location Setting

**Alternative Solution:**
If automatic location fails, you can manually set your location:
1. Click anywhere on the map
2. A blue marker will appear at that location
3. This location will be used for distance calculations

## Debug Information

### Console Logs
The app includes debug logging. Check your browser console for:
- Location support status
- Permission status
- Detailed error messages
- Success confirmations

### Status Indicators
The sidebar shows location status:
- **Loading**: Getting location...
- **Success**: Location active (with coordinates)
- **Error**: Location unavailable (with retry button)

## Testing Location Functionality

1. **Open Browser Console** (F12)
2. **Refresh the page**
3. **Look for location test messages**
4. **Check for any error messages**
5. **Try the location button manually**

## Browser-Specific Issues

### Chrome
- Check `chrome://settings/content/location`
- Ensure site is not blocked
- Try incognito mode

### Firefox
- Check `about:preferences#privacy` > Permissions
- Look for location blocking
- Check about:config for geo.enabled

### Safari
- Check Safari > Preferences > Websites > Location
- Ensure location services are enabled in System Preferences

### Edge
- Check Settings > Cookies and site permissions > Location
- Ensure location access is allowed

## Still Having Issues?

1. **Check the console** for specific error messages
2. **Try a different browser** to isolate the issue
3. **Test on a different device** to see if it's device-specific
4. **Check if location works on other websites** (like Google Maps)

## Technical Details

The app uses the standard `navigator.geolocation.getCurrentPosition()` API with:
- High accuracy enabled
- 10-second timeout
- 5-minute maximum age for cached positions
- Automatic fallback to manual location setting
- Comprehensive error handling and user feedback
