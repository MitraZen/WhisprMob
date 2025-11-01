import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

interface MessageCache {
  messages: CachedMessage[];
  lastUpdated: number;
  buddyId: string;
}

/**
 * 💾 SIMPLE MESSAGE CACHE SERVICE
 * 
 * Stores messages in AsyncStorage for instant loading
 * No complex logic - just simple get/set operations
 */
class MessageCacheService {
  private static CACHE_PREFIX = '@message_cache_';
  private static CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
  private memoryCache: Map<string, MessageCache> = new Map();

  /**
   * Get cache key for a buddy
   */
  private getCacheKey(buddyId: string): string {
    return `${MessageCacheService.CACHE_PREFIX}${buddyId}`;
  }

  /**
   * 📖 GET MESSAGES FROM CACHE
   * First checks memory, then AsyncStorage
   */
  async getMessages(buddyId: string): Promise<CachedMessage[] | null> {
    try {
      // Check memory cache first (instant)
      if (this.memoryCache.has(buddyId)) {
        const cached = this.memoryCache.get(buddyId)!;
        const age = Date.now() - cached.lastUpdated;
        
        if (age < MessageCacheService.CACHE_DURATION) {
          console.log('📦 Memory cache HIT for buddy:', buddyId, '- Messages:', cached.messages.length);
          return cached.messages;
        } else {
          console.log('⏰ Memory cache EXPIRED for buddy:', buddyId);
          this.memoryCache.delete(buddyId);
        }
      }

      // Check AsyncStorage (fast)
      const cacheKey = this.getCacheKey(buddyId);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        console.log('📦 AsyncStorage cache MISS for buddy:', buddyId);
        return null;
      }

      const parsed: MessageCache = JSON.parse(cachedData);
      const age = Date.now() - parsed.lastUpdated;
      
      if (age >= MessageCacheService.CACHE_DURATION) {
        console.log('⏰ AsyncStorage cache EXPIRED for buddy:', buddyId);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      // Store in memory for next time
      this.memoryCache.set(buddyId, parsed);
      console.log('📦 AsyncStorage cache HIT for buddy:', buddyId, '- Messages:', parsed.messages.length);
      
      return parsed.messages;
    } catch (error) {
      console.error('❌ Error getting cached messages:', error);
      return null;
    }
  }

  /**
   * 💾 SAVE MESSAGES TO CACHE
   * Saves to both memory and AsyncStorage
   */
  async saveMessages(buddyId: string, messages: CachedMessage[]): Promise<void> {
    try {
      const cache: MessageCache = {
        messages,
        lastUpdated: Date.now(),
        buddyId
      };

      // Save to memory (instant access)
      this.memoryCache.set(buddyId, cache);

      // Save to AsyncStorage (persistent)
      const cacheKey = this.getCacheKey(buddyId);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
      
      console.log('💾 Saved', messages.length, 'messages to cache for buddy:', buddyId);
    } catch (error) {
      console.error('❌ Error saving cached messages:', error);
    }
  }

  /**
   * ➕ ADD SINGLE MESSAGE TO CACHE
   * Optimistically adds a message without rewriting entire cache
   */
  async addMessage(buddyId: string, message: CachedMessage): Promise<void> {
    try {
      // Get existing messages
      const existing = await this.getMessages(buddyId) || [];
      
      // Check if message already exists
      if (existing.some(m => m.id === message.id)) {
        console.log('⚠️ Message already in cache:', message.id);
        return;
      }

      // Add new message
      const updated = [...existing, message];
      await this.saveMessages(buddyId, updated);
      
      console.log('➕ Added message to cache:', message.id);
    } catch (error) {
      console.error('❌ Error adding message to cache:', error);
    }
  }

  /**
   * 🔄 UPDATE MESSAGE IN CACHE
   * Replaces temporary ID with real ID after send
   */
  async updateMessage(buddyId: string, oldId: string, newId: string): Promise<void> {
    try {
      const existing = await this.getMessages(buddyId);
      if (!existing) return;

      const updated = existing.map(msg => 
        msg.id === oldId ? { ...msg, id: newId } : msg
      );

      await this.saveMessages(buddyId, updated);
      console.log('🔄 Updated message ID in cache:', oldId, '->', newId);
    } catch (error) {
      console.error('❌ Error updating message in cache:', error);
    }
  }

  /**
   * 🗑️ CLEAR CACHE FOR BUDDY
   */
  async clearCache(buddyId: string): Promise<void> {
    try {
      this.memoryCache.delete(buddyId);
      const cacheKey = this.getCacheKey(buddyId);
      await AsyncStorage.removeItem(cacheKey);
      console.log('🗑️ Cleared cache for buddy:', buddyId);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * 🧹 CLEAR ALL CACHES
   */
  async clearAllCaches(): Promise<void> {
    try {
      this.memoryCache.clear();
      
      // Get all keys and remove cache keys
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(MessageCacheService.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('🧹 Cleared all message caches:', cacheKeys.length, 'caches removed');
      }
    } catch (error) {
      console.error('❌ Error clearing all caches:', error);
    }
  }

  /**
   * 🔍 CHECK IF CACHE EXISTS
   */
  async hasCache(buddyId: string): Promise<boolean> {
    try {
      if (this.memoryCache.has(buddyId)) return true;
      
      const cacheKey = this.getCacheKey(buddyId);
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached !== null;
    } catch (error) {
      console.error('❌ Error checking cache:', error);
      return false;
    }
  }

  /**
   * 📊 GET CACHE INFO (for debugging)
   */
  async getCacheInfo(): Promise<{
    memoryCacheSize: number;
    asyncStorageCacheKeys: string[];
    totalMessages: number;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(MessageCacheService.CACHE_PREFIX));
      
      let totalMessages = 0;
      for (const [_, cache] of this.memoryCache) {
        totalMessages += cache.messages.length;
      }

      return {
        memoryCacheSize: this.memoryCache.size,
        asyncStorageCacheKeys: cacheKeys,
        totalMessages
      };
    } catch (error) {
      console.error('❌ Error getting cache info:', error);
      return {
        memoryCacheSize: 0,
        asyncStorageCacheKeys: [],
        totalMessages: 0
      };
    }
  }
}

// Export singleton instance
export const messageCacheService = new MessageCacheService();
export type { CachedMessage };