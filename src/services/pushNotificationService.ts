import { useServiceWorker } from '../hooks/useServiceWorker';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private isSubscribed: boolean = false;
  private subscription: PushSubscription | null = null;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.initialize();
  }

  private async initialize() {
    if (!this.isSupported) {
      console.log('❌ Push notifications not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.getRegistration();
      if (this.registration) {
        this.isSubscribed = !!(await this.registration.pushManager.getSubscription());
        console.log('✅ Push notification service initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('❌ Push notifications not supported');
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
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.registration) {
      console.log('❌ Push notifications not supported or registration not available');
      return null;
    }

    try {
      const permission = await this.requestPermission();
      if (!permission) {
        return null;
      }

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.log('⚠️ VAPID public key not configured');
        return null;
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      this.subscription = subscription;
      this.isSubscribed = true;

      console.log('🔔 Push notification subscription created:', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return false;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      this.isSubscribed = false;

      console.log('🔕 Push notification subscription removed');
      
      // Notify server about unsubscription
      await this.removeSubscriptionFromServer();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Send local notification
  async sendLocalNotification(payload: NotificationPayload): Promise<Notification | null> {
    if (!this.isSupported) {
      return null;
    }

    try {
      const permission = await this.requestPermission();
      if (!permission) {
        return null;
      }

      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/icon-192.png',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        tag: payload.tag,
        renotify: payload.renotify || false
      });

      // Handle notification events
      notification.onclick = (event) => {
        console.log('👆 Notification clicked:', event);
        this.handleNotificationClick(payload, event);
      };

      notification.onclose = () => {
        console.log('❌ Notification closed');
      };

      notification.onshow = () => {
        console.log('📢 Notification shown');
      };

      return notification;
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
      return null;
    }
  }

  // Send scheduled notification
  async sendScheduledNotification(payload: NotificationPayload, delay: number): Promise<number> {
    if (!this.isSupported) {
      return -1;
    }

    try {
      const timeoutId = setTimeout(async () => {
        await this.sendLocalNotification(payload);
      }, delay);

      console.log(`⏰ Scheduled notification for ${delay}ms from now`);
      return timeoutId as any;
    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
      return -1;
    }
  }

  // Cancel scheduled notification
  cancelScheduledNotification(timeoutId: number): boolean {
    try {
      clearTimeout(timeoutId);
      console.log('❌ Scheduled notification cancelled');
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel scheduled notification:', error);
      return false;
    }
  }

  // Send reminder notification
  async sendReminderNotification(activity: any, delay: number): Promise<number> {
    const payload: NotificationPayload = {
      title: '⏰ Activity Reminder',
      body: `Time for: ${activity.title}`,
      icon: '/icons/icon-192.png',
      data: { type: 'reminder', activityId: activity.id },
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    return this.sendScheduledNotification(payload, delay);
  }

  // Send location-based notification
  async sendLocationNotification(activity: any, userLocation: any): Promise<void> {
    const distance = this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      activity.location.lat,
      activity.location.lng
    );

    if (distance <= 0.5) { // Within 0.5 miles
      const payload: NotificationPayload = {
        title: '📍 Nearby Activity',
        body: `You're close to: ${activity.title}`,
        icon: '/icons/icon-192.png',
        data: { type: 'location', activityId: activity.id },
        requireInteraction: false
      };

      await this.sendLocalNotification(payload);
    }
  }

  // Send offline sync notification
  async sendOfflineSyncNotification(syncType: string, count: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '🔄 Sync Complete',
      body: `Successfully synced ${count} ${syncType}`,
      icon: '/icons/icon-192.png',
      data: { type: 'sync', syncType, count },
      requireInteraction: false
    };

    await this.sendLocalNotification(payload);
  }

  // Send performance alert
  async sendPerformanceAlert(metric: string, value: number, threshold: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '⚠️ Performance Alert',
      body: `${metric}: ${value} (threshold: ${threshold})`,
      icon: '/icons/icon-192.png',
      data: { type: 'performance', metric, value, threshold },
      requireInteraction: false
    };

    await this.sendLocalNotification(payload);
  }

  // Handle notification click
  private handleNotificationClick(payload: NotificationPayload, event: Event): void {
    const notification = event.target as Notification;
    
    if (payload.data?.type === 'reminder') {
      // Navigate to activity details
      window.location.href = `/?activity=${payload.data.activityId}`;
    } else if (payload.data?.type === 'location') {
      // Center map on activity location
      window.location.href = `/?view=map&center=${payload.data.activityId}`;
    } else if (payload.data?.type === 'sync') {
      // Show sync status
      window.location.href = '/?view=sync';
    }

    notification.close();
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      // This would typically send the subscription to your backend
      // For now, we'll just log it
      console.log('📤 Subscription sent to server:', subscription);
      
      // Example API call:
      // await fetch('/api/push/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription)
      // });
    } catch (error) {
      console.error('❌ Failed to send subscription to server:', error);
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      // This would typically notify your backend about unsubscription
      console.log('📤 Unsubscription sent to server');
      
      // Example API call:
      // await fetch('/api/push/unsubscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ endpoint: this.subscription?.endpoint })
      // });
    } catch (error) {
      console.error('❌ Failed to remove subscription from server:', error);
    }
  }

  // Get subscription status
  getSubscriptionStatus(): { isSupported: boolean; isSubscribed: boolean } {
    return {
      isSupported: this.isSupported,
      isSubscribed: this.isSubscribed
    };
  }

  // Get current subscription
  getCurrentSubscription(): PushSubscription | null {
    return this.subscription;
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
