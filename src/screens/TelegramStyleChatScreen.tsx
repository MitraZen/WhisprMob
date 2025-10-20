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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { TelegramStyleChatService } from '@/services/telegramStyleChatService';
import { activeChatService } from '@/services/activeChatService';
import { EnhancedBuddyProfileView } from '@/components/EnhancedBuddyProfileView';

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

export const TelegramStyleChatScreen: React.FC<ChatScreenProps> = ({
  buddy,
  user,
  onBack,
  onNavigate,
  onMessagesRead,
}) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  
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
              console.log('🗑️ Clearing chat...');
              await TelegramStyleChatService.clearChat(user.id, buddy.id);
              await loadMessages();
              Alert.alert('Success', 'Chat cleared successfully!');
            } catch (error) {
              console.error('❌ Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat');
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
      <View
        style={[
          styles.messageContainer,
          isFromCurrentUser ? styles.sentMessage : styles.receivedMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isFromCurrentUser
              ? styles.sentBubble
              : styles.receivedBubble,
          ]}
        >
          <Text style={[
            styles.messageText,
            isFromCurrentUser ? styles.sentMessageText : styles.receivedMessageText
          ]}>{message.content}</Text>
          <Text style={styles.messageTime}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      </View>
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
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // Temporary background to make it visible
  },
  buddyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  buddyStatus: {
    fontSize: 14,
    color: '#666',
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
    paddingVertical: 8,
    borderRadius: 16,
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
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#F8F9FA',
    borderWidth: 0.5,
    borderColor: '#E9ECEF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  sentMessageText: {
    color: 'white',
  },
  receivedMessageText: {
    color: '#2C3E50',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    backgroundColor: 'white',
    borderTopWidth: 0.5,
    borderTopColor: '#E9ECEF',
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: '#E9ECEF',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
  },
});
