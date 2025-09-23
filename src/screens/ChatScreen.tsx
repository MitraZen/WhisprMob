import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl, Animated } from 'react-native';
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
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [isTypingAnimation, setIsTypingAnimation] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;

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
      if (__DEV__) {
        console.log('Loading messages for buddy:', buddy.id);
      }
      const messagesData = await BuddiesService.getMessages(buddy.id);
      if (__DEV__) {
        console.log(`Loaded ${messagesData.length} messages successfully`);
      }
      
      // Only scroll to bottom if new messages were added
      const hasNewMessages = messagesData.length > previousMessageCount;
      setMessages(messagesData);
      setPreviousMessageCount(messagesData.length);
      
      // Mark messages as read
      await BuddiesService.markMessagesAsRead(buddy.id, user.id);
      
      // Scroll to bottom only if new messages were added
      if (hasNewMessages && messagesData.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: 0, 
            animated: true,
            viewPosition: 0
          });
        }, 100);
      }
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

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollToBottom(!isNearBottom && messages.length > 5);
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToIndex({ 
        index: 0, 
        animated: true,
        viewPosition: 0
      });
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !buddy?.id) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      if (__DEV__) {
        console.log('Sending message to buddy:', buddy.id, 'Content:', messageContent);
      }
      const messageId = await BuddiesService.sendMessage(buddy.id, messageContent, 'text', user.id);
      if (__DEV__) {
        console.log('Message sent successfully:', messageId);
      }
      
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

  // Typing animation effect
  useEffect(() => {
    if (isTyping) {
      setIsTypingAnimation(true);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      setIsTypingAnimation(false);
      typingAnimation.setValue(0);
    }
  }, [isTyping, typingAnimation]);

  const renderMessage = useCallback(({ item: message }: { item: BuddyMessage }) => {
    const isUserMessage = message.senderId === user.id;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUserMessage ? styles.userMessage : styles.buddyMessage,
        ]}
      >
        {!isUserMessage && (
          <View style={styles.buddyAvatarSmall}>
            <Text style={styles.avatarTextSmall}>
              {buddy.initials || buddy.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUserMessage ? styles.userBubble : styles.buddyBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isUserMessage ? styles.userMessageText : styles.buddyMessageText,
          ]}>
            {message.content}
          </Text>
          <Text style={[
            styles.messageTimestamp,
            isUserMessage ? styles.userTimestamp : styles.buddyTimestamp,
          ]}>
            {formatTimestamp(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }, [user.id, buddy.initials, buddy.name]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('buddies')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.buddyInfo}>
          <View style={styles.buddyAvatar}>
            <Text style={styles.avatarText}>{buddy.initials || buddy.name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.buddyDetails}>
            <TouchableOpacity onPress={() => {
              if (__DEV__) {
                console.log('ChatScreen - Opening profile for buddy:', buddy);
                console.log('ChatScreen - Buddy ID:', buddy.buddyUserId || buddy.id);
              }
              setShowProfileView(true);
            }}>
              <Text style={styles.buddyName}>{buddy.name}</Text>
            </TouchableOpacity>
            <View style={styles.buddyStatus}>
              <View style={[
                styles.statusIndicator,
                buddy.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
              ]} />
              <Text style={styles.statusText}>
                {buddy.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => Alert.alert('More Options', 'More options coming soon!')}
        >
          <Text style={styles.moreButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollToIndexFailed={(info) => {
          // Fallback to scrollToEnd if scrollToIndex fails
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadMessages()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          )
        }
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>Typing</Text>
                <View style={styles.typingDots}>
                  <Animated.View style={[styles.dot, styles.dot1, { opacity: typingAnimation }]} />
                  <Animated.View style={[styles.dot, styles.dot2, { opacity: typingAnimation }]} />
                  <Animated.View style={[styles.dot, styles.dot3, { opacity: typingAnimation }]} />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <Text style={styles.scrollToBottomIcon}>⌄</Text>
        </TouchableOpacity>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
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
          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiIcon}>😊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonIcon}>✈️</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* User Profile View Modal */}
      {showProfileView && (
        <UserProfileView
          visible={showProfileView}
          onClose={() => setShowProfileView(false)}
          userId={buddy.buddyUserId || buddy.id}
          buddyName={buddy.name}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  buddyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    ...theme.shadows.sm,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buddyDetails: {
    flex: 1,
  },
  buddyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  buddyName: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  moreButton: {
    padding: spacing.sm,
  },
  moreButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  buddyMessage: {
    justifyContent: 'flex-start',
  },
  buddyAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    ...theme.shadows.sm,
  },
  avatarTextSmall: {
    color: theme.colors.onSurface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    ...theme.shadows.sm,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: borderRadius.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buddyBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    ...theme.shadows.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...theme.shadows.sm,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonIcon: {
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  scrollToBottomIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ChatScreen;