import { Buddy, BuddyMessage, WhisprNote } from './buddiesService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  buddies: number;
  messages: number;
  whisprNotes: number;
  userProfile: number;
}

export class QueryCache {
  private static cache = new Map<string, CacheEntry<any>>();
  
  // Cache TTL configuration (in milliseconds)
  private static readonly CACHE_TTL: CacheConfig = {
    buddies: 2 * 60 * 1000,        // 2 minutes
    messages: 30 * 1000,           // 30 seconds
    whisprNotes: 1 * 60 * 1000,    // 1 minute
    userProfile: 5 * 60 * 1000,    // 5 minutes
  };

  /**
   * Get cached data if it exists and is not expired
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove it
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached data with TTL
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL.buddies, // Default TTL
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Clear specific cache entry
   */
  static clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  static clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries by pattern
   */
  static clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: number;
  } {
    const now = Date.now();
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      expiredEntries,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Specific cache methods for different data types
  
  /**
   * Cache buddies data
   */
  static getBuddies(userId: string): Buddy[] | null {
    return this.get<Buddy[]>(`buddies_${userId}`);
  }

  static setBuddies(userId: string, buddies: Buddy[]): void {
    this.set(`buddies_${userId}`, buddies, this.CACHE_TTL.buddies);
  }

  /**
   * Cache messages data
   */
  static getMessages(buddyId: string): BuddyMessage[] | null {
    return this.get<BuddyMessage[]>(`messages_${buddyId}`);
  }

  static setMessages(buddyId: string, messages: BuddyMessage[]): void {
    this.set(`messages_${buddyId}`, messages, this.CACHE_TTL.messages);
  }

  /**
   * Cache whispr notes data
   */
  static getWhisprNotes(userId: string): WhisprNote[] | null {
    return this.get<WhisprNote[]>(`whispr_notes_${userId}`);
  }

  static setWhisprNotes(userId: string, notes: WhisprNote[]): void {
    this.set(`whispr_notes_${userId}`, notes, this.CACHE_TTL.whisprNotes);
  }

  /**
   * Cache user profile data
   */
  static getUserProfile(userId: string): any | null {
    return this.get<any>(`user_profile_${userId}`);
  }

  static setUserProfile(userId: string, profile: any): void {
    this.set(`user_profile_${userId}`, profile, this.CACHE_TTL.userProfile);
  }

  /**
   * Invalidate cache when data changes
   */
  static invalidateBuddies(userId: string): void {
    this.clear(`buddies_${userId}`);
  }

  static invalidateMessages(buddyId: string): void {
    this.clear(`messages_${buddyId}`);
  }

  static invalidateWhisprNotes(userId: string): void {
    this.clear(`whispr_notes_${userId}`);
  }

  static invalidateUserProfile(userId: string): void {
    this.clear(`user_profile_${userId}`);
  }

  /**
   * Invalidate all caches for a user
   */
  static invalidateUser(userId: string): void {
    this.clearByPattern(`.*_${userId}$`);
  }
}

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    QueryCache.cleanup();
  }, 5 * 60 * 1000);
}
