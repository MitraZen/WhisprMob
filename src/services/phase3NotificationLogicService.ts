import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';

interface NotificationBatch {
  id: string;
  notifications: Array<{
    title: string;
    content: string;
    buddyName: string;
    priority: 'high' | 'normal' | 'low';
    timestamp: number;
  }>;
  createdAt: number;
  maxAge: number;
}

interface BuddyNameCache {
  [buddyId: string]: {
    name: string;
    timestamp: number;
    expiresAt: number;
  };
}

interface RateLimitState {
  [key: string]: {
    count: number;
    resetTime: number;
    windowSize: number;
  };
}

export class Phase3NotificationLogicService {
  private static instance: Phase3NotificationLogicService;
  private notificationBatch: NotificationBatch | null = null;
  // Per-user message accumulator - keeps all messages from each user until cleared
  private userMessageBatches: Map<string, Array<{ content: string; timestamp: number }>> = new Map();
  private buddyNameCache: BuddyNameCache = {};
  private rateLimitState: RateLimitState = {};
  private recentNotifications: Set<string> = new Set();
  private batchTimer: NodeJS.Timeout | null = null;
  private lastProcessTime: number = 0;
  
  // Configuration
  private readonly BATCH_SIZE = 10; // Increased to allow more messages per batch
  private readonly BATCH_DELAY = 1500; // 1.5 seconds - shorter delay for faster batching
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 20; // Increased max notifications per minute per buddy
  private readonly DEDUPLICATION_WINDOW = 5000; // 5 seconds
  private readonly MAX_BATCH_TIME = 3000; // Maximum time to wait before processing batch (3 seconds)

  private constructor() {
    this.loadCachedData();
    this.startCleanupInterval();
  }

  static getInstance(): Phase3NotificationLogicService {
    if (!Phase3NotificationLogicService.instance) {
      Phase3NotificationLogicService.instance = new Phase3NotificationLogicService();
    }
    return Phase3NotificationLogicService.instance;
  }

  /**
   * Phase 3: Smart Batching - Groups notifications to prevent spam
   * Accumulates messages per user until notification is cleared/processed
   */
  async addToBatch(
    title: string,
    content: string,
    buddyName: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    console.log('🧠 Phase 3: Adding notification to batch for user:', buddyName);

    // Check rate limiting first
    if (!this.checkRateLimit(buddyName)) {
      console.log('🧠 Phase 3: Rate limit exceeded, skipping notification');
      return;
    }

    // Check deduplication
    const notificationKey = this.generateNotificationKey(title, content, buddyName);
    if (this.isDuplicate(notificationKey)) {
      console.log('🧠 Phase 3: Duplicate notification detected, skipping');
      return;
    }

    // Add to recent notifications for deduplication
    this.recentNotifications.add(notificationKey);
    setTimeout(() => {
      this.recentNotifications.delete(notificationKey);
    }, this.DEDUPLICATION_WINDOW);

    // Add message to user's persistent batch (accumulates until cleared)
    if (!this.userMessageBatches.has(buddyName)) {
      this.userMessageBatches.set(buddyName, []);
    }
    const userBatch = this.userMessageBatches.get(buddyName)!;
    userBatch.push({
      content,
      timestamp: Date.now(),
    });

    console.log(`🧠 Phase 3: User ${buddyName} now has ${userBatch.length} messages in batch`);

    // Process and update notification immediately if high priority
    if (priority === 'high') {
      await this.processUserBatches();
    } else {
      // Schedule batch processing after delay (accumulates more messages)
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Phase 3: Process notification batch - sends/updates notifications for all users
   */
  private async processUserBatches(): Promise<void> {
    if (this.userMessageBatches.size === 0) {
      return;
    }

    console.log('🧠 Phase 3: Processing user batches');

    // Clear any pending timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Process each user's accumulated messages
    for (const [buddyName, messages] of this.userMessageBatches.entries()) {
      if (messages.length === 0) continue;

      if (messages.length === 1) {
        // Single message - show normally
        await notificationService.showMessageNotification(
          buddyName,
          messages[0].content,
          buddyName
        );
      } else {
        // Multiple messages - show all messages in one notification
        // Format: "Msg1\nMsg2\nMsg3..."
        const allMessages = messages.map(msg => msg.content).join('\n');
        await notificationService.showMessageNotification(
          buddyName,
          allMessages,
          buddyName,
          messages.length // Pass message count for notification tag
        );
      }
    }

    this.lastProcessTime = Date.now();
    console.log('✅ Phase 3: User batches processed successfully');
    // Note: We don't clear userMessageBatches here - they accumulate until notification is dismissed/cleared
  }

  /**
   * Phase 3: Process old batch (legacy method - kept for compatibility)
   */
  private async processBatch(): Promise<void> {
    // Legacy method - redirect to new processUserBatches
    await this.processUserBatches();
  }

  /**
   * Clear messages for a specific user (call when notification is dismissed or user opens chat)
   */
  clearUserBatch(buddyName: string): void {
    console.log('🧠 Phase 3: Clearing batch for user:', buddyName);
    this.userMessageBatches.delete(buddyName);
  }

  /**
   * Clear all user batches
   */
  clearAllBatches(): void {
    console.log('🧠 Phase 3: Clearing all user batches');
    this.userMessageBatches.clear();
  }

  /**
   * Get current batch status for a user
   */
  getUserBatchStatus(buddyName: string): { messageCount: number; messages: string[] } {
    const messages = this.userMessageBatches.get(buddyName) || [];
    return {
      messageCount: messages.length,
      messages: messages.map(msg => msg.content),
    };
  }

  /**
   * Phase 3: Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(async () => {
      await this.processUserBatches();
    }, this.BATCH_DELAY);
  }

  /**
   * Phase 3: Group notifications by buddy
   */
  private groupNotificationsByBuddy(notifications: any[]): { [buddyName: string]: any[] } {
    const grouped: { [buddyName: string]: any[] } = {};

    for (const notification of notifications) {
      if (!grouped[notification.buddyName]) {
        grouped[notification.buddyName] = [];
      }
      grouped[notification.buddyName].push(notification);
    }

    return grouped;
  }

  /**
   * Phase 3: Rate Limiting - Prevents notification spam
   */
  private checkRateLimit(buddyName: string): boolean {
    const now = Date.now();
    const key = `rate_limit_${buddyName}`;
    
    if (!this.rateLimitState[key] || now > this.rateLimitState[key].resetTime) {
      // Reset rate limit window
      this.rateLimitState[key] = {
        count: 0,
        resetTime: now + this.RATE_LIMIT_WINDOW,
        windowSize: this.RATE_LIMIT_WINDOW,
      };
    }

    this.rateLimitState[key].count++;
    
    const isAllowed = this.rateLimitState[key].count <= this.RATE_LIMIT_MAX;
    
    if (!isAllowed) {
      console.log(`🧠 Phase 3: Rate limit exceeded for ${buddyName} (${this.rateLimitState[key].count}/${this.RATE_LIMIT_MAX})`);
    }

    return isAllowed;
  }

  /**
   * Phase 3: Deduplication - Prevents duplicate notifications
   */
  private isDuplicate(notificationKey: string): boolean {
    return this.recentNotifications.has(notificationKey);
  }

  /**
   * Phase 3: Generate notification key for deduplication
   */
  private generateNotificationKey(title: string, content: string, buddyName: string): string {
    return `${title}_${content}_${buddyName}`;
  }

  /**
   * Phase 3: Generate batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Phase 3: Buddy Name Resolution with Caching
   */
  async getBuddyName(buddyId: string): Promise<string> {
    console.log('👤 Phase 3: Getting buddy name with caching');

    // Check cache first
    const cached = this.buddyNameCache[buddyId];
    if (cached && Date.now() < cached.expiresAt) {
      console.log('👤 Phase 3: Using cached buddy name');
      return cached.name;
    }

    // Fetch from service
    try {
      const buddyName = await BuddiesService.getBuddyName(buddyId);
      
      // Cache the result
      this.buddyNameCache[buddyId] = {
        name: buddyName,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_TTL,
      };

      // Save to persistent storage
      await this.saveCachedData();

      console.log('👤 Phase 3: Buddy name cached successfully');
      return buddyName;
    } catch (error) {
      console.error('👤 Phase 3: Error getting buddy name:', error);
      return 'Unknown Buddy';
    }
  }

  /**
   * Phase 3: Clear buddy name cache
   */
  clearBuddyNameCache(): void {
    console.log('👤 Phase 3: Clearing buddy name cache');
    this.buddyNameCache = {};
    this.saveCachedData();
  }

  /**
   * Phase 3: Get cache statistics
   */
  getCacheStats(): {
    buddyNameCacheSize: number;
    rateLimitEntries: number;
    recentNotificationsSize: number;
  } {
    return {
      buddyNameCacheSize: Object.keys(this.buddyNameCache).length,
      rateLimitEntries: Object.keys(this.rateLimitState).length,
      recentNotificationsSize: this.recentNotifications.size,
    };
  }

  /**
   * Phase 3: Load cached data from storage
   */
  private async loadCachedData(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem('phase3_notification_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.buddyNameCache = parsed.buddyNameCache || {};
        console.log('🧠 Phase 3: Cached data loaded successfully');
      }
    } catch (error) {
      console.error('🧠 Phase 3: Error loading cached data:', error);
    }
  }

  /**
   * Phase 3: Save cached data to storage
   */
  private async saveCachedData(): Promise<void> {
    try {
      const dataToSave = {
        buddyNameCache: this.buddyNameCache,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('phase3_notification_cache', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('🧠 Phase 3: Error saving cached data:', error);
    }
  }

  /**
   * Phase 3: Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60000); // Cleanup every minute
  }

  /**
   * Phase 3: Cleanup expired data
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // Cleanup expired buddy name cache
    for (const [buddyId, cache] of Object.entries(this.buddyNameCache)) {
      if (now > cache.expiresAt) {
        delete this.buddyNameCache[buddyId];
      }
    }

    // Cleanup expired rate limit state
    for (const [key, state] of Object.entries(this.rateLimitState)) {
      if (now > state.resetTime) {
        delete this.rateLimitState[key];
      }
    }

    console.log('🧠 Phase 3: Cleanup completed');
  }

  /**
   * Phase 3: Force process any pending batch
   */
  async forceProcessBatch(): Promise<void> {
    if (this.notificationBatch) {
      await this.processBatch();
    }
  }

  /**
   * Phase 3: Get current batch status
   */
  getBatchStatus(): {
    hasBatch: boolean;
    batchSize: number;
    batchAge: number;
  } {
    if (!this.notificationBatch) {
      return { hasBatch: false, batchSize: 0, batchAge: 0 };
    }

    return {
      hasBatch: true,
      batchSize: this.notificationBatch.notifications.length,
      batchAge: Date.now() - this.notificationBatch.createdAt,
    };
  }
}

export default Phase3NotificationLogicService;

