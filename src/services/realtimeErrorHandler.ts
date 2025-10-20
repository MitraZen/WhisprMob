// Real-time Error Handler - Quick fix for CHANNEL_ERROR issues
// This provides graceful fallback when real-time subscriptions fail

export class RealtimeErrorHandler {
  private static pollingIntervals = new Map<string, NodeJS.Timeout>();
  private static isPollingActive = false;
  
  /**
   * Handle real-time connection errors gracefully
   */
  static handleConnectionError(userId: string): void {
    console.log('🔄 Real-time connection error detected - switching to polling mode');
    
    // Stop any existing polling
    this.stopPolling(userId);
    
    // Start polling fallback
    this.startPollingFallback(userId);
  }
  
  /**
   * Start polling fallback when real-time fails
   */
  private static startPollingFallback(userId: string): void {
    if (this.isPollingActive) {
      console.log('📡 Polling already active, skipping');
      return;
    }
    
    console.log('📡 Starting polling fallback for user:', userId);
    this.isPollingActive = true;
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(async () => {
      try {
        await this.pollForNewMessages(userId);
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 5000);
    
    this.pollingIntervals.set(userId, interval);
  }
  
  /**
   * Poll for new messages
   */
  private static async pollForNewMessages(userId: string): Promise<void> {
    try {
      const { supabase } = await import('@/config/supabase');
      
      // Get messages from last 10 seconds
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      
      const { data: messages, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .gte('created_at', tenSecondsAgo)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error polling messages:', error);
        return;
      }
      
      if (messages && messages.length > 0) {
        console.log('📨 Polling found new messages:', messages.length);
        
        // Process each new message
        for (const message of messages) {
          await this.processNewMessage(message, userId);
        }
      }
      
    } catch (error) {
      console.error('❌ Polling failed:', error);
    }
  }
  
  /**
   * Process a new message found via polling
   */
  private static async processNewMessage(message: any, userId: string): Promise<void> {
    try {
      // Check if this message is for the current user
      const isForCurrentUser = message.sender_id === userId || message.receiver_id === userId;
      
      if (!isForCurrentUser) {
        return;
      }
      
      console.log('📨 Processing polled message:', message.id);
      
      // Import and use the cached service to process the message
      const { CachedBuddiesService } = await import('@/services/cachedBuddiesService');
      
      // Apply the real-time update
      await CachedBuddiesService.applyRealtimeUpdate('message', message, userId);
      
      // Dispatch UI update event
      this.dispatchUIUpdate('message-updated', {
        buddyId: message.buddy_id,
        messageId: message.id,
        message: message
      });
      
    } catch (error) {
      console.error('❌ Error processing polled message:', error);
    }
  }
  
  /**
   * Dispatch UI update event
   */
  private static dispatchUIUpdate(eventType: string, data: any): void {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(eventType, { detail: data });
      window.dispatchEvent(event);
      console.log('📢 UI update dispatched:', eventType);
    }
  }
  
  /**
   * Stop polling for a specific user
   */
  static stopPolling(userId: string): void {
    const interval = this.pollingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(userId);
      console.log('🛑 Polling stopped for user:', userId);
    }
  }
  
  /**
   * Stop all polling
   */
  static stopAllPolling(): void {
    this.pollingIntervals.forEach((interval, userId) => {
      clearInterval(interval);
      console.log('🛑 Polling stopped for user:', userId);
    });
    this.pollingIntervals.clear();
    this.isPollingActive = false;
    console.log('🛑 All polling stopped');
  }
  
  /**
   * Check if polling is active
   */
  static isPolling(): boolean {
    return this.isPollingActive;
  }
  
  /**
   * Get polling status
   */
  static getPollingStatus(): { isActive: boolean; userCount: number } {
    return {
      isActive: this.isPollingActive,
      userCount: this.pollingIntervals.size
    };
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).RealtimeErrorHandler = RealtimeErrorHandler;
}
