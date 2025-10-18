import { Buddy, BuddyMessage, WhisprNote } from './buddiesService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number; // Number of times this entry has been accessed
  size: number; // Estimated size of the data in bytes
  lastAccessed: number; // Timestamp of last access
  deliveryOrder?: number; // For message ordering
}

interface CacheConfig {
  buddies: number;
  messages: number;
  whisprNotes: number;
  userProfile: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number; // Total estimated size in bytes
  hitRate: number; // Percentage of cache hits
  missRate: number; // Percentage of cache misses
  hits: number;
  misses: number;
}

interface MessageDeliveryQueue {
  [buddyId: string]: {
    messages: Array<{message: BuddyMessage, deliveryOrder: number}>;
    lastProcessedOrder: number;
  };
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL

export class QueryCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10 MB
  private static currentCacheSize = 0;
  private static totalHits = 0;
  private static totalMisses = 0;
  private static messageDeliveryQueue: MessageDeliveryQueue = {};

  // Cache TTL configuration (in milliseconds) - OPTIMIZED for better performance
  private static readonly CACHE_TTL: CacheConfig = {
    buddies: 2 * 60 * 1000,        // 2 minutes (reasonable for buddy list)
    messages: 5 * 60 * 1000,        // 5 minutes (much longer for messages)
    whisprNotes: 2 * 60 * 1000,    // 2 minutes (reasonable for notes)
    userProfile: 5 * 60 * 1000,    // 5 minutes (user profile doesn't change often)
  };

  /**
   * Get cached data if it exists and is not expired
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove it
      this.clear(key);
      this.totalMisses++;
      return null;
    }
    
    // Update hit count and last accessed for LRU/LFU
    entry.hits++;
    entry.lastAccessed = now;
    this.totalHits++;
    
    return entry.data as T;
  }

  /**
   * Set cached data with TTL and manage cache size (LRU eviction)
   */
  static set<T>(key: string, data: T, ttl?: number, deliveryOrder?: number): void {
    const estimatedSize = this.estimateSize(data);

    // If adding this entry exceeds max size, evict oldest/least used
    if (this.currentCacheSize + estimatedSize > this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl !== undefined ? ttl : DEFAULT_TTL,
      hits: 0,
      size: estimatedSize,
      lastAccessed: Date.now(),
      deliveryOrder: deliveryOrder
    };
    this.cache.set(key, entry);
    this.currentCacheSize += estimatedSize;
  }

  /**
   * Clear a specific cache entry
   */
  static clear(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  static clearAll(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    this.totalHits = 0;
    this.totalMisses = 0;
    this.messageDeliveryQueue = {};
  }

  /**
   * Evict the least recently used item from the cache
   */
  private static evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTimestamp) {
        oldestTimestamp = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.clear(oldestKey);
    }
  }

  /**
   * Estimate the size of data for cache management
   * This is a very basic estimation and can be improved.
   */
  private static estimateSize(data: any): number {
    if (data === null || data === undefined) return 0;
    return JSON.stringify(data).length; // Rough estimate
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const totalEntries = this.cache.size;
    const hitRate = totalEntries === 0 ? 0 : (this.totalHits / (this.totalHits + this.totalMisses)) * 100;
    const missRate = totalEntries === 0 ? 0 : (this.totalMisses / (this.totalHits + this.totalMisses)) * 100;

    return {
      totalEntries,
      totalSize: this.currentCacheSize,
      hitRate: isNaN(hitRate) ? 0 : hitRate,
      missRate: isNaN(missRate) ? 0 : missRate,
      hits: this.totalHits,
      misses: this.totalMisses,
    };
  }

  // --- Enhanced Message Handling with Delivery Ordering ---

  /**
   * Add message to delivery queue for proper ordering
   */
  static addMessageToDeliveryQueue(buddyId: string, message: BuddyMessage, deliveryOrder: number): void {
    if (!this.messageDeliveryQueue[buddyId]) {
      this.messageDeliveryQueue[buddyId] = {
        messages: [],
        lastProcessedOrder: 0
      };
    }

    this.messageDeliveryQueue[buddyId].messages.push({ message, deliveryOrder });
    
    // Sort messages by delivery order
    this.messageDeliveryQueue[buddyId].messages.sort((a, b) => a.deliveryOrder - b.deliveryOrder);
    
    // Process messages in order
    this.processDeliveryQueue(buddyId);
  }

  /**
   * Process messages in the delivery queue in the correct order
   */
  private static processDeliveryQueue(buddyId: string): void {
    const queue = this.messageDeliveryQueue[buddyId];
    if (!queue) return;

    const key = `messages_${buddyId}`;
    let cachedMessages = this.get<BuddyMessage[]>(key) || [];

    // Process messages in order
    while (queue.messages.length > 0) {
      const nextMessage = queue.messages[0];
      
      // Only process if this is the next expected message
      if (nextMessage.deliveryOrder > queue.lastProcessedOrder) {
        // Add message to cache
        cachedMessages.push(nextMessage.message);
        
        // Sort messages by created_at to maintain proper order
        cachedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Update cache
        this.set(key, cachedMessages, this.CACHE_TTL.messages, nextMessage.deliveryOrder);
        
        // Update last processed order
        queue.lastProcessedOrder = nextMessage.deliveryOrder;
        
        // Remove processed message
        queue.messages.shift();
        
        console.log(`📦 Message processed in order for buddy ${buddyId}, delivery order: ${nextMessage.deliveryOrder}`);
      } else {
        // Skip out-of-order messages for now
        break;
      }
    }
  }

  /**
   * Get messages with proper ordering
   */
  static getMessages(buddyId: string, userId?: string): BuddyMessage[] | null {
    const key = userId ? `messages_${buddyId}_${userId}` : `messages_${buddyId}`;
    const messages = this.get<BuddyMessage[]>(key);
    
    if (messages) {
      // Ensure messages are sorted by creation time
      return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    
    return null;
  }

  /**
   * Set messages with proper ordering
   */
  static setMessages(buddyId: string, messages: BuddyMessage[], userId?: string, dynamicTtlSeconds?: number): void {
    const key = userId ? `messages_${buddyId}_${userId}` : `messages_${buddyId}`;
    const ttl = dynamicTtlSeconds ? dynamicTtlSeconds * 1000 : this.CACHE_TTL.messages;
    
    // Sort messages by creation time before caching
    const sortedMessages = messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    this.set(key, sortedMessages, ttl);
  }

  /**
   * Add message with delivery ordering
   */
  static addMessage(buddyId: string, newMessage: BuddyMessage, userId?: string, deliveryOrder?: number): void {
    const key = userId ? `messages_${buddyId}_${userId}` : `messages_${buddyId}`;
    const cachedMessages = this.get<BuddyMessage[]>(key);
    
    if (cachedMessages) {
      // Add new message to existing cache
      const updatedMessages = [...cachedMessages, newMessage];
      
      // Sort messages by creation time
      const sortedMessages = updatedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      this.set(key, sortedMessages, this.CACHE_TTL.messages, deliveryOrder);
    } else {
      // If no cache, just set the new message
      this.set(key, [newMessage], this.CACHE_TTL.messages, deliveryOrder);
    }
  }

  /**
   * Invalidate messages cache
   */
  static invalidateMessages(buddyId: string, userId?: string): void {
    const key = userId ? `messages_${buddyId}_${userId}` : `messages_${buddyId}`;
    this.clear(key);
    
    // Clear delivery queue for this buddy
    if (this.messageDeliveryQueue[buddyId]) {
      delete this.messageDeliveryQueue[buddyId];
    }
  }

  // --- Specific Cache Operations ---

  static getBuddies(userId: string): Buddy[] | null {
    return this.get<Buddy[]>(`buddies_${userId}`);
  }

  static setBuddies(userId: string, buddies: Buddy[]): void {
    this.set(`buddies_${userId}`, buddies, this.CACHE_TTL.buddies);
  }

  static invalidateBuddies(userId: string): void {
    this.clear(`buddies_${userId}`);
  }

  static getWhisprNotes(userId: string): WhisprNote[] | null {
    return this.get<WhisprNote[]>(`whispr_notes_${userId}`);
  }

  static setWhisprNotes(userId: string, notes: WhisprNote[]): void {
    this.set(`whispr_notes_${userId}`, notes, this.CACHE_TTL.whisprNotes);
  }

  static invalidateWhisprNotes(userId: string): void {
    this.clear(`whispr_notes_${userId}`);
  }

  static getUserProfile(userId: string): any | null {
    return this.get<any>(`user_profile_${userId}`);
  }

  static setUserProfile(userId: string, profile: any): void {
    this.set(`user_profile_${userId}`, profile, this.CACHE_TTL.userProfile);
  }

  static invalidateUserProfile(userId: string): void {
    this.clear(`user_profile_${userId}`);
  }

  /**
   * Invalidate all caches related to a specific user
   */
  static invalidateUser(userId: string): void {
    this.invalidateBuddies(userId);
    this.invalidateWhisprNotes(userId);
    this.invalidateUserProfile(userId);
    // Clear all messages related to this user (more complex, might need pattern matching)
    // For now, we'll rely on specific buddyId invalidation for messages
    // Or a more generic clearByPattern if keys are consistently structured
    this.clearByPattern(`messages_.*_${userId}`);
  }

  /**
   * Clear cache entries matching a pattern (e.g., 'messages_.*')
   */
  static clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.clear(key);
      }
    }
  }

  // ==============================================
  // OPERATION LOCKS FOR RACE CONDITION PREVENTION
  // ==============================================

  /**
   * Set operation lock to prevent race conditions
   */
  static setOperationLock(buddyId: string, userId: string, operation: string): void {
    const lockKey = `lock_${operation}_${buddyId}_${userId}`;
    this.set(lockKey, true, 5000); // 5 second lock
    console.log(`🔒 Operation lock set: ${operation} for buddy ${buddyId}`);
  }

  /**
   * Check if operation is locked
   */
  static isOperationLocked(buddyId: string, userId: string, operation: string): boolean {
    const lockKey = `lock_${operation}_${buddyId}_${userId}`;
    return !!this.get(lockKey);
  }

  /**
   * Release operation lock
   */
  static releaseOperationLock(buddyId: string, userId: string, operation: string): void {
    const lockKey = `lock_${operation}_${buddyId}_${userId}`;
    this.clear(lockKey);
    console.log(`🔓 Operation lock released: ${operation} for buddy ${buddyId}`);
  }

  /**
   * Atomic clear operation with lock
   */
  static atomicClearMessages(buddyId: string, userId: string): void {
    const operation = 'clear_messages';
    
    // Check if already locked
    if (this.isOperationLocked(buddyId, userId, operation)) {
      console.log(`🔒 Clear operation already in progress for buddy ${buddyId}`);
      return;
    }
    
    // Set lock
    this.setOperationLock(buddyId, userId, operation);
    
    try {
      const key = `messages_${buddyId}_${userId}`;
      this.cache.delete(key);
      console.log(`🗑️ Atomically cleared messages for buddy ${buddyId}`);
    } finally {
      // Always release lock
      this.releaseOperationLock(buddyId, userId, operation);
    }
  }

  /**
   * Atomic add operation with lock
   */
  static atomicAddMessage(buddyId: string, message: BuddyMessage, userId: string): void {
    const operation = 'add_message';
    
    // Check if already locked
    if (this.isOperationLocked(buddyId, userId, operation)) {
      console.log(`🔒 Add operation already in progress for buddy ${buddyId}`);
      return;
    }
    
    // Set lock
    this.setOperationLock(buddyId, userId, operation);
    
    try {
      const key = `messages_${buddyId}_${userId}`;
      const cachedMessages = this.get<BuddyMessage[]>(key);
      
      if (cachedMessages) {
        const updatedMessages = [...cachedMessages, message];
        this.set(key, updatedMessages, this.CACHE_TTL.messages);
        console.log(`➕ Atomically added message for buddy ${buddyId}`);
      }
    } finally {
      // Always release lock
      this.releaseOperationLock(buddyId, userId, operation);
    }
  }

  /**
   * Force cache refresh for more frequent updates
   * This can be called periodically or on user interaction
   */
  static forceRefreshMessages(buddyId: string, userId?: string): void {
    const key = userId ? `messages_${buddyId}_${userId}` : `messages_${buddyId}`;
    this.clear(key);
    console.log(`🔄 Force refresh: Cleared cache for buddy ${buddyId}`);
  }

  /**
   * Force refresh all message caches (for debugging/testing)
   */
  static forceRefreshAllMessages(): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('messages_')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.clear(key));
    console.log(`🔄 Force refresh: Cleared ${keysToDelete.length} message caches`);
  }

  /**
   * Get cache age for debugging
   */
  static getCacheAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }

  /**
   * Safe cache invalidation with lock
   */
  static safeInvalidateMessages(buddyId: string, userId: string): void {
    const operation = 'invalidate_messages';
    
    // Check if already locked
    if (this.isOperationLocked(buddyId, userId, operation)) {
      console.log(`🔒 Invalidation already in progress for buddy ${buddyId}`);
      return;
    }
    
    // Set lock
    this.setOperationLock(buddyId, userId, operation);
    
    try {
      this.invalidateMessages(buddyId, userId);
      console.log(`🔄 Safely invalidated messages for buddy ${buddyId}`);
    } finally {
      // Always release lock
      this.releaseOperationLock(buddyId, userId, operation);
    }
  }

  /**
   * Preload buddy data (buddies and their messages)
   */
  static async preloadBuddyData(userId: string, buddyIds: string[]): Promise<void> {
    // This function would typically be in CachedBuddiesService,
    // but for demonstration, it's here to show cache interaction.
    // In a real app, you'd call CachedBuddiesService.getMessages for each buddyId.
    console.log(`Preloading messages for ${buddyIds.length} buddies for user ${userId}`);
    // Simulate fetching and caching messages for each buddy
    // In a real scenario, you'd call CachedBuddiesService.getMessages(buddyId, userId)
    // which would then use setMessages internally.
  }

  /**
   * Get delivery queue status for debugging
   */
  static getDeliveryQueueStatus(): {[buddyId: string]: {queueLength: number, lastProcessedOrder: number}} {
    const status: {[buddyId: string]: {queueLength: number, lastProcessedOrder: number}} = {};
    
    for (const [buddyId, queue] of Object.entries(this.messageDeliveryQueue)) {
      status[buddyId] = {
        queueLength: queue.messages.length,
        lastProcessedOrder: queue.lastProcessedOrder
      };
    }
    
    return status;
  }
}