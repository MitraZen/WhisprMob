import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  Animated,
} from 'react-native';
import { SmartSafeAreaView } from '@/components/SmartSafeAreaView';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { TelegramStyleChatService } from '@/services/telegramStyleChatService';
import { activeChatService } from '@/services/activeChatService';
import { EnhancedBuddyProfileView } from '@/components/EnhancedBuddyProfileView';
import { getTextInputColor, getPlaceholderTextColor } from '@/utils/textColorUtils';
import { messageReactionsService, Emoji } from '@/services/messageReactionsService';
import { messageRepliesService, ReplyInfo } from '@/services/messageRepliesService';
import { CONVERSATION_STATES } from '@/config/profile.config';
import { BuddiesService } from '@/services/buddiesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatScreenProps {
  onNavigate: (screen: string) => void;
  buddy: any;
  user: any;
  onBack?: () => void;
  onMessagesRead?: (buddyId: string) => void;
}

interface SimpleMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

// MessageBubble Component with Microinteractions
interface MessageBubbleProps {
  message: SimpleMessage;
  isSent: boolean;
  styles: any;
  theme: any;
  formatTime: (date: string) => string;
  repliesByMessageId?: Record<string, ReplyInfo>;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  styles,
  theme,
  formatTime,
  repliesByMessageId,
}) => {
  // All hooks must be called in the same order every render
  // Initialize all refs unconditionally
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScaleAnim = useRef(new Animated.Value(0)).current;
  const prevReadStatusRef = useRef<boolean | undefined>(undefined);
  const messageIdRef = useRef<string | null>(null);
  
  // Pop-in animation when message appears
  useEffect(() => {
    // Only animate if this is a new message (different ID)
    if (message.id && message.id !== messageIdRef.current) {
      messageIdRef.current = message.id;
      
      // Reset animations for new message
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  // Animate checkmark appearance when status changes
  useEffect(() => {
    // Always run this effect, but only animate if conditions are met
    if (isSent && message.is_read !== undefined) {
      // Show checkmark with fade-in
      Animated.spring(checkmarkAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
      
      // If status changed from sent to read, add a scale animation
      const prevReadStatus = prevReadStatusRef.current;
      if (prevReadStatus !== undefined && !prevReadStatus && message.is_read) {
        Animated.sequence([
          Animated.spring(checkmarkScaleAnim, {
            toValue: 1.2,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(checkmarkScaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Ensure scale is set to 1 if not animating
        checkmarkScaleAnim.setValue(1);
      }
      
      prevReadStatusRef.current = message.is_read;
    } else {
      // For non-sent messages or undefined read status, hide checkmark
      checkmarkAnim.setValue(0);
      checkmarkScaleAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.is_read, isSent]);

  return (
    <Animated.View 
      style={[
        styles.messageBubble,
        isSent ? styles.sentBubble : styles.receivedBubble,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {repliesByMessageId?.[message.id] && (
        <View style={styles.replyToLabel}>
          <Text style={styles.replyToText}>
            {message.id === repliesByMessageId[message.id].reply_message_id ? (
              `Reply to: ${repliesByMessageId[message.id].original_content.substring(0, 50)}${repliesByMessageId[message.id].original_content.length > 50 ? '...' : ''}`
            ) : (
              `Replied: ${repliesByMessageId[message.id].reply_content.substring(0, 50)}${repliesByMessageId[message.id].reply_content.length > 50 ? '...' : ''}`
            )}
          </Text>
        </View>
      )}

      <View style={styles.messageContentContainer}>
        <Text style={[
          styles.messageText,
          isSent ? styles.sentMessageText : styles.receivedMessageText
        ]}>
          {message.content}
        </Text>
        
        <View style={[
          styles.messageFooter,
          isSent ? styles.sentMessageFooter : styles.receivedMessageFooter
        ]}>
          {!isSent && (
            <Text style={[
              styles.messageTimeInline,
              styles.receivedMessageTime
            ]}>
              {formatTime(message.created_at)}
            </Text>
          )}
          
          {/* For sent messages, show time and status on the right */}
          {isSent && (
            <>
              <Text style={[
                styles.messageTimeInline,
                styles.sentMessageTime
              ]}>
                {formatTime(message.created_at)}
              </Text>
              <Animated.View 
                style={[
                  styles.messageStatusContainer,
                  { 
                    opacity: checkmarkAnim,
                    transform: [{ scale: checkmarkScaleAnim }]
                  }
                ]}
              >
                {(() => {
                  // Message Status Indicators:
                  // - No tick = Message is still sending (temporary message)
                  // - Single tick (✓) = Delivered (message reached recipient's device, but not read yet)
                  // - Double tick (✓✓) = Read (recipient has read the message)
                  
                  // Check if message is a temporary one (still sending)
                  const isTemporaryMessage = message.id.startsWith('temp-');
                  
                  // If temporary (sending), show nothing (no status indicator yet)
                  if (isTemporaryMessage) {
                    return null;
                  }
                  
                  // For real messages in database:
                  // Single tick = Delivered (is_read = false)
                  // Double tick = Read (is_read = true)
                  return message.is_read ? (
                    <Text style={styles.readIndicator}>✓✓</Text>
                  ) : (
                    <Text style={styles.sentIndicator}>✓</Text>
                  );
                })()}
              </Animated.View>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// Memoize to prevent unnecessary re-renders and ensure stable hook order
const MessageBubble = React.memo(MessageBubbleComponent);

// Typing Indicator Component
interface TypingIndicatorProps {
  buddyName: string;
  styles: any;
  theme: any;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ buddyName, styles, theme }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -10,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.typingContainer}>
      <Text style={styles.typingText}>{buddyName} is typing</Text>
      <View style={styles.typingDots}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
};

// Swipeable Message Component
const SwipeableMessage = ({ 
  message, 
  isFromCurrentUser, 
  onReply, 
  children 
}: { 
  message: any; 
  isFromCurrentUser: boolean; 
  onReply: (message: any) => void; 
  children: React.ReactNode; 
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) { // END state
      const { translationX, velocityX } = event.nativeEvent;
      
      if (translationX > 50 || velocityX > 500) {
        onReply(message);
        
        Animated.sequence([
          Animated.timing(replyOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(replyOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View 
        style={[
          styles.replyFeedback,
          { opacity: replyOpacity }
        ]}
      >
        <Icon name="arrow-undo" size={24} color="#007AFF" />
        <Text style={styles.replyFeedbackText}>Reply</Text>
      </Animated.View>
      
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
        failOffsetY={[-5, 5]}
      >
        <Animated.View
          style={[
            styles.swipeableContent,
            { transform: [{ translateX }] }
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export const TelegramStyleChatScreen: React.FC<ChatScreenProps> = ({
  buddy,
  user,
  onBack,
  onNavigate,
  onMessagesRead,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [reactionsByMessageId, setReactionsByMessageId] = useState<Record<string, Record<string, number>>>({});
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  
  const [repliesByMessageId, setRepliesByMessageId] = useState<Record<string, ReplyInfo>>({});
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Typing indicator state
  const [isBuddyTyping, setIsBuddyTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const typingChannelRef = useRef<any>(null);
  
  // Conversation mode state (for the buddy you're chatting with)
  const [buddyConversationMode, setBuddyConversationMode] = useState<string>('open');
  
  // Scroll tracking and new message banner state
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const scrollPositionRef = useRef(0);
  const messagesEndRef = useRef(0);
  
  const flatListRef = useRef<FlatList<SimpleMessage>>(null);
  const processingMessages = useRef<Set<string>>(new Set());
  const lastAutoScrollTimeRef = useRef<number>(0);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) {
      return messages;
    }
    const query = searchQuery.toLowerCase().trim();
    return messages.filter(message => 
      message.content?.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  // Reversed messages for inverted FlatList (newest first in array, displayed at bottom)
  const reversedMessages = useMemo(() => {
    return [...filteredMessages].reverse();
  }, [filteredMessages]);

  // Toggle search mode
  const toggleSearchMode = () => {
    setIsSearchMode(prev => !prev);
    if (isSearchMode) {
      setSearchQuery('');
    }
  };

  useEffect(() => {
    if (buddy?.id && user?.id) {
      loadMessages();
      
      const markAsRead = async () => {
        try {
          const { CachedBuddiesService } = await import('@/services/cachedBuddiesService');
          console.log('📖 Marking messages as read for buddy:', buddy.id);
          await CachedBuddiesService.markMessagesAsRead(buddy.id, user.id);
          console.log('✅ Messages marked as read');
          
          try {
            const { phase3NotificationLogicService } = await import('@/services/phase3NotificationLogicService');
            if (buddy.name) {
              phase3NotificationLogicService.clearBatchForUser(buddy.name);
              console.log('🧠 Cleared notification batch for:', buddy.name);
            }
          } catch (batchError) {
            console.warn('⚠️ Could not clear notification batch:', batchError);
          }
          
          if (onMessagesRead) {
            onMessagesRead(buddy.id);
          }
        } catch (error) {
          console.error('❌ Error marking messages as read:', error);
        }
      };
      
      setTimeout(markAsRead, 500);
    }
  }, [buddy?.id, user?.id, onMessagesRead]);

  // Initial scroll to bottom when messages first load (inverted list - scroll to index 0)
  useEffect(() => {
    if (!flatListRef.current) return;
    if (reversedMessages.length === 0) return;

    const tryScroll = () => {
      if (!flatListRef.current) return;
      try {
        flatListRef.current.scrollToIndex({ index: 0, animated: false });
        setIsUserScrolling(false);
        console.log('✅ Scrolled to bottom (index 0)');
      } catch (e) {
        // Retry if scrollToIndex fails (item not rendered yet)
        setTimeout(() => tryScroll(), 150);
      }
    };

    tryScroll();
  }, [reversedMessages.length, buddy?.id]);

  // Load conversation mode for the buddy (the person you're chatting with)
  useEffect(() => {
    const buddyUserId = buddy?.buddyUserId || buddy?.id;
    if (!buddyUserId) return;

    const loadBuddyConversationMode = async () => {
      try {
        const profile = await BuddiesService.getUserProfile(buddyUserId);
        if (profile?.conversation_mode) {
          setBuddyConversationMode(profile.conversation_mode);
        } else {
          // Default to 'open' if not set
          setBuddyConversationMode('open');
        }
      } catch (error) {
        console.error('Error loading buddy conversation mode:', error);
        setBuddyConversationMode('open');
      }
    };
    
    loadBuddyConversationMode();

    // Set up real-time subscription to listen for conversation mode changes
    const setupRealtimeSubscription = async () => {
      try {
        const { supabase } = await import('@/config/supabase');
        
        const channel = supabase
          .channel(`user_profile:${buddyUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_profiles',
              filter: `id=eq.${buddyUserId}`,
            },
            (payload) => {
              if (payload.new?.conversation_mode) {
                setBuddyConversationMode(payload.new.conversation_mode);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up real-time subscription for conversation mode:', error);
      }
    };

    const cleanup = setupRealtimeSubscription();

    return () => {
      if (cleanup) {
        cleanup.then(fn => fn && fn());
      }
    };
  }, [buddy?.buddyUserId, buddy?.id]);

  useEffect(() => {
    if (buddy?.id) {
      activeChatService.setActiveChat(buddy.id);
    }

    return () => {
      activeChatService.clearActiveChat();
      // Stop typing when leaving chat
      if (typingChannelRef.current && user?.id) {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: user.id,
            isTyping: false,
          },
        }).catch(() => {
          // Ignore errors on cleanup
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setIsBuddyTyping(false);
    };
  }, [buddy?.id, user?.id]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      processingMessages.current.clear();
    }, 30000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Detect new messages when user is scrolled up and manage ref tracking
  useEffect(() => {
    // When user is scrolled up and new messages arrive, show banner
    if (isUserScrolling && messages.length > messagesEndRef.current) {
      const newCount = messages.length - messagesEndRef.current;
      setHasNewMessages(true);
      setNewMessageCount(newCount);
    } 
    // When user is at bottom, update ref and clear banner
    else if (!isUserScrolling) {
      setHasNewMessages(false);
      setNewMessageCount(0);
      messagesEndRef.current = messages.length;
    }
    // When messages first load (initial load), initialize ref
    else if (messagesEndRef.current === 0 && messages.length > 0) {
      messagesEndRef.current = messages.length;
    }
  }, [messages.length, isUserScrolling]);

  // Set up typing indicator realtime channel
  useEffect(() => {
    if (!buddy?.id || !user?.id) return;

    const setupTypingChannel = async () => {
      try {
        const { supabase } = await import('@/config/supabase');
        const channelName = `typing:${buddy.id}`;
        
        const channel = supabase.channel(channelName)
          .on('broadcast', { event: 'typing' }, (payload: any) => {
            const { userId, isTyping } = payload.payload || {};
            
            // Only show typing indicator if it's from the buddy (not self)
            if (userId !== user.id && isTyping) {
              setIsBuddyTyping(true);
              
              // Auto-hide after 3 seconds of no updates
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsBuddyTyping(false);
              }, 3000);
            } else if (userId !== user.id && !isTyping) {
              setIsBuddyTyping(false);
            }
          })
          .subscribe();

        typingChannelRef.current = channel;

        return () => {
          if (channel) {
            channel.unsubscribe();
          }
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        };
      } catch (error) {
        console.error('Error setting up typing channel:', error);
      }
    };

    const cleanup = setupTypingChannel();
    
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [buddy?.id, user?.id]);

  // Emit typing status when user types
  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    const now = Date.now();
    // Throttle typing emissions to every 500ms
    if (now - lastTypingEmitRef.current > 500) {
      emitTypingStatus(true);
      lastTypingEmitRef.current = now;
    }

    // Clear typing status after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStatus(false);
    }, 2000);
  };

  const emitTypingStatus = async (isTyping: boolean) => {
    if (!buddy?.id || !user?.id || !typingChannelRef.current) return;
    
    try {
      await typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          isTyping: isTyping,
        },
      });
    } catch (error) {
      console.error('Error emitting typing status:', error);
    }
  };

  useEffect(() => {
    if (!buddy?.id || !user?.id) return;

    const handleRealtimeMessageUpdate = async (event: any) => {
      try {
        if (!event?.detail) {
          return;
        }
        
        const messageBuddyId = event.detail?.buddyId;
        if (messageBuddyId === buddy.id) {
          addNewMessageIncrementally(event.detail?.message);
          return;
        }

        try {
          const { supabase } = await import('@/config/supabase');
        
        const { data: currentBuddyData, error: currentError } = await supabase
          .from('buddies')
          .select('user_id, buddy_user_id')
          .eq('id', buddy.id)
          .single();
        
        if (currentError || !currentBuddyData) {
          return;
        }

        const { data: messageBuddyData, error: messageError } = await supabase
          .from('buddies')
          .select('user_id, buddy_user_id')
          .eq('id', messageBuddyId)
          .single();
        
        if (messageError || !messageBuddyData) {
          return;
        }

        const isSamePair = (
          (currentBuddyData.user_id === messageBuddyData.user_id && 
           currentBuddyData.buddy_user_id === messageBuddyData.buddy_user_id) ||
          (currentBuddyData.user_id === messageBuddyData.buddy_user_id && 
           currentBuddyData.buddy_user_id === messageBuddyData.user_id)
        );

            if (isSamePair) {
              addNewMessageIncrementally(event.detail?.message);
            }
          } catch (error) {
            console.error('Error checking reciprocal buddy relationship:', error);
          }
    } catch (error) {
      console.error('Error in handleRealtimeMessageUpdate:', error);
    }
  };

  const handleBuddyDeleted = (eventData: any) => {
    try {
      if (eventData?.type !== 'buddy-deleted') {
        return;
      }
      
      if (eventData?.buddyId === buddy.id || eventData?.buddy_user_id === buddy.buddy_user_id) {
        Alert.alert(
          'Buddy Deleted',
          'This buddy relationship has been deleted.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onBack) {
                  onBack();
                } else {
                  onNavigate('buddies');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ TelegramStyleChatScreen: Error handling buddy deletion:', error);
    }
  };

    DeviceEventEmitter.removeAllListeners('message-updated');
    DeviceEventEmitter.removeAllListeners('buddy-deleted');

    const eventListener = (eventData: any) => {
      console.log('🔔 TelegramStyleChatScreen: Event listener triggered:', eventData);
      if (eventData?.type === 'message-updated') {
        handleRealtimeMessageUpdate({ detail: eventData });
      } else if (eventData?.type === 'buddy-deleted') {
        handleBuddyDeleted(eventData);
      }
    };

    const subscription = DeviceEventEmitter.addListener('message-updated', eventListener);
    const buddyDeletedSubscription = DeviceEventEmitter.addListener('buddy-deleted', eventListener);

    return () => {
      subscription.remove();
      buddyDeletedSubscription.remove();
      // Cleanup auto-scroll timeout on unmount
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }
    };
  }, [buddy?.id, user?.id]);

  const loadMessages = async (isRefresh = false, isSilent = false) => {
    try {
      // ✅ STEP 1: Try to load from cache INSTANTLY
      const { messageCacheService } = await import('@/services/messageCacheService');
      const cachedMessages = await messageCacheService.getMessages(buddy.id);
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('⚡ Showing cached messages instantly:', cachedMessages.length);
        setMessages(cachedMessages);
        setIsLoading(false);
        
        const messageIds = cachedMessages.map(msg => msg.id);
        messageRepliesService.getRepliesForMessages(messageIds).then(replies => {
          setRepliesByMessageId(replies || {});
        }).catch(() => {
          setRepliesByMessageId({});
        });
        
        if (!isRefresh) {
          console.log('🔄 Refreshing messages silently in background...');
          TelegramStyleChatService.getMessages(user.id, buddy.id).then(freshMessages => {
            messageCacheService.saveMessages(buddy.id, freshMessages);
            
            // ✅ PERFORMANCE FIX: Compare message IDs instead of JSON.stringify
            // JSON.stringify on large arrays (435+ messages) is extremely expensive and causes freeze
            const cachedIds = new Set(cachedMessages.map(msg => msg.id));
            const freshIds = new Set(freshMessages.map(msg => msg.id));
            
            // Quick comparison: different count or missing IDs
            const hasChanges = cachedIds.size !== freshIds.size || 
                               freshMessages.some(msg => !cachedIds.has(msg.id));
            
            if (hasChanges) {
              console.log('✨ Background refresh found new messages, updating UI');
              setMessages(freshMessages);
              
              const freshMessageIds = freshMessages.map(msg => msg.id);
              messageRepliesService.getRepliesForMessages(freshMessageIds).then(replies => {
                setRepliesByMessageId(replies || {});
              });
            } else {
              console.log('✓ Background refresh - no changes');
            }
          }).catch(err => {
            console.warn('⚠️ Background refresh failed (not critical):', err);
          });
          
          return;
        }
      }
      
      // ✅ STEP 2: No cache or forced refresh
      if (!cachedMessages || cachedMessages.length === 0) {
        console.log('📡 No cache found, loading from database...');
      } else {
        console.log('🔄 Forced refresh from database...');
      }
      
      if (!isSilent) {
        setIsLoading(true);
      }
      
      const chatMessages = await TelegramStyleChatService.getMessages(user.id, buddy.id);
      
      messageCacheService.saveMessages(buddy.id, chatMessages);
      
      setMessages(chatMessages);

      try {
        const messageIds = chatMessages.map(msg => msg.id);
        const replies = await messageRepliesService.getRepliesForMessages(messageIds);
        setRepliesByMessageId(replies || {});
      } catch (error: any) {
        console.warn('Error loading replies (non-critical):', error?.message || error);
        setRepliesByMessageId({});
      }
      
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      if (!isSilent) {
        Alert.alert('Error', 'Failed to load messages');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  };

  const addNewMessageIncrementally = async (messageData: any) => {
    if (!messageData || !messageData.id) {
      return;
    }
    
    if (processingMessages.current.has(messageData.id)) {
      return;
    }
    
    processingMessages.current.add(messageData.id);
    
    const newMessage: SimpleMessage = {
      id: messageData.id || `temp-${Date.now()}`,
      chat_id: messageData.buddy_id || buddy?.id || 'unknown',
      sender_id: messageData.sender_id || user?.id || 'unknown',
      content: messageData.content || 'Empty message',
      message_type: messageData.message_type || 'text',
      created_at: messageData.created_at || new Date().toISOString(),
      is_read: messageData.is_read || false
    };

    // Check if message is from current user (they sent it themselves)
    const isFromCurrentUser = newMessage.sender_id === user?.id;

    setMessages(prevMessages => {
      const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        return prevMessages;
      }

      const updatedMessages = [...prevMessages, newMessage];
      
      (async () => {
        try {
          const { messageCacheService } = await import('@/services/messageCacheService');
          await messageCacheService.addMessage(buddy.id, newMessage);
        } catch (error) {
          console.warn('⚠️ Failed to update cache with new message:', error);
        }
      })();
      
      return updatedMessages;
    });

    // Scroll behavior:
    // 1. If user sent their own message → Always scroll (they want to see what they sent)
    // 2. If message is from buddy AND user is scrolled up → Don't scroll (show banner instead)
    // 3. If message is from buddy AND user is at bottom → Auto-scroll to show new message
    setTimeout(() => {
      if (flatListRef.current) {
        if (isFromCurrentUser) {
          // User sent their own message - always scroll to see it
          try {
            flatListRef.current.scrollToIndex({ index: 0, animated: true });
          } catch (error) {
            // Fallback
            if (flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }
        } else if (!isUserScrolling) {
          // Message from buddy, but user is at bottom - auto-scroll
          try {
            flatListRef.current.scrollToIndex({ index: 0, animated: true });
          } catch (error) {
            // Fallback
            if (flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }
        } else {
          // Message from buddy, user is scrolled up - don't scroll, banner will show
          console.log('📍 User is scrolled up - not auto-scrolling, banner will show for new message');
        }
      }
    }, 100);
    
    setTimeout(() => {
      processingMessages.current.delete(messageData.id);
    }, 1000);
  };

  const deleteBuddy = async () => {
    Alert.alert(
      'Delete Buddy',
      `Are you sure you want to delete ${buddy.name || 'this buddy'}? This will permanently remove the buddy relationship and all messages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { BuddiesService } = await import('@/services/buddiesService');
              
              const result = await BuddiesService.deleteBuddy(buddy.id, user.id);
              
              if (result && result.success) {
                Alert.alert(
                  'Success',
                  `Buddy relationship deleted successfully. ${result.deleted_messages} messages were removed.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onBack) {
                          onBack();
                        } else {
                          onNavigate('buddies');
                        }
                      },
                    },
                  ]
                );
              } else {
                console.error('❌ Failed to delete buddy:', result);
                Alert.alert('Error', 'Failed to delete buddy relationship. Please try again.');
              }
            } catch (error) {
              console.error('❌ Error deleting buddy:', error);
              Alert.alert('Error', 'An error occurred while deleting the buddy. Please try again.');
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !buddy?.id || !user?.id) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    
    // Stop typing indicator when message is sent
    emitTypingStatus(false);

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: SimpleMessage = {
      id: tempId,
      chat_id: buddy.id,
      sender_id: user.id,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_read: false // Start as delivered (not read yet)
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      console.log(`📤 Sending message: ${messageContent}`);
      
      const messageId = await TelegramStyleChatService.sendMessage(
        user.id, 
        buddy.id, 
        messageContent, 
        'text'
      );
      
      if (messageId) {
        console.log('📤 Message sent successfully, replacing optimistic message:', tempId, '->', messageId);
        
        const finalMessage = { ...optimisticMessage, id: messageId };
        
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? finalMessage : msg
        ));
        
        (async () => {
          try {
            const { messageCacheService } = await import('@/services/messageCacheService');
            await messageCacheService.updateMessage(buddy.id, tempId, messageId);
          } catch (error) {
            console.warn('⚠️ Failed to update cache after send:', error);
          }
        })();

        if (replyingToMessage) {
          try {
            console.log('📤 Creating reply relationship:', replyingToMessage.id, '->', messageId);
            await messageRepliesService.createReply(replyingToMessage.id, messageId);
            
            const replyInfo = await messageRepliesService.getReplyForMessage(messageId);
            if (replyInfo) {
              setRepliesByMessageId(prev => ({
                ...prev,
                [messageId]: replyInfo
              }));
            }
            
            setReplyingToMessage(null);
          } catch (error) {
            console.error('❌ Error creating reply:', error);
          }
        }
      } else {
        console.warn('⚠️ No message ID returned from server');
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
      }
      
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageContent);
    }
  };

  const clearChat = async () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setMessages([]);
              setRepliesByMessageId({});
              setReactionsByMessageId({});
              
              try {
                const { messageCacheService } = await import('@/services/messageCacheService');
                await messageCacheService.clearCache(buddy.id);
                console.log('🗑️ Cache cleared for buddy:', buddy.id);
              } catch (error) {
                console.warn('⚠️ Failed to clear cache:', error);
              }
              
              await TelegramStyleChatService.clearChat(user.id, buddy.buddyUserId);
              
              await loadMessages();
              
              Alert.alert('Success', 'Chat cleared successfully!');
            } catch (error) {
              console.error('❌ Error clearing chat:', error);
              Alert.alert('Error', `Failed to clear chat: ${error instanceof Error ? error.message : String(error)}`);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to format date headers
  const formatDateHeader = (timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  // Helper function to determine if date header should be shown - memoized
  const shouldShowDateHeader = useCallback((currentMessage: SimpleMessage, previousMessage: SimpleMessage | null): boolean => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at);
    const previousDate = new Date(previousMessage.created_at);
    
    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);
    
    return currentDate.getTime() !== previousDate.getTime();
  }, []);

  const getOtherUserId = () => {
    if (!buddy || !user) {
      return null;
    }
    
    const otherUserId = buddy.buddyUserId || buddy.id;
    return otherUserId;
  };

  const getOtherUserName = () => {
    if (!buddy) return 'Chat';
    
    return buddy.name || buddy.display_name || 'Chat';
  };

  // Check if user is near bottom (within 100px)
  const checkIsNearBottom = (scrollPosition: number, contentHeight: number, scrollViewHeight: number): boolean => {
    return contentHeight - scrollPosition - scrollViewHeight < 100;
  };

  // Scroll handler to detect if user is scrolled away from bottom
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPosition = contentOffset.y;
    const scrollViewHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;
    
    const isNearBottom = checkIsNearBottom(scrollPosition, contentHeight, scrollViewHeight);
    
    setIsUserScrolling(!isNearBottom);
    scrollPositionRef.current = scrollPosition;
    
    if (isNearBottom) {
      setHasNewMessages(false);
      setNewMessageCount(0);
      messagesEndRef.current = messages.length;
    }
  };

  // Function to scroll to bottom and clear new message indicator
  // With inverted list, index 0 is the newest message (at bottom)
  const scrollToBottom = (animated: boolean = true) => {
    if (flatListRef.current && reversedMessages.length > 0) {
      try {
        flatListRef.current.scrollToIndex({ index: 0, animated });
        setIsUserScrolling(false);
        setHasNewMessages(false);
        setNewMessageCount(0);
        messagesEndRef.current = messages.length;
      } catch (error) {
        // Fallback if scrollToIndex fails
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated });
        }
      }
    }
  };

  // Memoized MessageItem component for better performance
  const MessageItem = React.memo<{
    message: SimpleMessage;
    index: number;
    isFromCurrentUser: boolean;
    showDateHeader: boolean;
    previousMessage: SimpleMessage | null;
    messageReactions: Record<string, number> | undefined;
    onReply: (msg: SimpleMessage) => void;
    onLongPress: (messageId: string) => void;
  }>(({ message, index, isFromCurrentUser, showDateHeader, previousMessage, messageReactions, onReply, onLongPress }) => {
    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <View style={styles.dateHeaderBadge}>
              <Text style={styles.dateHeaderText}>
                {formatDateHeader(message.created_at)}
              </Text>
            </View>
          </View>
        )}
        
        <SwipeableMessage
          message={message}
          isFromCurrentUser={isFromCurrentUser}
          onReply={onReply}
        >
          <View
            style={[
              styles.messageContainer,
              isFromCurrentUser ? styles.sentMessage : styles.receivedMessage,
            ]}
          >
            <Pressable
              delayLongPress={500}
              pressRetentionOffset={{ top: 20, left: 20, right: 20, bottom: 20 }}
              onLongPress={() => onLongPress(message.id)}
              onPressIn={() => {
                console.log('press-in on bubble', message.id);
              }}
              android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: false }}
            >
              <MessageBubble
                message={message}
                isSent={isFromCurrentUser}
                styles={styles}
                theme={theme}
                formatTime={formatTime}
                repliesByMessageId={repliesByMessageId}
              />
            </Pressable>
            
            {messageReactions && (
              <View style={styles.reactionPillsRow}>
                {Object.entries(messageReactions).map(([emoji, count]) => (
                  <View key={`${message.id}-${emoji}`} style={styles.reactionPill}>
                    <Text style={styles.reactionPillText}>{`${emoji} ${count}`}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </SwipeableMessage>
      </View>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function for React.memo - only re-render if props actually change
    // Avoid JSON.stringify for performance - use shallow comparison
    const prevReactions = prevProps.messageReactions;
    const nextReactions = nextProps.messageReactions;
    let reactionsEqual = false;
    
    if (prevReactions === nextReactions) {
      reactionsEqual = true;
    } else if (prevReactions && nextReactions) {
      const prevKeys = Object.keys(prevReactions);
      const nextKeys = Object.keys(nextReactions);
      reactionsEqual = prevKeys.length === nextKeys.length &&
        prevKeys.every(key => prevReactions[key] === nextReactions[key]);
    } else if (!prevReactions && !nextReactions) {
      reactionsEqual = true;
    }
    
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.is_read === nextProps.message.is_read &&
      prevProps.message.created_at === nextProps.message.created_at &&
      prevProps.showDateHeader === nextProps.showDateHeader &&
      prevProps.isFromCurrentUser === nextProps.isFromCurrentUser &&
      reactionsEqual
    );
  });

  // Handlers for MessageItem - memoized
  const handleMessageReply = useCallback((msg: SimpleMessage) => {
    console.log('Swipe reply triggered for message:', msg.id);
    setReplyingToMessage(msg);
  }, []);

  const handleMessageLongPress = useCallback((messageId: string) => {
    console.log('Long press detected for message:', messageId);
    setReactionPickerMessageId(messageId);
    setReactionPickerVisible(true);
  }, []);

  // FlatList renderItem wrapper - memoized with useCallback
  // Note: With inverted list + reversed data, previousMessage is at index + 1
  const renderItem = useCallback(({ item, index }: { item: SimpleMessage; index: number }) => {
    const isFromCurrentUser = item.sender_id === user.id;
    // For inverted list with reversed data: previous message (visually above) is next in array
    const previousMessage = index + 1 < reversedMessages.length ? reversedMessages[index + 1] : null;
    const showDateHeader = shouldShowDateHeader(item, previousMessage);
    
    return (
      <MessageItem
        message={item}
        index={index}
        isFromCurrentUser={isFromCurrentUser}
        showDateHeader={showDateHeader}
        previousMessage={previousMessage}
        messageReactions={reactionsByMessageId[item.id]}
        onReply={handleMessageReply}
        onLongPress={handleMessageLongPress}
      />
    );
  }, [user?.id, reversedMessages, reactionsByMessageId, shouldShowDateHeader, handleMessageReply, handleMessageLongPress]);

  // FlatList keyExtractor - memoized
  const keyExtractor = useCallback((item: SimpleMessage, index: number) => {
    return item.id || `message-${index}`;
  }, []);

  const [showError, setShowError] = React.useState(false);
  
  React.useEffect(() => {
    if (!buddy || !user) {
      const timer = setTimeout(() => setShowError(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [buddy, user]);
  
  if (!buddy || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.errorText, { marginTop: 10, color: theme.colors.onSurface }]}>
          {!user ? 'Loading user data...' : 'Loading chat...'}
        </Text>
        {showError && !buddy && onNavigate && (
          <TouchableOpacity 
            style={{ marginTop: 20, padding: 10, backgroundColor: theme.colors.primary, borderRadius: 8 }}
            onPress={() => onNavigate('buddies')}
          >
            <Text style={{ color: 'white' }}>Go to Buddies</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SmartSafeAreaView 
        style={styles.safeArea}
        enableKeyboardAvoid={true}
        componentType="screen"
      >
        <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack || (() => onNavigate('buddies'))}>
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <TouchableOpacity 
            style={styles.usernameButton}
            onPress={() => {
              const otherUserId = getOtherUserId();
              
              if (otherUserId) {
                setShowProfileView(true);
              }
            }}
          >
            <Text style={styles.buddyName}>{getOtherUserName()}</Text>
            <Icon name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} style={styles.chevronIcon} />
          </TouchableOpacity>
          <View style={styles.statusContainer}>
            {(() => {
              const modeConfig = CONVERSATION_STATES.find(s => s.id === buddyConversationMode);
              if (modeConfig) {
                return (
                  <View style={[styles.conversationModeBadge, { backgroundColor: modeConfig.color + '20' }]}>
                    <Text style={styles.conversationModeEmoji}>{modeConfig.emoji}</Text>
                    <Text style={[styles.conversationModeText, { color: modeConfig.color }]}>
                      {modeConfig.label}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={toggleSearchMode}
          activeOpacity={0.7}
        >
          <Icon 
            name={isSearchMode ? "close" : "search"} 
            size={24} 
            color={isSearchMode ? theme.colors.error : theme.colors.primary} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuButton} onPress={clearChat}>
          <Icon name="trash-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.deleteButton} onPress={deleteBuddy}>
          <Icon name="person-remove-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {isSearchMode && (
        <View>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: getTextInputColor(theme) }]}
              placeholder="Search messages..."
              placeholderTextColor={getPlaceholderTextColor(theme)}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <Icon name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.trim().length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsCount}>
                {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'}
              </Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted={true}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={(event) => {
          // Simplified: Only handle new message auto-scroll when user is at bottom
          if (!flatListRef.current || reversedMessages.length === 0) return;
          if (isUserScrolling) return;
          
          // Debounce rapid scrolls
          const now = Date.now();
          const timeSinceLastScroll = now - lastAutoScrollTimeRef.current;
          if (timeSinceLastScroll < 200) {
            if (autoScrollTimeoutRef.current) {
              clearTimeout(autoScrollTimeoutRef.current);
            }
          }
          
          // Auto-scroll to newest message (index 0) if user is at bottom
          if (!isUserScrolling) {
            if (autoScrollTimeoutRef.current) {
              clearTimeout(autoScrollTimeoutRef.current);
            }
            autoScrollTimeoutRef.current = setTimeout(() => {
              if (flatListRef.current && !isUserScrolling && reversedMessages.length > 0) {
                try {
                  flatListRef.current.scrollToIndex({ index: 0, animated: true });
                  lastAutoScrollTimeRef.current = Date.now();
                } catch (error) {
                  // Fallback
                  if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                  }
                }
              }
              autoScrollTimeoutRef.current = null;
            }, 100);
          }
        }}
        onContentSizeChange={(contentWidth, contentHeight) => {
          // Simplified: Only handle new message auto-scroll when user is at bottom
          if (!flatListRef.current || reversedMessages.length === 0) return;
          if (isUserScrolling) return;
          
          const currentScrollPosition = scrollPositionRef.current;
          const estimatedDistanceFromBottom = contentHeight - currentScrollPosition;
          const isLikelyNearBottom = estimatedDistanceFromBottom < 300;
          
          if (isLikelyNearBottom) {
            if (autoScrollTimeoutRef.current) {
              clearTimeout(autoScrollTimeoutRef.current);
            }
            autoScrollTimeoutRef.current = setTimeout(() => {
              if (flatListRef.current && !isUserScrolling && reversedMessages.length > 0) {
                try {
                  flatListRef.current.scrollToIndex({ index: 0, animated: true });
                  lastAutoScrollTimeRef.current = Date.now();
                } catch (error) {
                  // Fallback
                  if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                  }
                }
              }
              autoScrollTimeoutRef.current = null;
            }, 100);
          }
        }}
        ListEmptyComponent={() => {
          if (isLoading && messages.length === 0) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            );
          }
          if (filteredMessages.length === 0 && searchQuery.trim().length > 0) {
            return (
              <View style={styles.emptyContainer}>
                <Icon name="search-outline" size={64} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            );
          }
          if (filteredMessages.length === 0) {
            return (
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={64} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start a conversation!</Text>
              </View>
            );
          }
          return null;
        }}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
        windowSize={10}
        getItemLayout={(data, index) => {
          // Estimate item height for better scrollToIndex performance
          // Average message height: ~64px (adjust based on your UI)
          const ITEM_HEIGHT_ESTIMATE = 64;
          return {
            length: ITEM_HEIGHT_ESTIMATE,
            offset: ITEM_HEIGHT_ESTIMATE * index,
            index,
          };
        }}
        onScrollToIndexFailed={(info) => {
          // If scrollToIndex fails (item not rendered yet), retry with delay
          console.log('⚠️ scrollToIndex failed, retrying:', info);
          setTimeout(() => {
            if (flatListRef.current && reversedMessages.length > 0) {
              try {
                flatListRef.current.scrollToIndex({ index: 0, animated: false });
              } catch (error) {
                // Final fallback to offset
                if (flatListRef.current) {
                  flatListRef.current.scrollToOffset({ offset: 0, animated: false });
                }
              }
              setIsUserScrolling(false);
            }
          }, 100);
        }}
      />

      {hasNewMessages && (
        <Animated.View style={styles.newMessageBanner}>
          <TouchableOpacity
            style={styles.newMessageButton}
            onPress={() => scrollToBottom(true)}
            activeOpacity={0.8}
          >
            <Icon name="arrow-down" size={16} color="white" style={styles.newMessageIcon} />
            <Text style={styles.newMessageText}>
              {newMessageCount === 1 ? '1 new message' : `${newMessageCount} new messages`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {replyingToMessage && (
        <View style={styles.replyContextContainer}>
          <View style={styles.replyContext}>
            <View style={styles.replyContextHeader}>
              <Text style={styles.replyContextTitle}>Replying to:</Text>
              <TouchableOpacity
                onPress={() => setReplyingToMessage(null)}
                style={styles.replyCancelButton}
              >
                <Icon name="close" size={16} color="#92400E" />
              </TouchableOpacity>
            </View>
            <Text style={styles.replyContextText}>
              {replyingToMessage.content.substring(0, 100)}
              {replyingToMessage.content.length > 100 ? '...' : ''}
            </Text>
          </View>
        </View>
      )}

      {isBuddyTyping && (
        <TypingIndicator 
          buddyName={getOtherUserName()}
          styles={styles}
          theme={theme}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { color: getTextInputColor(theme) }]}
          value={newMessage}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={getPlaceholderTextColor(theme)}
          multiline
          maxLength={1000}
          onFocus={() => {
            // When user focuses input, scroll to bottom if they're not actively scrolled up
            // This helps them see the context when typing, but respects their scroll position
            setTimeout(() => {
              if (!isUserScrolling && flatListRef.current && reversedMessages.length > 0) {
                try {
                  flatListRef.current.scrollToIndex({ index: 0, animated: true });
                } catch (error) {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                  }
                }
              }
            }, 100);
          }}
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="top"
          scrollEnabled={true}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: theme.colors.primary },
            !newMessage.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
            <Icon name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      <EnhancedBuddyProfileView
        visible={showProfileView}
        onClose={() => setShowProfileView(false)}
        userId={getOtherUserId() || ''}
        buddyName={getOtherUserName()}
      />

      <Modal
        visible={reactionPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReactionPickerVisible(false)}
      >
        <Pressable 
          style={styles.reactionPickerOverlay}
          onPress={() => setReactionPickerVisible(false)}
        >
          <View style={styles.reactionPickerContainer}>
            <View style={styles.reactionPicker}>
              <Text style={styles.reactionPickerTitle}>React</Text>
              <View style={styles.reactionEmojisRow}>
                {messageReactionsService.getQuickEmojis().map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionEmojiButton}
                    onPress={async () => {
                      console.log('Reaction pressed:', emoji, 'for message:', reactionPickerMessageId);
                      if (!reactionPickerMessageId || !user?.id) return;
                      try {
                        await messageReactionsService.toggleReaction(reactionPickerMessageId, emoji as Emoji, user.id);
                        const updated = await messageReactionsService.getCountsForMessageIds([reactionPickerMessageId]);
                        setReactionsByMessageId(prev => ({ ...prev, ...updated }));
                      } catch (err) {
                        console.error('Reaction toggle failed', err);
                      } finally {
                        setReactionPickerVisible(false);
                        setReactionPickerMessageId(null);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.reactionCancelButton}
                onPress={() => setReactionPickerVisible(false)}
              >
                <Text style={styles.reactionCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SmartSafeAreaView>
    </GestureHandlerRootView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 4 : 4,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  usernameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 2 : 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  buddyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  buddyStatus: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  conversationModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  conversationModeEmoji: {
    fontSize: 12,
  },
  conversationModeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  searchResultsCount: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurfaceVariant,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sentBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  messageContentContainer: {
    flexShrink: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  sentMessageText: {
    color: theme.colors.onPrimary,
  },
  receivedMessageText: {
    color: theme.colors.onSurface,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  sentMessageFooter: {
    justifyContent: 'flex-end',
  },
  receivedMessageFooter: {
    justifyContent: 'flex-start',
  },
  messageTimeInline: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: '400',
  },
  sentMessageTime: {
    color: theme.colors.onPrimary,
  },
  receivedMessageTime: {
    color: theme.colors.onSurfaceVariant,
  },
  messageStatusContainer: {
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentIndicator: {
    fontSize: 12,
    color: theme.colors.onPrimary,
    opacity: 0.8,
    fontWeight: '500',
  },
  readIndicator: {
    fontSize: 12,
    color: theme.colors.onPrimary,
    opacity: 1,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
    minHeight: 60,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: -1,
    },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 1000,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    color: theme.colors.onSurface,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 50,
  },
  reactionPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: 8,
  },
  reactionPill: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionPillText: {
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.5 : 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
  },
  reactionPicker: {
    alignItems: 'center',
  },
  reactionPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  reactionEmojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  reactionEmojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  reactionEmojiText: {
    fontSize: 24,
  },
  reactionCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  reactionCancelText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  replyToLabel: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  replyToText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  replyContextContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  replyContext: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  replyContextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyContextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  replyCancelButton: {
    padding: 4,
  },
  replyContextText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  newMessageBanner: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    zIndex: 1000,
  },
  newMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newMessageIcon: {
    marginRight: 8,
  },
  newMessageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
  },
  typingText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginRight: 8,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onSurfaceVariant,
    opacity: 0.7,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeableContent: {
    backgroundColor: 'transparent',
  },
  replyFeedback: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  replyFeedbackText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});