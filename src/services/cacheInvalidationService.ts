export interface CacheInvalidationEvent {
  type: string;
  data?: any;
  timestamp: number;
}

export interface CacheInvalidationListener {
  (event: CacheInvalidationEvent): void;
}

/**
 * Cache Invalidation Service
 * Provides instant cross-screen communication and cache updates
 * React Native compatible implementation without Node.js EventEmitter
 */
export class CacheInvalidationService {
  private static instance: CacheInvalidationService;
  private listeners: Map<string, Set<CacheInvalidationListener>> = new Map();
  private eventHistory: CacheInvalidationEvent[] = [];
  private maxHistorySize = 100;

  private constructor() {
    // React Native compatible constructor
  }

  static getInstance(): CacheInvalidationService {
    if (!CacheInvalidationService.instance) {
      CacheInvalidationService.instance = new CacheInvalidationService();
    }
    return CacheInvalidationService.instance;
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribeToInvalidation(
    eventType: string, 
    callback: CacheInvalidationListener
  ): () => void {
    console.log('🔄 Subscribing to cache invalidation:', eventType);
    
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
      console.log('🔄 Unsubscribed from cache invalidation:', eventType);
    };
  }

  /**
   * Trigger cache invalidation for specific event type
   */
  triggerInvalidation(eventType: string, data?: any): void {
    const event: CacheInvalidationEvent = {
      type: eventType,
      data,
      timestamp: Date.now()
    };

    console.log('🔄 Triggering cache invalidation:', eventType, data);

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('❌ Cache invalidation callback error:', error);
        }
      });
    }

    // Notify general listeners (React Native compatible)
    this.notifyGeneralListeners(eventType, event);
    this.notifyGeneralListeners('invalidation', event);
  }

  /**
   * Trigger multiple invalidations at once
   */
  triggerMultipleInvalidations(eventTypes: string[], data?: any): void {
    console.log('🔄 Triggering multiple cache invalidations:', eventTypes);
    
    eventTypes.forEach(eventType => {
      this.triggerInvalidation(eventType, data);
    });
  }

  /**
   * Get invalidation history for debugging
   */
  getInvalidationHistory(eventType?: string): CacheInvalidationEvent[] {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Get active listeners count
   */
  getActiveListenersCount(): { [eventType: string]: number } {
    const counts: { [eventType: string]: number } = {};
    
    this.listeners.forEach((listeners, eventType) => {
      counts[eventType] = listeners.size;
    });
    
    return counts;
  }

  /**
   * Notify general listeners (React Native compatible)
   */
  private notifyGeneralListeners(eventType: string, event: CacheInvalidationEvent): void {
    // For React Native, we can use a simple callback system
    // This replaces EventEmitter functionality
    const generalListeners = this.listeners.get('*') || new Set();
    generalListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ General listener callback error:', error);
      }
    });
  }

  /**
   * Clear all listeners (use with caution)
   */
  clearAllListeners(): void {
    console.log('🔄 Clearing all cache invalidation listeners');
    this.listeners.clear();
  }

  /**
   * Get service status
   */
  getStatus(): {
    totalListeners: number;
    activeEventTypes: string[];
    recentEvents: number;
  } {
    const totalListeners = Array.from(this.listeners.values())
      .reduce((sum, set) => sum + set.size, 0);
    
    const activeEventTypes = Array.from(this.listeners.keys());
    
    const recentEvents = this.eventHistory.filter(
      event => Date.now() - event.timestamp < 60000 // Last minute
    ).length;

    return {
      totalListeners,
      activeEventTypes,
      recentEvents
    };
  }
}

// Export singleton instance
export const cacheInvalidationService = CacheInvalidationService.getInstance();

// Common event types
export const CACHE_EVENTS = {
  BUDDIES_UPDATED: 'buddies_updated',
  NOTES_UPDATED: 'notes_updated',
  MESSAGES_UPDATED: 'messages_updated',
  ONLINE_STATUS_CHANGED: 'online_status_changed',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  NOTIFICATIONS_UPDATED: 'notifications_updated',
  CHAT_UPDATED: 'chat_updated',
  SCREEN_REFRESH: 'screen_refresh'
} as const;
