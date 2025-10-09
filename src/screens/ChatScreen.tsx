import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { BuddiesService, BuddyMessage } from '@/services/buddiesService';
import { UserProfileView } from '@/components/UserProfileView';

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
  buddy: any;
  user: any;
  onGoBack?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = React.memo(({ onNavigate, buddy, user, onGoBack }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const styles = createStyles(theme);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values for enhanced interactions
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const backButtonScale = useRef(new Animated.Value(1)).current;
  const moreButtonScale = useRef(new Animated.Value(1)).current;
  const scrollButtonScale = useRef(new Animated.Value(1)).current;
  
  // Animation values for typing indicator
  const typingDot1 = useRef(new Animated.Value(0.4)).current;
  const typingDot2 = useRef(new Animated.Value(0.4)).current;
  const typingDot3 = useRef(new Animated.Value(0.4)).current;
  
  // Animation values for smooth scroll
  const scrollViewOpacity = useRef(new Animated.Value(1)).current;

  // Load messages from database
  useEffect(() => {
    if (buddy?.id) {
      loadMessages();
    }
  }, [buddy?.id]);

  // Auto-refresh messages every 10 seconds (silent, no loader)
  useEffect(() => {
    if (!buddy?.id) return;

    const interval = setInterval(() => {
      loadMessages(false, true); // Silent refresh
    }, 10000); // Refresh every 10 seconds (less frequent)

    return () => clearInterval(interval);
  }, [buddy?.id]);

  const loadMessages = async (isRefresh = false, isSilent = false) => {
    if (!buddy?.id) return;
    
    if (isRefresh && !isSilent) {
      setIsRefreshing(true);
    } else if (!isSilent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      console.log('Loading messages for buddy:', buddy.id);
      const messagesData = await BuddiesService.getMessages(buddy.id, user.id);
      console.log(`Loaded ${messagesData.length} messages successfully`);
      
      // Smart state update - only update if messages actually changed
      setMessages((prevMessages) => {
        // If lengths differ, definitely update
        if (prevMessages.length !== messagesData.length) return messagesData;
        
        // Compare old vs new messages
        let changed = false;
        const merged = messagesData.map((newMessage) => {
          const oldMessage = prevMessages.find((m) => m.id === newMessage.id);
          if (!oldMessage) {
            changed = true;
            return newMessage;
          }
          
          const isSame =
            oldMessage.content === newMessage.content &&
            oldMessage.senderId === newMessage.senderId &&
            oldMessage.timestamp?.toString() === newMessage.timestamp?.toString() &&
            oldMessage.isRead === newMessage.isRead;
          
          if (!isSame) changed = true;
          return isSame ? oldMessage : newMessage;
        });
        
        return changed ? merged : prevMessages;
      });
      
      setLastUpdated(new Date());
      
      // Mark messages as read
      await BuddiesService.markMessagesAsRead(buddy.id, user.id);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      if (isRefresh && !isSilent) {
        setIsRefreshing(false);
      } else if (!isSilent) {
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
      
      // Reload messages to get the latest (silent refresh)
      await loadMessages(false, true);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore the message content if sending failed
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: Date | string | undefined): string => {
    if (!timestamp) return 'now';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'now';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const scrollToBottom = () => {
    // Use setTimeout to ensure the ScrollView is fully rendered
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Smooth scroll animation for new messages
  const smoothScrollToBottom = () => {
    Animated.sequence([
      Animated.timing(scrollViewOpacity, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scrollViewOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  // Enhanced button press animations
  const animateButtonPress = (animatedValue: Animated.Value, callback?: () => void) => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  // Typing indicator animation
  const startTypingAnimation = () => {
    const createTypingAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createTypingAnimation(typingDot1, 0),
      createTypingAnimation(typingDot2, 200),
      createTypingAnimation(typingDot3, 400),
    ]).start();
  };

  const stopTypingAnimation = () => {
    Animated.parallel([
      Animated.timing(typingDot1, { toValue: 0.4, duration: 200, useNativeDriver: true }),
      Animated.timing(typingDot2, { toValue: 0.4, duration: 200, useNativeDriver: true }),
      Animated.timing(typingDot3, { toValue: 0.4, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    smoothScrollToBottom();
  }, [messages]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (buddy?.id && messages.length > 0) {
      smoothScrollToBottom();
    }
  }, [buddy?.id]);

  // Scroll to bottom after loading messages
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      smoothScrollToBottom();
    }
  }, [isLoading, messages.length]);

  // Typing animation effect
  useEffect(() => {
    if (isTyping) {
      startTypingAnimation();
    } else {
      stopTypingAnimation();
    }
  }, [isTyping]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ scale: backButtonScale }] }}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => animateButtonPress(backButtonScale, () => onGoBack ? onGoBack() : onNavigate('buddies'))}
            activeOpacity={0.8}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        
        <View style={styles.buddyInfo}>
          <View style={styles.buddyStatus}>
            <View style={[
              styles.statusIndicator,
              buddy.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
            ]} />
            <TouchableOpacity onPress={() => {
              console.log('ChatScreen - Opening profile for buddy:', buddy);
              console.log('ChatScreen - Buddy ID:', buddy.buddyUserId || buddy.id);
              console.log('ChatScreen - Available buddy fields:', Object.keys(buddy));
              setShowProfileView(true);
            }}>
              <Text style={styles.buddyName}>{buddy.name}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buddyMeta}>
            <Text style={styles.buddyUsername}>{buddy.initials}</Text>
            {lastUpdated && (
              <Text style={styles.lastUpdatedText}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: moreButtonScale }] }}>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => animateButtonPress(moreButtonScale, () => Alert.alert('More Options', 'More options coming soon!'))}
            activeOpacity={0.8}
          >
            <Icon name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.ScrollView 
        ref={scrollViewRef}
        style={[styles.messagesContainer, { opacity: scrollViewOpacity }]}
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
            <Icon name="alert-circle" size={24} color={theme.colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadMessages()}>
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
              <Text style={styles.typingText}>Typing</Text>
              <View style={styles.typingDots}>
                <Animated.View style={[styles.dot, { opacity: typingDot1 }]} />
                <Animated.View style={[styles.dot, { opacity: typingDot2 }]} />
                <Animated.View style={[styles.dot, { opacity: typingDot3 }]} />
              </View>
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <Animated.View style={[styles.scrollToBottomButton, { transform: [{ scale: scrollButtonScale }] }]}>
          <TouchableOpacity
            style={styles.scrollToBottomButtonInner}
            onPress={() => animateButtonPress(scrollButtonScale, scrollToBottom)}
            activeOpacity={0.8}
          >
            <Icon name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
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
        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => animateButtonPress(sendButtonScale, handleSendMessage)}
            disabled={!newMessage.trim() || isSending}
            activeOpacity={0.8}
          >
            <Icon 
              name={isSending ? "hourglass" : "send"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </Animated.View>
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
});

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra padding for camera hole
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    // Enhanced shadow with gradient effect
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    // Subtle gradient effect using multiple shadows
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(124, 58, 237, 0.3)',
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
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
  },
  buddyMeta: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  lastUpdatedText: {
    ...theme.typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: spacing.xs,
  },
  moreButton: {
    padding: spacing.sm,
  },
  errorIcon: {
    marginBottom: spacing.sm,
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
    // Enhanced shadows for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    // Subtle border for definition
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: borderRadius.sm,
    // Enhanced shadow for user messages with gradient effect
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    // Gradient-like effect using border
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buddyBubble: {
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: borderRadius.sm,
    // Enhanced shadow for buddy messages
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    // Subtle border for definition
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
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
    fontSize: 11,
    marginTop: spacing.xs,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
    // Subtle shadow for better readability
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  buddyTimestamp: {
    color: '#6b7280',
    // Subtle shadow for better readability
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  typingBubble: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    // Enhanced shadow for typing bubble
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    // Subtle border
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  typingText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: spacing.sm,
    fontWeight: '500',
  },
  typingDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7c3aed',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    // Enhanced shadow for floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
    maxHeight: 120,
    minHeight: 44,
    textAlignVertical: 'top',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    // Enhanced shadow for floating effect
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    // Subtle border for definition
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
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
    // Enhanced floating shadow
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollToBottomButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle border for definition
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default ChatScreen;