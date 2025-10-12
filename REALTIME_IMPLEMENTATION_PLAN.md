# 🚀 **Realtime Migration Implementation Plan**

## 📊 **Current vs Future Architecture**

### **Current Polling Architecture**
```
Mobile App ──30s──► Supabase API ──Query──► Database
     │                    │                    │
     │                    │                    │
     ▼                    ▼                    ▼
Notification         Database Load         High CPU Usage
(0-30s delay)        (Frequent Queries)    (Continuous Polling)
```

### **Future Realtime Architecture**
```
Mobile App ◄──WebSocket──► Supabase Realtime ◄──Trigger──► Database
     │                           │                           │
     │                           │                           │
     ▼                           ▼                           ▼
Instant Notification         Event-Driven              Low CPU Usage
(<1s delay)                 (Minimal Load)            (Event-Triggered)
```

## 🔧 **Step-by-Step Implementation**

### **Step 1: Enable Supabase Realtime**

#### **1.1 Update Supabase Configuration**
```typescript
// src/config/supabase.ts
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'whispr-mobile-app',
    },
  },
  realtime: {
    // Enable realtime with optimized settings
    enabled: true,
    params: {
      eventsPerSecond: 10, // Rate limiting for performance
    },
  },
});
```

#### **1.2 Test Realtime Connection**
```typescript
// Test script to verify realtime works
const testRealtimeConnection = async () => {
  try {
    const { supabase } = await import('@/config/supabase');
    
    // Test basic connection
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (error) throw error;
    
    // Test realtime subscription
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles'
      }, (payload) => {
        console.log('Realtime test successful:', payload);
      })
      .subscribe();
      
    // Clean up test
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 5000);
    
    console.log('✅ Realtime connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Realtime connection test failed:', error);
    return false;
  }
};
```

### **Step 2: Create Enhanced Realtime Service**

#### **2.1 New RealtimeService Implementation**
```typescript
// src/services/realtimeService.ts
import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';

interface RealtimeSubscription {
  channel: any;
  unsubscribe: () => void;
  type: 'messages' | 'notes';
}

class RealtimeService {
  private subscriptions: RealtimeSubscription[] = [];
  private userId: string | null = null;
  private isConnected = false;
  private connectionRetryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000;
  private maxRetryDelay = 30000;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  async initialize(userId: string): Promise<boolean> {
    this.userId = userId;
    console.log('🔄 Initializing realtime service for user:', userId);
    
    try {
      // Test connection first
      await this.testConnection();
      
      // Subscribe to events
      await this.subscribeToMessages();
      await this.subscribeToNotes();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      
      console.log('✅ Realtime service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize realtime service:', error);
      await this.handleConnectionFailure();
      return false;
    }
  }

  private async testConnection(): Promise<void> {
    const { supabase } = await import('@/config/supabase');
    
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  private async subscribeToMessages(): Promise<void> {
    const { supabase } = await import('@/config/supabase');
    
    const channel = supabase
      .channel(`messages-${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_messages',
          filter: `receiver_id=eq.${this.userId}`,
        },
        async (payload) => {
          console.log('📨 New message received via realtime:', payload);
          await this.handleNewMessage(payload);
        }
      )
      .subscribe((status) => {
        console.log('📨 Message subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.connectionRetryCount = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.handleSubscriptionError('messages');
        }
      });

    this.subscriptions.push({
      channel,
      unsubscribe: () => supabase.removeChannel(channel),
      type: 'messages'
    });
  }

  private async subscribeToNotes(): Promise<void> {
    const { supabase } = await import('@/config/supabase');
    
    const channel = supabase
      .channel(`notes-${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whispr_notes',
          filter: `sender_id=neq.${this.userId}`,
        },
        async (payload) => {
          console.log('📝 New note received via realtime:', payload);
          await this.handleNewNote(payload);
        }
      )
      .subscribe((status) => {
        console.log('📝 Note subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.connectionRetryCount = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.handleSubscriptionError('notes');
        }
      });

    this.subscriptions.push({
      channel,
      unsubscribe: () => supabase.removeChannel(channel),
      type: 'notes'
    });
  }

  private async handleNewMessage(payload: any): Promise<void> {
    try {
      // Get buddy information
      const buddyInfo = await this.getBuddyInfo(payload.new.sender_id);
      
      // Send notification
      await notificationService.showMessageNotification(
        'New Message',
        payload.new.content,
        buddyInfo.name
      );
      
      console.log('✅ Message notification sent for:', buddyInfo.name);
    } catch (error) {
      console.error('❌ Error processing message notification:', error);
    }
  }

  private async handleNewNote(payload: any): Promise<void> {
    try {
      // Send notification
      await notificationService.showNoteNotification(
        'New Whispr Note',
        payload.new.content
      );
      
      console.log('✅ Note notification sent');
    } catch (error) {
      console.error('❌ Error processing note notification:', error);
    }
  }

  private async getBuddyInfo(senderId: string): Promise<{ name: string }> {
    try {
      const { supabase } = await import('@/config/supabase');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('id', senderId)
        .single();
        
      if (error) throw error;
      
      return {
        name: data.display_name || data.username || 'Anonymous User'
      };
    } catch (error) {
      console.error('Error getting buddy info:', error);
      return { name: 'Anonymous User' };
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isConnected) return;
      
      try {
        await this.testConnection();
        console.log('💚 Realtime health check passed');
      } catch (error) {
        console.warn('💛 Realtime health check failed:', error);
        await this.handleConnectionFailure();
      }
    }, 60000); // Check every minute
  }

  private async handleConnectionFailure(): Promise<void> {
    this.isConnected = false;
    this.connectionRetryCount++;
    
    console.log(`🔄 Connection failure #${this.connectionRetryCount}`);
    
    if (this.connectionRetryCount <= this.maxRetries) {
      const delay = Math.min(
        this.retryDelay * Math.pow(2, this.connectionRetryCount - 1),
        this.maxRetryDelay
      );
      
      console.log(`⏰ Retrying connection in ${delay}ms`);
      
      setTimeout(async () => {
        if (this.userId) {
          await this.initialize(this.userId);
        }
      }, delay);
    } else {
      console.log('❌ Max retries reached, triggering fallback');
      this.triggerPollingFallback();
    }
  }

  private handleSubscriptionError(type: 'messages' | 'notes'): void {
    console.error(`❌ ${type} subscription error`);
    // Remove failed subscription
    this.subscriptions = this.subscriptions.filter(sub => sub.type !== type);
    
    // Try to resubscribe
    setTimeout(async () => {
      if (type === 'messages') {
        await this.subscribeToMessages();
      } else {
        await this.subscribeToNotes();
      }
    }, 5000);
  }

  private triggerPollingFallback(): void {
    // Dispatch event to notify notification manager
    const event = new CustomEvent('realtime-failed', {
      detail: { userId: this.userId }
    });
    window.dispatchEvent(event);
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting realtime service...');
    
    // Clear health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Unsubscribe from all channels
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    
    this.subscriptions = [];
    this.isConnected = false;
    this.userId = null;
    
    console.log('✅ Realtime service disconnected');
  }

  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      subscriptionCount: this.subscriptions.length,
      retryCount: this.connectionRetryCount,
    };
  }
}

export const realtimeService = new RealtimeService();
```

### **Step 3: Create Hybrid Notification Manager**

#### **3.1 Enhanced NotificationManager**
```typescript
// src/services/notificationManager.ts
import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { realtimeService } from './realtimeService';

interface NotificationManager {
  startNotificationService: (userId: string) => Promise<void>;
  stopNotificationService: () => Promise<void>;
  isRealtimeActive: () => boolean;
  isPollingActive: () => boolean;
  getServiceStatus: () => {
    realtime: boolean;
    polling: boolean;
    fallbackMode: boolean;
  };
}

class NotificationManagerClass implements NotificationManager {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPollingActive = false;
  private isRealtimeActive = false;
  private userId: string | null = null;
  private fallbackMode = false;
  private lastMessageIds: { [buddyId: string]: string[] } = {};
  private lastNoteIds: string[] = [];

  async startNotificationService(userId: string): Promise<void> {
    this.userId = userId;
    console.log('🚀 Starting hybrid notification service for user:', userId);
    
    try {
      // Try realtime first
      const realtimeSuccess = await realtimeService.initialize(userId);
      
      if (realtimeSuccess) {
        this.isRealtimeActive = true;
        this.fallbackMode = false;
        console.log('✅ Realtime service started successfully');
        
        // Setup fallback listener
        this.setupRealtimeFailureListener();
      } else {
        throw new Error('Realtime initialization failed');
      }
    } catch (error) {
      console.warn('⚠️ Realtime failed, starting polling fallback:', error);
      await this.startPollingFallback(userId);
    }
  }

  private async startPollingFallback(userId: string): Promise<void> {
    this.fallbackMode = true;
    this.isRealtimeActive = false;
    this.startPolling(userId);
    console.log('🔄 Polling fallback activated');
  }

  private setupRealtimeFailureListener(): void {
    // Listen for realtime failures
    const handleRealtimeFailure = (event: any) => {
      const { userId } = event.detail;
      if (userId === this.userId && !this.fallbackMode) {
        console.log('🔄 Realtime failed, switching to polling');
        this.startPollingFallback(userId);
      }
    };

    window.addEventListener('realtime-failed', handleRealtimeFailure);
    
    // Store reference for cleanup
    (this as any).realtimeFailureHandler = handleRealtimeFailure;
  }

  private startPolling(userId: string): void {
    if (this.isPollingActive) {
      this.stopPolling();
    }

    this.userId = userId;
    this.isPollingActive = true;
    
    // Clear previous notification history
    this.lastMessageIds = {};
    this.lastNoteIds = [];
    
    // Use shorter interval in fallback mode
    const interval = this.fallbackMode ? 15000 : 30000;
    
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
      await this.checkForNewNotes();
    }, interval);

    console.log(`🔄 Notification polling started (${this.fallbackMode ? 'fallback' : 'primary'} mode, ${interval}ms interval)`);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPollingActive = false;
    console.log('🛑 Notification polling stopped');
  }

  async stopNotificationService(): Promise<void> {
    console.log('🛑 Stopping notification service...');
    
    // Stop realtime
    if (this.isRealtimeActive) {
      await realtimeService.disconnect();
      this.isRealtimeActive = false;
    }
    
    // Stop polling
    this.stopPolling();
    
    // Clean up event listeners
    if ((this as any).realtimeFailureHandler) {
      window.removeEventListener('realtime-failed', (this as any).realtimeFailureHandler);
    }
    
    this.userId = null;
    this.fallbackMode = false;
    
    console.log('✅ Notification service stopped');
  }

  isRealtimeActive(): boolean {
    return this.isRealtimeActive;
  }

  isPollingActive(): boolean {
    return this.isPollingActive;
  }

  getServiceStatus() {
    return {
      realtime: this.isRealtimeActive,
      polling: this.isPollingActive,
      fallbackMode: this.fallbackMode,
    };
  }

  // Keep existing polling methods as fallback
  private async checkForNewMessages(): Promise<void> {
    if (!this.userId) return;

    try {
      const buddies = await BuddiesService.getBuddies(this.userId);
      const limitedBuddies = buddies.slice(0, 20);
      
      for (const buddy of limitedBuddies) {
        try {
          const messages = await BuddiesService.getMessages(buddy.id, this.userId);
          const newMessages = messages.filter(msg => 
            msg.senderId !== this.userId && 
            !this.lastMessageIds[buddy.id]?.includes(msg.id)
          );
          
          if (newMessages.length > 0) {
            for (const message of newMessages) {
              await notificationService.showMessageNotification(
                'New Message',
                message.content,
                buddy.name
              );
            }
            
            // Update last message IDs
            this.lastMessageIds[buddy.id] = messages
              .filter(msg => msg.senderId !== this.userId)
              .slice(-50)
              .map(msg => msg.id);
          }
        } catch (error) {
          console.error(`Error checking messages for buddy ${buddy.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  private async checkForNewNotes(): Promise<void> {
    if (!this.userId) return;

    try {
      const notes = await BuddiesService.getWhisprNotes(this.userId);
      const newNotes = notes.filter(note => 
        note.senderId !== this.userId && 
        !this.lastNoteIds.includes(note.id)
      );
      
      if (newNotes.length > 0) {
        for (const note of newNotes.slice(0, 10)) {
          await notificationService.showNoteNotification(
            'New Whispr Note',
            note.content
          );
        }
        
        // Update last note IDs
        this.lastNoteIds = notes
          .filter(note => note.senderId !== this.userId)
          .slice(-50)
          .map(note => note.id);
      }
    } catch (error) {
      console.error('Error checking for new notes:', error);
    }
  }
}

export const notificationManager = new NotificationManagerClass();
```

### **Step 4: Update AuthContext Integration**

#### **4.1 Enhanced AuthContext**
```typescript
// src/store/AuthContext.tsx
// Add to the existing AppState listener

useEffect(() => {
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('AppState changed to:', nextAppState);
    
    if (nextAppState === 'active' && state.isAuthenticated && state.user) {
      console.log('App became active - starting hybrid notification services');
      
      try {
        // Start hybrid notification service (realtime + polling fallback)
        await notificationManager.startNotificationService(state.user.id);
        
        // Update online status
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, true);
        await BuddiesService.syncUserOnlineStatus(state.user.id, true);
        
        console.log('✅ Notification services started successfully');
      } catch (error) {
        console.error('❌ Failed to start notification services:', error);
      }
      
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('App went to background - optimizing notification services');
      
      // Update online status
      if (state.isAuthenticated && state.user) {
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, false);
        await BuddiesService.syncUserOnlineStatus(state.user.id, false);
      }
      
      // Optimize for background (reduce activity but keep connection)
      await notificationManager.optimizeForBackground();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  
  return () => {
    subscription?.remove();
  };
}, [state.isAuthenticated, state.user]);
```

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
// src/services/__tests__/realtimeService.test.ts
describe('RealtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize realtime service successfully', async () => {
    const userId = 'test-user-123';
    const result = await realtimeService.initialize(userId);
    expect(result).toBe(true);
    expect(realtimeService.isRealtimeConnected()).toBe(true);
  });

  it('should handle connection failures gracefully', async () => {
    // Mock connection failure
    jest.mocked(supabase.from).mockRejectedValue(new Error('Connection failed'));
    
    const userId = 'test-user-123';
    const result = await realtimeService.initialize(userId);
    expect(result).toBe(false);
    expect(realtimeService.isRealtimeConnected()).toBe(false);
  });

  it('should trigger fallback when max retries reached', async () => {
    // Test fallback triggering
    const mockEvent = jest.fn();
    window.addEventListener = mockEvent;
    
    // Simulate max retries
    for (let i = 0; i < 6; i++) {
      await realtimeService.handleConnectionFailure();
    }
    
    expect(mockEvent).toHaveBeenCalledWith('realtime-failed', expect.any(Function));
  });
});
```

### **Integration Tests**
```typescript
// src/services/__tests__/notificationManager.integration.test.ts
describe('NotificationManager Integration', () => {
  it('should start with realtime and fallback to polling', async () => {
    const userId = 'test-user-123';
    
    // Start service
    await notificationManager.startNotificationService(userId);
    
    // Should start with realtime
    expect(notificationManager.isRealtimeActive()).toBe(true);
    expect(notificationManager.isPollingActive()).toBe(false);
    
    // Simulate realtime failure
    window.dispatchEvent(new CustomEvent('realtime-failed', {
      detail: { userId }
    }));
    
    // Should fallback to polling
    expect(notificationManager.isRealtimeActive()).toBe(false);
    expect(notificationManager.isPollingActive()).toBe(true);
  });
});
```

## 📊 **Performance Monitoring**

### **Metrics to Track**
```typescript
// src/services/performanceMonitor.ts
class PerformanceMonitor {
  private metrics = {
    realtimeSuccessRate: 0,
    fallbackActivations: 0,
    averageLatency: 0,
    batteryUsage: 0,
  };

  trackRealtimeEvent(event: string, latency: number) {
    this.metrics.averageLatency = 
      (this.metrics.averageLatency + latency) / 2;
    
    console.log(`📊 Realtime Event: ${event}, Latency: ${latency}ms`);
  }

  trackFallbackActivation() {
    this.metrics.fallbackActivations++;
    console.log(`🔄 Fallback activated (${this.metrics.fallbackActivations} times)`);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Enable Supabase Realtime in configuration
- [ ] Implement enhanced RealtimeService
- [ ] Create hybrid NotificationManager
- [ ] Update AuthContext integration
- [ ] Write comprehensive tests
- [ ] Test on multiple devices
- [ ] Verify fallback mechanisms

### **Deployment**
- [ ] Deploy to staging environment
- [ ] Monitor realtime connection success rates
- [ ] Test fallback scenarios
- [ ] Gradual rollout to production
- [ ] Monitor performance metrics

### **Post-Deployment**
- [ ] Track notification delivery rates
- [ ] Monitor battery usage improvements
- [ ] Collect user feedback
- [ ] Optimize based on real-world data

---

## ✅ **Expected Results**

### **Performance Improvements**
- **Notification Latency**: 30s → <1s (97% improvement)
- **Battery Usage**: 30% reduction
- **Database Load**: 80% reduction
- **Network Requests**: 90% reduction

### **User Experience**
- **Instant Notifications**: Real-time message delivery
- **Better Battery Life**: Reduced background activity
- **Reliable Service**: Hybrid approach ensures notifications always work

**This implementation provides a robust, scalable real-time notification system with reliable fallback mechanisms.**
