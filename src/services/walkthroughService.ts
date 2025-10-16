import { WalkthroughStep } from '@/components/Walkthrough';
import { StorageService } from '@/utils/helpers';

export interface WalkthroughConfig {
  id: string;
  name: string;
  steps: WalkthroughStep[];
  enabled: boolean;
  version: string; // For version control
}

export class WalkthroughService {
  private static readonly STORAGE_KEY = 'walkthrough_completed';
  private static readonly VERSION_KEY = 'walkthrough_version';
  private static readonly USER_WALKTHROUGH_KEY = 'user_walkthrough_completed';
  private static readonly CURRENT_VERSION = '1.0.0';

  // Define all available walkthroughs
  private static walkthroughs: WalkthroughConfig[] = [
    {
      id: 'main_app_tour',
      name: 'Main App Tour',
      version: '1.0.0',
      enabled: true,
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Whispr! 👋',
          description: 'Let\'s take a quick tour to help you get started with anonymous messaging and connecting with others.',
          icon: 'hand-left',
          position: 'center',
        },
        {
          id: 'whispr_notes',
          title: 'Send Anonymous Messages 📝',
          description: 'This is where you can send anonymous messages to the world. Your messages are matched with others based on mood and preferences.',
          icon: 'document-text',
          position: 'center',
        },
        {
          id: 'buddies',
          title: 'Connect with Buddies 👥',
          description: 'When someone responds to your message, they become your buddy. You can chat with them here and see their online status.',
          icon: 'people',
          position: 'center',
        },
        {
          id: 'profile',
          title: 'Manage Your Profile 👤',
          description: 'Update your profile, mood, and settings. Your mood helps match you with like-minded people.',
          icon: 'person',
          position: 'center',
        },
        {
          id: 'nearby',
          title: 'Discover Nearby Users 📍',
          description: 'Find and connect with users in your area. Great for meeting people nearby!',
          icon: 'location',
          position: 'center',
        },
        {
          id: 'live_whisprs',
          title: 'Live Whisprs 🔴',
          description: 'Join live anonymous chat rooms where you can chat with multiple people at once.',
          icon: 'radio',
          position: 'center',
        },
      ],
    },
    {
      id: 'first_message',
      name: 'First Message Guide',
      version: '1.0.0',
      enabled: true,
      steps: [
        {
          id: 'compose_message',
          title: 'Compose Your Message ✍️',
          description: 'Tap here to start typing your anonymous message. Be creative and authentic!',
          icon: 'create',
          position: 'center',
        },
        {
          id: 'select_mood',
          title: 'Choose Your Mood 😊',
          description: 'Select your current mood. This helps match you with people who share similar feelings.',
          icon: 'happy',
          position: 'center',
        },
        {
          id: 'send_message',
          title: 'Send Your Message 🚀',
          description: 'Tap send to share your message with the world. You\'ll be notified when someone responds!',
          icon: 'send',
          position: 'center',
        },
      ],
    },
    {
      id: 'buddy_chat',
      name: 'Buddy Chat Guide',
      version: '1.0.0',
      enabled: true,
      steps: [
        {
          id: 'select_buddy',
          title: 'Select a Buddy 💬',
          description: 'Tap on any buddy to start chatting. Green dots show who\'s online.',
          icon: 'chatbubble',
          position: 'center',
        },
        {
          id: 'send_message',
          title: 'Send Messages 📤',
          description: 'Type your message and tap send. Messages are delivered instantly!',
          icon: 'send',
          position: 'center',
        },
        {
          id: 'buddy_actions',
          title: 'Buddy Actions ⚙️',
          description: 'Long press on a buddy to access options like pin, clear chat, or remove buddy.',
          icon: 'ellipsis-horizontal',
          position: 'center',
        },
      ],
    },
  ];

  /**
   * Get all available walkthroughs
   */
  static getWalkthroughs(): WalkthroughConfig[] {
    return this.walkthroughs.filter(w => w.enabled);
  }

  /**
   * Get a specific walkthrough by ID
   */
  static getWalkthrough(id: string): WalkthroughConfig | undefined {
    return this.walkthroughs.find(w => w.id === id);
  }

  // Cache for walkthrough states to avoid repeated storage calls
  private static walkthroughCache = new Map<string, { completed: boolean; version: string; timestamp: number }>();
  private static readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Check if a walkthrough has been completed (with caching)
   */
  static async isWalkthroughCompleted(walkthroughId: string): Promise<boolean> {
    try {
      // Check cache first
      const cached = this.walkthroughCache.get(walkthroughId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.completed;
      }

      // Fetch from storage
      const completed = await StorageService.getItem(`${this.STORAGE_KEY}_${walkthroughId}`);
      const result = completed === 'true';
      
      // Update cache
      this.walkthroughCache.set(walkthroughId, {
        completed: result,
        version: this.CURRENT_VERSION,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('Error checking walkthrough completion:', error);
      return false;
    }
  }

  /**
   * Mark a walkthrough as completed (optimized)
   */
  static async markWalkthroughCompleted(walkthroughId: string): Promise<void> {
    try {
      // Batch storage operations
      const operations = [
        StorageService.setItem(`${this.STORAGE_KEY}_${walkthroughId}`, 'true'),
        StorageService.setItem(`${this.VERSION_KEY}_${walkthroughId}`, this.CURRENT_VERSION)
      ];
      
      await Promise.all(operations);
      
      // Update cache immediately
      this.walkthroughCache.set(walkthroughId, {
        completed: true,
        version: this.CURRENT_VERSION,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error marking walkthrough as completed:', error);
    }
  }

  /**
   * Check if any walkthrough needs to be shown (optimized with single storage call)
   */
  static async shouldShowWalkthrough(walkthroughId: string, userId?: string): Promise<boolean> {
    try {
      // If userId is provided, check user-specific walkthrough completion
      if (userId) {
        return await this.shouldShowWalkthroughForUser(walkthroughId, userId);
      }

      // Check cache first
      const cached = this.walkthroughCache.get(walkthroughId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return !cached.completed || cached.version !== this.CURRENT_VERSION;
      }

      // Single storage call to get both values
      const [completed, storedVersion] = await Promise.all([
        StorageService.getItem(`${this.STORAGE_KEY}_${walkthroughId}`),
        StorageService.getItem(`${this.VERSION_KEY}_${walkthroughId}`)
      ]);
      
      const isCompleted = completed === 'true';
      const shouldShow = !isCompleted || storedVersion !== this.CURRENT_VERSION;
      
      // Update cache
      this.walkthroughCache.set(walkthroughId, {
        completed: isCompleted,
        version: (storedVersion as string) || this.CURRENT_VERSION,
        timestamp: Date.now()
      });
      
      return shouldShow;
    } catch (error) {
      console.error('Error checking if walkthrough should be shown:', error);
      return true; // Default to showing if there's an error
    }
  }

  /**
   * Check if walkthrough should be shown for a specific user
   */
  static async shouldShowWalkthroughForUser(walkthroughId: string, userId: string): Promise<boolean> {
    try {
      const userWalkthroughs = await StorageService.getItem<{ [key: string]: boolean }>(`${this.USER_WALKTHROUGH_KEY}_${userId}`) || {};
      const isCompleted = userWalkthroughs[walkthroughId] === true;
      
      // Also check version for user-specific walkthroughs
      const storedVersion = await StorageService.getItem(`${this.VERSION_KEY}_${walkthroughId}`);
      const versionChanged = storedVersion !== this.CURRENT_VERSION;
      
      return !isCompleted || versionChanged;
    } catch (error) {
      console.error('Error checking user walkthrough:', error);
      return true; // Default to showing if there's an error
    }
  }

  /**
   * Mark walkthrough as completed for a specific user
   */
  static async markWalkthroughCompletedForUser(walkthroughId: string, userId: string): Promise<void> {
    try {
      const userWalkthroughs = await StorageService.getItem<{ [key: string]: boolean }>(`${this.USER_WALKTHROUGH_KEY}_${userId}`) || {};
      userWalkthroughs[walkthroughId] = true;
      
      await StorageService.setItem(`${this.USER_WALKTHROUGH_KEY}_${userId}`, userWalkthroughs);
      await StorageService.setItem(`${this.VERSION_KEY}_${walkthroughId}`, this.CURRENT_VERSION);
    } catch (error) {
      console.error('Error marking user walkthrough as completed:', error);
    }
  }

  /**
   * Reset all walkthrough completions (useful for testing)
   */
  static async resetAllWalkthroughs(): Promise<void> {
    try {
      for (const walkthrough of this.walkthroughs) {
        await StorageService.removeItem(`${this.STORAGE_KEY}_${walkthrough.id}`);
        await StorageService.removeItem(`${this.VERSION_KEY}_${walkthrough.id}`);
      }
    } catch (error) {
      console.error('Error resetting walkthroughs:', error);
    }
  }

  /**
   * Get walkthrough completion statistics
   */
  static async getCompletionStats(): Promise<{ completed: number; total: number; percentage: number }> {
    try {
      let completed = 0;
      const total = this.walkthroughs.length;

      for (const walkthrough of this.walkthroughs) {
        if (await this.isWalkthroughCompleted(walkthrough.id)) {
          completed++;
        }
      }

      return {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    } catch (error) {
      console.error('Error getting completion stats:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Get recommended walkthroughs for a specific screen/context
   */
  static getWalkthroughsForContext(context: string): WalkthroughConfig[] {
    const contextMap: { [key: string]: string[] } = {
      'whispr_notes': ['main_app_tour', 'first_message'],
      'buddies': ['main_app_tour', 'buddy_chat'],
      'chat': ['buddy_chat'],
      'profile': ['main_app_tour'],
      'nearby': ['main_app_tour'],
      'live_whisprs': ['main_app_tour'],
    };

    const recommendedIds = contextMap[context] || ['main_app_tour'];
    return this.walkthroughs.filter(w => recommendedIds.includes(w.id) && w.enabled);
  }
}

export default WalkthroughService;
