import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { TelegramStyleChatService } from '@/services/telegramStyleChatService';
import { activeChatService } from '@/services/activeChatService';
import { EnhancedBuddyProfileView } from '@/components/EnhancedBuddyProfileView';
import { getTextInputColor, getPlaceholderTextColor } from '@/utils/textColorUtils';
import { messageReactionsService, Emoji } from '@/services/messageReactionsService';
import { messageRepliesService, ReplyInfo } from '@/services/messageRepliesService';

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
      
      // If swiped right enough (threshold: 50px) or fast enough (velocity > 500)
      if (translationX > 50 || velocityX > 500) {
        // Trigger reply
        onReply(message);
        
        // Animate reply feedback
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
      
      // Reset position
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
      {/* Reply feedback overlay */}
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Reply state
  const [repliesByMessageId, setRepliesByMessageId] = useState<Record<string, ReplyInfo>>({});
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);
  
  // Monitor profile view state changes
  useEffect(() => {
    // Profile view state monitoring removed
  }, [showProfileView]);
  const scrollViewRef = useRef<ScrollView>(null);
  const processingMessages = useRef<Set<string>>(new Set());

  // Load messages on component mount and when buddy changes
  useEffect(() => {
    if (buddy?.id && user?.id) {
      loadMessages();
    }
  }, [buddy?.id, user?.id]);

  // Set active chat when component mounts and clear when unmounts
  useEffect(() => {
    if (buddy?.id) {
      activeChatService.setActiveChat(buddy.id);
    }

    // Cleanup: Clear active chat when component unmounts
    return () => {
      activeChatService.clearActiveChat();
    };
  }, [buddy?.id]);

  // Clean up processing set periodically to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      processingMessages.current.clear();
    }, 30000); // Clear every 30 seconds
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // Optional: scroll to bottom when keyboard hides
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Listen for real-time message updates
  useEffect(() => {
    if (!buddy?.id || !user?.id) return;

    const handleRealtimeMessageUpdate = async (event: any) => {
      try {
        // Safety check for event data
        if (!event?.detail) {
          return;
        }
        
        // Check if this update is for the current buddy or its reciprocal
        const messageBuddyId = event.detail?.buddyId;
        if (messageBuddyId === buddy.id) {
          addNewMessageIncrementally(event.detail?.message);
          return;
        }

        // Check if this is a reciprocal buddy relationship
        try {
          const { supabase } = await import('@/config/supabase');
        
        // Get the current buddy's relationship
        const { data: currentBuddyData, error: currentError } = await supabase
          .from('buddies')
          .select('user_id, buddy_user_id')
          .eq('id', buddy.id)
          .single();
        
        if (currentError || !currentBuddyData) {
          return;
        }

        // Get the message buddy's relationship
        const { data: messageBuddyData, error: messageError } = await supabase
          .from('buddies')
          .select('user_id, buddy_user_id')
          .eq('id', messageBuddyId)
          .single();
        
        if (messageError || !messageBuddyData) {
          return;
        }

        // Check if they represent the same user pair (bidirectional relationship)
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
      // Check if the deleted buddy matches the current buddy
      if (eventData?.buddyId === buddy.id || eventData?.buddy_user_id === buddy.buddy_user_id) {
        
        // Show notification to user
        Alert.alert(
          'Buddy Deleted',
          'This buddy relationship has been deleted.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to buddies screen
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

    // Listen for custom events from realtime service using DeviceEventEmitter
    const eventListener = (eventData: any) => {
      console.log('🔔 TelegramStyleChatScreen: Event listener triggered:', eventData);
      if (eventData?.type === 'message-updated') {
        handleRealtimeMessageUpdate({ detail: eventData });
      } else if (eventData?.type === 'buddy-deleted') {
        handleBuddyDeleted(eventData);
      }
    };

    // Add event listener for real-time updates using DeviceEventEmitter
    const subscription = DeviceEventEmitter.addListener('message-updated', eventListener);
    const buddyDeletedSubscription = DeviceEventEmitter.addListener('buddy-deleted', eventListener);

    return () => {
      subscription.remove();
      buddyDeletedSubscription.remove();
    };
  }, [buddy?.id, user?.id]);

  const loadMessages = async (isRefresh = false, isSilent = false) => {
    try {
      if (!isSilent) {
      setIsLoading(true);
      }
      
      const chatMessages = await TelegramStyleChatService.getMessages(user.id, buddy.id);
      
      // Smart state update - only update if messages actually changed
      setMessages((prevMessages) => {
        // If lengths differ, definitely update
        if (prevMessages.length !== chatMessages.length) return chatMessages;
        
        // Compare old vs new messages
        let changed = false;
        const messageMap = new Map<string, SimpleMessage>();
        
        // First, add all previous messages to the map
        prevMessages.forEach((msg) => {
          messageMap.set(msg.id, msg);
        });
        
        // Then process new messages, updating or adding as needed
        chatMessages.forEach((newMessage) => {
          const existingMessage = messageMap.get(newMessage.id);
          
          if (!existingMessage) {
            // New message
            changed = true;
            messageMap.set(newMessage.id, newMessage);
          } else {
            // Check if message content changed
            const isSame = 
              existingMessage.content === newMessage.content &&
              existingMessage.sender_id === newMessage.sender_id &&
              existingMessage.created_at === newMessage.created_at &&
              existingMessage.is_read === newMessage.is_read;
            
            if (!isSame) {
              changed = true;
              messageMap.set(newMessage.id, newMessage);
            }
          }
        });
        
        // Convert map back to array, sorted by created_at
        const merged = Array.from(messageMap.values()).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        return changed ? merged : prevMessages;
      });

      // Load replies for all messages
      try {
        const messageIds = chatMessages.map(msg => msg.id);
        const replies = await messageRepliesService.getRepliesForMessages(messageIds);
        setRepliesByMessageId(replies);
      } catch (error) {
        console.error('Error loading replies:', error);
        // Don't show error to user as messages loaded successfully
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!isSilent) {
      Alert.alert('Error', 'Failed to load messages');
      }
    } finally {
      if (!isSilent) {
      setIsLoading(false);
      }
    }
  };

  const addNewMessageIncrementally = (messageData: any) => {
    if (!messageData || !messageData.id) {
      return;
    }
    
    // Additional safety check - if we're already processing this message, skip it
    if (processingMessages.current.has(messageData.id)) {
      return;
    }
    
    // Mark this message as being processed
    processingMessages.current.add(messageData.id);
    
    // Convert the message data to SimpleMessage format
    const newMessage: SimpleMessage = {
      id: messageData.id || `temp-${Date.now()}`,
      chat_id: messageData.buddy_id || buddy?.id || 'unknown',
      sender_id: messageData.sender_id || user?.id || 'unknown',
      content: messageData.content || 'Empty message',
      message_type: messageData.message_type || 'text',
      created_at: messageData.created_at || new Date().toISOString(),
      is_read: messageData.is_read || false
    };

    // Add the new message to the existing messages with duplicate check
    setMessages(prevMessages => {
      // Check if message already exists to avoid duplicates
      const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        return prevMessages; // Return unchanged messages
      }

      const updatedMessages = [...prevMessages, newMessage];
      return updatedMessages;
    });

    // Auto-scroll to bottom to show the new message
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    
    // Clean up processing set after a delay
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
              // Import BuddiesService
              const { BuddiesService } = await import('@/services/buddiesService');
              
              // Delete the buddy relationship with cascade deletion
              const result = await BuddiesService.deleteBuddy(buddy.id, user.id);
              
              if (result && result.success) {
                // Show success message
                Alert.alert(
                  'Success',
                  `Buddy relationship deleted successfully. ${result.deleted_messages} messages were removed.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate back to buddies screen
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
    setNewMessage(''); // Clear input immediately for better UX

    // Create optimistic message with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: SimpleMessage = {
      id: tempId,
      chat_id: buddy.id,
      sender_id: user.id,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_read: true
    };

    // Add optimistic message immediately
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
        
        // Replace the optimistic message with the real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: messageId }
            : msg
        ));

        // Handle reply if replying to a message
        if (replyingToMessage) {
          try {
            console.log('📤 Creating reply relationship:', replyingToMessage.id, '->', messageId);
            await messageRepliesService.createReply(replyingToMessage.id, messageId);
            
            // Update replies state
            const replyInfo = await messageRepliesService.getReplyForMessage(messageId);
            if (replyInfo) {
              setRepliesByMessageId(prev => ({
                ...prev,
                [messageId]: replyInfo
              }));
            }
            
            // Clear reply context
            setReplyingToMessage(null);
          } catch (error) {
            console.error('❌ Error creating reply:', error);
            // Don't show error to user as message was sent successfully
          }
        }
      } else {
        console.warn('⚠️ No message ID returned from server');
        // Remove optimistic message if no ID returned
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
      }
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // Restore the message content if sending failed
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
                 // console.log('🧹 Starting chat clear for buddy:', buddy.id, 'user:', user.id);
                 // console.log('🔍 Buddy details:', { 
                 //   buddyId: buddy.id, 
                 //   buddyUserId: buddy.buddyUserId, 
                 //   buddyName: buddy.name,
                 //   currentUserId: user.id 
                 // });
              
              // Clear local state immediately for better UX
              setMessages([]);
              setRepliesByMessageId({});
              setReactionsByMessageId({});
              
              // Clear from database - use buddyUserId, not buddy.id
              await TelegramStyleChatService.clearChat(user.id, buddy.buddyUserId);
              
              // Reload messages to ensure consistency
              await loadMessages();
              
              Alert.alert('Success', 'Chat cleared successfully!');
                 } catch (error) {
                   console.error('❌ Error clearing chat:', error);
                   // console.error('❌ Error details:', {
                   //   message: error instanceof Error ? error.message : String(error),
                   //   stack: error instanceof Error ? error.stack : undefined,
                   //   buddyId: buddy.id,
                   //   userId: user.id
                   // });
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

  // Get the other user's ID (not the current user)
  const getOtherUserId = () => {
    if (!buddy || !user) {
      return null;
    }
    
    // The buddy object has buddyUserId property which contains the other user's ID
    // This is the user ID of the person we're chatting with
    const otherUserId = buddy.buddyUserId || buddy.id;
    return otherUserId;
  };

  // Get the other user's name
  const getOtherUserName = () => {
    if (!buddy) return 'Chat';
    
    // Use the buddy's name or display name
    return buddy.name || buddy.display_name || 'Chat';
  };

  const renderMessage = (message: SimpleMessage) => {
    const isFromCurrentUser = message.sender_id === user.id;
    
    return (
      <SwipeableMessage
        message={message}
        isFromCurrentUser={isFromCurrentUser}
        onReply={(msg) => {
          console.log('Swipe reply triggered for message:', msg.id);
          setReplyingToMessage(msg);
        }}
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
            onLongPress={() => {
              console.log('Long press detected for message:', message.id);
              setReactionPickerMessageId(message.id);
              setReactionPickerVisible(true);
            }}
            onPressIn={() => {
              console.log('press-in on bubble', message.id);
            }}
            android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: false }}
          >
            <View
              style={[
                styles.messageBubble,
                isFromCurrentUser
                  ? styles.sentBubble
                  : styles.receivedBubble,
              ]}
            >

              {/* Reply to label - show different info based on message type */}
              {repliesByMessageId[message.id] && (
                <View style={styles.replyToLabel}>
                  <Text style={styles.replyToText}>
                    {message.id === repliesByMessageId[message.id].reply_message_id ? (
                      // This is a reply message - show what it's replying to
                      `Reply to: ${repliesByMessageId[message.id].original_content.substring(0, 50)}${repliesByMessageId[message.id].original_content.length > 50 ? '...' : ''}`
                    ) : (
                      // This is the original message - show that it has a reply
                      `Replied: ${repliesByMessageId[message.id].reply_content.substring(0, 50)}${repliesByMessageId[message.id].reply_content.length > 50 ? '...' : ''}`
                    )}
                  </Text>
                </View>
              )}

                <View style={styles.messageContentContainer}>
                  <Text style={[
                    styles.messageText,
                    isFromCurrentUser ? styles.sentMessageText : styles.receivedMessageText
                  ]}>
                    {message.content}
                    <Text style={[
                      styles.messageTimeInline,
                      isFromCurrentUser ? styles.sentMessageTime : styles.receivedMessageTime
                    ]}>
                      {'  '}{formatTime(message.created_at)}
                    </Text>
                  </Text>
                </View>
            </View>
          </Pressable>
          
          {/* Reaction pills */}
          {reactionsByMessageId[message.id] && (
            <View style={styles.reactionPillsRow}>
              {Object.entries(reactionsByMessageId[message.id]).map(([emoji, count]) => (
                <View key={`${message.id}-${emoji}`} style={styles.reactionPill}>
                  <Text style={styles.reactionPillText}>{`${emoji} ${count}`}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </SwipeableMessage>
    );
  };

  if (!buddy || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Missing buddy or user data</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={true}
      >
      {/* Header */}
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
          <Text style={styles.buddyStatus}>Online</Text>
        </View>
        
        <TouchableOpacity style={styles.menuButton} onPress={clearChat}>
          <Icon name="trash-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.deleteButton} onPress={deleteBuddy}>
          <Icon name="person-remove-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="chatbubbles-outline" size={64} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation!</Text>
          </View>
        ) : (
          messages.map((message, index) => (
            <View key={message.id || `message-${index}`}>
              {renderMessage(message)}
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply Context */}
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

      {/* Input */}
      <View style={[
        styles.inputContainer,
        keyboardVisible && Platform.OS === 'android' && styles.inputContainerKeyboardVisible
      ]}>
        <TextInput
          style={[styles.textInput, { color: getTextInputColor(theme) }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={getPlaceholderTextColor(theme)}
          multiline
          maxLength={1000}
          onFocus={() => {
            // Scroll to bottom when input is focused
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          blurOnSubmit={false}
          returnKeyType="default"
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
      </KeyboardAvoidingView>
      
      {/* Profile Modal */}
      <EnhancedBuddyProfileView
        visible={showProfileView}
        onClose={() => setShowProfileView(false)}
        userId={getOtherUserId() || ''}
        buddyName={getOtherUserName()}
      />

      {/* Quick Reactions Picker - Custom Horizontal Layout */}
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
    </SafeAreaView>
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
    paddingVertical: 4,
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
    // Ensure header is always visible
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
    paddingVertical: 4,
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
  buddyStatus: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  menuButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  debugButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
    paddingBottom: 20, // Extra padding at bottom for better scrolling
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
    minHeight: 70,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: -1,
    },
    shadowOpacity: theme.isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    elevation: 1,
    // Ensure input is always visible above keyboard
    zIndex: 1000,
    position: 'relative',
    marginBottom: Platform.OS === 'android' ? 10 : 0,
  },
  inputContainerKeyboardVisible: {
    marginBottom: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    color: theme.colors.onSurface,
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
  reactionTrigger: {
    position: 'absolute',
    top: 8,
    padding: 10,
    backgroundColor: theme.colors.error,
    borderRadius: 20,
    zIndex: 100,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.5 : 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  reactionTriggerRight: {
    right: 8,
  },
  reactionTriggerLeft: {
    left: 8,
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
