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
    console.log('📱 Active chat changed from:', this.activeChatId, 'to:', chatId);
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
    const isActive = this.activeChatId === chatId;
    console.log('📱 Checking if chat is active:', {
      chatId: chatId,
      activeChatId: this.activeChatId,
      isActive: isActive
    });
    console.log('📱 Active chat service state:', {
      currentActiveChat: this.activeChatId,
      requestedChatId: chatId,
      match: this.activeChatId === chatId
    });
    return isActive;
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
        console.log('📱 Could not get active buddy data:', activeError);
        return false;
      }

      // Get the message buddy's relationship
      const { data: messageBuddyData, error: messageError } = await supabase
        .from('buddies')
        .select('user_id, buddy_user_id')
        .eq('id', messageBuddyId)
        .single();
      
      if (messageError || !messageBuddyData) {
        console.log('📱 Could not get message buddy data:', messageError);
        return false;
      }

      // Check if they represent the same user pair (bidirectional relationship)
      const isSamePair = (
        (activeBuddyData.user_id === messageBuddyData.user_id && 
         activeBuddyData.buddy_user_id === messageBuddyData.buddy_user_id) ||
        (activeBuddyData.user_id === messageBuddyData.buddy_user_id && 
         activeBuddyData.buddy_user_id === messageBuddyData.user_id)
      );

      console.log('📱 Reciprocal buddy check:', {
        activeBuddy: activeBuddyData,
        messageBuddy: messageBuddyData,
        isSamePair: isSamePair
      });

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
    console.log('📱 Active chat cleared from:', this.activeChatId);
    this.activeChatId = null;
  }

  /**
   * Force set active chat (for debugging)
   */
  forceSetActiveChat(chatId: string): void {
    console.log('📱 FORCE setting active chat to:', chatId);
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
    console.log('🧪 ACTIVE CHAT SERVICE TEST:');
    console.log('Current active chat:', this.activeChatId);
    console.log('Debug state:', this.getDebugState());
    
    // Test setting and checking
    this.setActiveChat('test-chat-id');
    console.log('After setting test chat:', this.getActiveChat());
    console.log('Is test chat active?', this.isChatActive('test-chat-id'));
    console.log('Is other chat active?', this.isChatActive('other-chat-id'));
    
    this.clearActiveChat();
    console.log('After clearing:', this.getActiveChat());
  }
}

export const activeChatService = new ActiveChatService();
