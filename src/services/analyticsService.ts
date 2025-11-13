/**
 * Analytics Service
 * Tracks user events and behaviors for product insights
 * 
 * Currently logs to console. Can be extended to integrate with:
 * - Firebase Analytics
 * - Mixpanel
 * - Amplitude
 * - Custom analytics backend
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

class AnalyticsService {
  private enabled: boolean = true; // Can be toggled via settings

  /**
   * Track an analytics event
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
    };

    // Log to console (for development)
    if (__DEV__) {
      console.log('📊 Analytics:', JSON.stringify(analyticsEvent, null, 2));
    }

    // TODO: Integrate with Firebase Analytics or other service
    // Example Firebase Analytics integration:
    // import analytics from '@react-native-firebase/analytics';
    // analytics().logEvent(event, properties);

    // TODO: Send to custom analytics backend
    // Example: await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(analyticsEvent) });
  }

  /**
   * Track screen view
   */
  screen(name: string, properties?: Record<string, any>): void {
    this.track('screen_view', {
      screen_name: name,
      ...properties,
    });
  }

  /**
   * Track user property
   */
  setUserProperty(name: string, value: string | number | boolean): void {
    if (!this.enabled) {
      return;
    }

    if (__DEV__) {
      console.log('📊 Analytics User Property:', { [name]: value });
    }

    // TODO: Integrate with analytics service
    // Example: analytics().setUserProperty(name, String(value));
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new AnalyticsService();


