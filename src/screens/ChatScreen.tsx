import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { BuddiesService, BuddyMessage } from '@/services/buddiesService';
import { UserProfileView } from '@/components/UserProfileView';

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
  buddy: any;
  user: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigate, buddy, user }) => {
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load messages from database
  useEffect(() => {
    if (buddy?.id) {
      loadMessages();
    }
  }, [buddy?.id]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!buddy?.id) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [buddy?.id]);

  const loadMessages = async (isRefresh = false) => {
    if (!buddy?.id) return;
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      console.log('Loading messages for buddy:', buddy.id);
      const messagesData = await BuddiesService.getMessages(buddy.id);
      console.log(`Loaded ${messagesData.length} messages successfully`);
      setMessages(messagesData);
      
      // Mark messages as read
      await BuddiesService.markMessagesAsRead(buddy.id, user.id);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadMessages(true);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollToBottom(!isNearBottom && messages.length > 5);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !buddy?.id) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      console.log('Sending message to buddy:', buddy.id, 'Content:', messageContent);
      const messageId = await BuddiesService.sendMessage(buddy.id, messageContent, 'text', user.id);
      console.log('Message sent successfully:', messageId);
      
      // Reload messages to get the latest
      await loadMessages();
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore the message content if sending failed
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const scrollToBottom = () => {
    // Use setTimeout to ensure the ScrollView is fully rendered
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (buddy?.id && messages.length > 0) {
      scrollToBottom();
    }
  }, [buddy?.id]);

  // Scroll to bottom after loading messages
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom();
    }
  }, [isLoading, messages.length]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('buddies')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.buddyInfo}>
          <View style={styles.buddyStatus}>
            <View style={[
              styles.statusIndicator,
              buddy.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
            ]} />
            <TouchableOpacity onPress={() => setShowProfileView(true)}>
              <Text style={styles.buddyName}>{buddy.name}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.buddyUsername}>{buddy.initials}</Text>
        </View>

               <TouchableOpacity 
                 style={styles.moreButton}
                 onPress={() => Alert.alert('More Options', 'More options coming soon!')}
               >
                 <Text style={styles.moreButtonText}>⋯</Text>
               </TouchableOpacity>
               
        {/* Debug button - remove in production */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => {
            BuddiesService.testDatabase();
            BuddiesService.testMessageRetrieval(buddy.id);
            BuddiesService.testSendMessage(buddy.id, user.id);
          }}
        >
          <Text style={styles.debugButtonText}>🐛</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadMessages}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.senderId === user.id ? styles.userMessage : styles.buddyMessage,
              ]}
            >
              <View style={[
                styles.messageBubble,
                message.senderId === user.id ? styles.userBubble : styles.buddyBubble,
              ]}>
                <Text style={[
                  styles.messageText,
                  message.senderId === user.id ? styles.userMessageText : styles.buddyMessageText,
                ]}>
                  {message.content}
                </Text>
                <Text style={[
                  styles.messageTimestamp,
                  message.senderId === user.id ? styles.userTimestamp : styles.buddyTimestamp,
                ]}>
                  {formatTimestamp(message.createdAt)}
                </Text>
              </View>
            </View>
          ))
        )}

        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>Typing...</Text>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <Text style={styles.scrollToBottomText}>↓</Text>
        </TouchableOpacity>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || isSending}
        >
          <Text style={styles.sendButtonText}>
            {isSending ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* User Profile View Modal */}
      <UserProfileView
        visible={showProfileView}
        onClose={() => setShowProfileView(false)}
        userId={buddy.buddyUserId}
        buddyName={buddy.name}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...theme.shadows.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onPrimary,
  },
  buddyInfo: {
    flex: 1,
  },
  buddyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  buddyName: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onPrimary,
  },
  buddyUsername: {
    ...theme.typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  moreButton: {
    padding: spacing.sm,
  },
  moreButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  debugButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  buddyMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  buddyBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  buddyMessageText: {
    color: theme.colors.onSurface,
  },
  messageTimestamp: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  buddyTimestamp: {
    color: '#9ca3af',
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  typingBubble: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: '#9ca3af',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.onSurface,
    maxHeight: 100,
    textAlignVertical: 'top',
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollToBottomText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ChatScreen;