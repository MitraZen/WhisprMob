/**
 * ActiveChatService - Tracks which chat is currently being viewed
 * Used to disable notifications when user is actively viewing a chat
 */

class ActiveChatService {
  private activeChatId: string | null = null;

  /**
   * Set the currently active chat
   */
  setActiveChat(chatId: string | null): void {
    this.activeChatId = chatId;
  }

  /**
   * Get the currently active chat
   */
  getActiveChat(): string | null {
    return this.activeChatId;
  }

  /**
   * Check if a specific chat is currently active
   * This method checks both the direct buddy ID and reciprocal buddy ID
   */
  isChatActive(chatId: string): boolean {
    return this.activeChatId === chatId;
  }

  /**
   * Check if a message's buddy ID corresponds to the active chat
   * This handles reciprocal buddy relationships
   */
  async isMessageForActiveChat(messageBuddyId: string): Promise<boolean> {
    if (!this.activeChatId) {
      return false;
    }

    // Direct match
    if (this.activeChatId === messageBuddyId) {
      return true;
    }

    // Check if this is a reciprocal buddy relationship
    try {
      const { supabase } = await import('@/config/supabase');
      
      // Get the active chat's buddy relationship
      const { data: activeBuddyData, error: activeError } = await supabase
        .from('buddies')
        .select('user_id, buddy_user_id')
        .eq('id', this.activeChatId)
        .single();
      
      if (activeError || !activeBuddyData) {
        return false;
      }

      // Get the message buddy's relationship
      const { data: messageBuddyData, error: messageError } = await supabase
        .from('buddies')
        .select('user_id, buddy_user_id')
        .eq('id', messageBuddyId)
        .single();
      
      if (messageError || !messageBuddyData) {
        return false;
      }

      // Check if they represent the same user pair (bidirectional relationship)
      const isSamePair = (
        (activeBuddyData.user_id === messageBuddyData.user_id && 
         activeBuddyData.buddy_user_id === messageBuddyData.buddy_user_id) ||
        (activeBuddyData.user_id === messageBuddyData.buddy_user_id && 
         activeBuddyData.buddy_user_id === messageBuddyData.user_id)
      );

      return isSamePair;
    } catch (error) {
      console.error('📱 Error checking reciprocal buddy relationship:', error);
      return false;
    }
  }

  /**
   * Clear the active chat (when navigating away)
   */
  clearActiveChat(): void {
    this.activeChatId = null;
  }

  /**
   * Force set active chat (for debugging)
   */
  forceSetActiveChat(chatId: string): void {
    this.activeChatId = chatId;
  }

  /**
   * Get current state for debugging
   */
  getDebugState(): any {
    return {
      activeChatId: this.activeChatId,
      isNull: this.activeChatId === null,
      isUndefined: this.activeChatId === undefined,
      type: typeof this.activeChatId
    };
  }

  /**
   * Test method - expose to global for console testing
   */
  testActiveChat(): void {
    // Test setting and checking
    this.setActiveChat('test-chat-id');
    this.isChatActive('test-chat-id');
    this.isChatActive('other-chat-id');
    this.clearActiveChat();
  }
}

export const activeChatService = new ActiveChatService();
