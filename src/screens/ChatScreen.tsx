import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, RefreshControl, Animated, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { CachedBuddiesService, BuddyMessage } from '@/services/cachedBuddiesService';
import { EnhancedBuddyProfileView } from '@/components/EnhancedBuddyProfileView';
import { activeChatService } from '@/services/activeChatService';
import { ThemedBottomSheet } from '@/components/themed';

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
  buddy: any;
  user: any;
  onGoBack?: () => void;
  onMessagesRead?: (buddyId: string) => void; // Add callback for when messages are marked as read
}

export const ChatScreen: React.FC<ChatScreenProps> = React.memo(({ onNavigate, buddy, user, onGoBack, onMessagesRead }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isChatCleared, setIsChatCleared] = useState(false);
  const clearedChatsRef = useRef<Set<string>>(new Set());
  
  const styles = createStyles(theme);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values for enhanced interactions
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

  // Set active chat when component mounts and clear when unmounts
  useEffect(() => {
    if (buddy?.id) {
      console.log('📱 ChatScreen: Setting active chat to:', buddy.id);
      activeChatService.setActiveChat(buddy.id);
    }

    // Cleanup: Clear active chat when component unmounts
    return () => {
      console.log('📱 ChatScreen: Clearing active chat');
      activeChatService.clearActiveChat();
    };
  }, [buddy?.id]);

  // Cleanup old optimistic messages periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages(prevMessages => {
        const now = Date.now();
        const cleanedMessages = prevMessages.filter(msg => {
          if (msg.id.startsWith('temp-')) {
            const messageTime = new Date(msg.timestamp || msg.createdAt).getTime();
            const ageSeconds = (now - messageTime) / 1000;
            
            if (ageSeconds > 30) {
              console.log('🧹 Periodic cleanup: Removing old optimistic message:', msg.id, 'age:', ageSeconds, 'seconds');
              return false;
            }
          }
          return true;
        });
        
        return cleanedMessages.length !== prevMessages.length ? cleanedMessages : prevMessages;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Mark messages as read when chat screen is opened
  useEffect(() => {
    if (buddy?.id && user?.id) {
      const markAsRead = async () => {
        try {
          console.log('Marking messages as read for buddy:', buddy.id);
          await CachedBuddiesService.markMessagesAsRead(buddy.id, user.id);
          
          // Notify parent component that messages were marked as read
          if (onMessagesRead) {
            onMessagesRead(buddy.id);
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };
      
      // Mark as read after a short delay to ensure messages are loaded
      const timer = setTimeout(markAsRead, 500);
      return () => clearTimeout(timer);
    }
  }, [buddy?.id, user?.id]);

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
    
    // ULTRA DIRECT: If chat was cleared, return empty data immediately
    if (isChatCleared || clearedChatsRef.current.has(buddy.id)) {
      console.log('🚫 ULTRA DIRECT: Chat was cleared, returning empty data');
      setMessages([]);
      return;
    }
    
    if (isRefresh && !isSilent) {
      setIsRefreshing(true);
    } else if (!isSilent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      console.log('Loading messages for buddy:', buddy.id);
      const messagesData = await CachedBuddiesService.getMessages(buddy.id, user.id);
      console.log(`Loaded ${messagesData.length} messages successfully`);
      
      // Debug: Check for duplicate message IDs
      const messageIds = messagesData.map(m => m.id);
      const uniqueIds = new Set(messageIds);
      if (messageIds.length !== uniqueIds.size) {
        console.warn('⚠️ DUPLICATE MESSAGE IDS DETECTED:', {
          total: messageIds.length,
          unique: uniqueIds.size,
          duplicates: messageIds.filter((id, index) => messageIds.indexOf(id) !== index)
        });
      }
      
      // Smart state update - only update if messages actually changed
      setMessages((prevMessages) => {
        // If lengths differ, definitely update
        if (prevMessages.length !== messagesData.length) return messagesData;
        
        // Compare old vs new messages and ensure no duplicates
        let changed = false;
        const messageMap = new Map<string, BuddyMessage>();
        
        // First, add all previous messages to the map
        prevMessages.forEach((msg) => {
          messageMap.set(msg.id, msg);
        });
        
        // Then process new messages, updating or adding as needed
        messagesData.forEach((newMessage) => {
          const existingMessage = messageMap.get(newMessage.id);
          
          if (!existingMessage) {
            // Check if this is a real message that should replace an optimistic one
            const optimisticMessage = Array.from(messageMap.values()).find(msg => 
              msg.id.startsWith('temp-') && 
              msg.content === newMessage.content && 
              msg.senderId === newMessage.senderId &&
              Math.abs(new Date(msg.timestamp || msg.createdAt).getTime() - new Date(newMessage.timestamp || newMessage.createdAt).getTime()) < 10000 // Increased to 10 seconds
            );
            
            if (optimisticMessage) {
              // Replace optimistic message with real one
              messageMap.delete(optimisticMessage.id);
              messageMap.set(newMessage.id, newMessage);
              changed = true;
              console.log('🔄 Replaced optimistic message with real message:', optimisticMessage.id, '->', newMessage.id);
            } else {
              // New message
              changed = true;
              messageMap.set(newMessage.id, newMessage);
            }
          } else {
            // Check if message content changed
            const isSame =
              existingMessage.content === newMessage.content &&
              existingMessage.senderId === newMessage.senderId &&
              existingMessage.timestamp?.toString() === newMessage.timestamp?.toString() &&
              existingMessage.isRead === newMessage.isRead;
            
            if (!isSame) {
              changed = true;
              messageMap.set(newMessage.id, newMessage);
            }
          }
        });
        
        // Clean up any remaining optimistic messages that are older than 30 seconds
        const now = Date.now();
        const cleanedMessages = Array.from(messageMap.values()).filter(msg => {
          if (msg.id.startsWith('temp-')) {
            const messageTime = new Date(msg.timestamp || msg.createdAt).getTime();
            const ageSeconds = (now - messageTime) / 1000;
            
            if (ageSeconds > 30) {
              console.log('🧹 Cleaning up old optimistic message:', msg.id, 'age:', ageSeconds, 'seconds');
              return false;
            }
          }
          return true;
        });
        
        if (cleanedMessages.length !== messageMap.size) {
          changed = true;
          messageMap.clear();
          cleanedMessages.forEach(msg => messageMap.set(msg.id, msg));
        }
        
        // Convert map back to array, sorted by timestamp
        const merged = Array.from(messageMap.values()).sort((a, b) => {
          const timeA = new Date(a.timestamp || a.createdAt).getTime();
          const timeB = new Date(b.timestamp || b.createdAt).getTime();
          return timeA - timeB;
        });
        
        return changed ? merged : prevMessages;
      });
      
      setLastUpdated(new Date());
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

    // Create optimistic message with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: BuddyMessage = {
      id: tempId,
      buddyId: buddy.id,
      senderId: user.id,
      receiverId: buddy.buddyUserId || '',
      content: messageContent,
      messageType: 'text',
      timestamp: new Date(),
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const result = await CachedBuddiesService.sendMessage(buddy.id, messageContent, 'text', user.id);
      
      if (result) {
        console.log('📤 Message sent successfully, replacing optimistic message:', tempId, '->', result);
        
        // Replace the optimistic message with the real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: result }
            : msg
        ));
        setLastUpdated(new Date());
        
        // Force a reload after a short delay to ensure the real message is properly loaded
        // This handles cases where real-time updates might interfere
        setTimeout(async () => {
          console.log('🔄 Force reloading messages to ensure consistency');
          await loadMessages(false, true);
        }, 1500);
      } else {
        console.warn('⚠️ No message ID returned from server');
        // Remove optimistic message if no ID returned
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
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

  // Action handlers for bottom sheet
  const handleClearChat = () => {
    setShowMoreOptions(false);
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🧹 Starting chat clear for buddy:', buddy.id, 'user:', user.id);
              
              // ULTRA SIMPLE: Clear local messages and set cleared state
              setMessages([]);
              setIsChatCleared(true);
              clearedChatsRef.current.add(buddy.id);
              console.log('🚫 SIMPLE: Local messages cleared and state set to cleared');
              
              // Clear from database
              await CachedBuddiesService.clearChatHistory(buddy.id, user.id);
              console.log('✅ Database clear completed');
              
              Alert.alert('Success', 'Chat history cleared successfully');
            } catch (error) {
              console.error('❌ Error clearing chat:', error);
              console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                buddyId: buddy.id,
                userId: user.id
              });
              Alert.alert('Error', `Failed to clear chat history: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      ]
    );
  };

  const handleBlockBuddy = () => {
    setShowMoreOptions(false);
    Alert.alert(
      'Block Buddy',
      'Are you sure you want to block this buddy? You won\'t be able to receive messages from them.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            try {
              await CachedBuddiesService.blockUser(buddy.buddyUserId || buddy.id, user.id);
              Alert.alert('Success', 'Buddy blocked successfully');
              // Navigate back to buddies screen
              if (onGoBack) {
                onGoBack();
              } else {
                onNavigate('buddies');
              }
            } catch (error) {
              console.error('Error blocking buddy:', error);
              Alert.alert('Error', 'Failed to block buddy');
            }
          }
        }
      ]
    );
  };

  const handleDeleteBuddy = () => {
    setShowMoreOptions(false);
    Alert.alert(
      'Delete Buddy',
      'Are you sure you want to delete this buddy? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await CachedBuddiesService.deleteBuddy(buddy.id, user.id);
              Alert.alert('Success', 'Buddy deleted successfully');
              // Navigate back to buddies screen
              if (onGoBack) {
                onGoBack();
              } else {
                onNavigate('buddies');
              }
            } catch (error) {
              console.error('Error deleting buddy:', error);
              Alert.alert('Error', 'Failed to delete buddy');
            }
          }
        }
      ]
    );
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onGoBack ? onGoBack() : onNavigate('buddies')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
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
              <Text style={styles.buddyUsername}>{buddy.username || buddy.name}</Text>
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setShowMoreOptions(true)}
          activeOpacity={0.7}
        >
          <Icon name="ellipsis-horizontal" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
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
          messages.map((message, index) => (
            <View
              key={`${message.id}-${index}`}
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
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
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
            activeOpacity={0.7}
          >
            <Icon 
              name={isSending ? "hourglass" : "send"} 
              size={20} 
              color={(!newMessage.trim() || isSending) ? theme.colors.onSurfaceVariant : theme.colors.onPrimary} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Enhanced Buddy Profile View Modal */}
      {showProfileView && (
        <EnhancedBuddyProfileView
          visible={showProfileView}
          onClose={() => setShowProfileView(false)}
          userId={buddy.buddyUserId || buddy.id}
          buddyName={buddy.name}
        />
      )}

      {/* More Options Bottom Sheet */}
      <ThemedBottomSheet
        visible={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
        title="Chat Options"
        items={[
          {
            id: 'clear',
            title: 'Clear Chat',
            icon: 'trash-outline',
            onPress: handleClearChat,
          },
          {
            id: 'block',
            title: 'Block',
            icon: 'ban',
            iconColor: theme.colors.error,
            destructive: true,
            onPress: handleBlockBuddy,
          },
          {
            id: 'delete',
            title: 'Delete',
            icon: 'trash',
            iconColor: theme.colors.error,
            destructive: true,
            onPress: handleDeleteBuddy,
          },
        ]}
        showCancelButton={true}
        cancelButtonText="Cancel"
      />
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
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
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
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  buddyUsername: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  buddyMeta: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  lastUpdatedText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontSize: 10,
    marginTop: spacing.xs,
  },
  moreButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
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
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  messageInput: {
    flex: 1,
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    maxHeight: 120,
    minHeight: 44,
    textAlignVertical: 'top',
    marginRight: spacing.md,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
    ...theme.shadows.sm,
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
  // Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg, // Account for home indicator on iOS
    ...theme.shadows.lg,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.onSurfaceVariant,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    opacity: 0.3,
  },
  bottomSheetContent: {
    paddingHorizontal: spacing.lg,
  },
  bottomSheetTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  bottomSheetItemText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    marginLeft: spacing.md,
    fontWeight: '500',
  },
  bottomSheetCancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bottomSheetCancelText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
});

export default ChatScreen;