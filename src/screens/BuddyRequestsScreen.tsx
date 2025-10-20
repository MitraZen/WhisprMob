import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import AnonymousChatService from '@/services/anonymousChatService';
import { BuddyRequest } from '@/services/anonymousChatService';

interface BuddyRequestsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  user: any;
}

export const BuddyRequestsScreen: React.FC<BuddyRequestsScreenProps> = ({ onNavigate, user }) => {
  const { theme } = useTheme();
  const [buddyRequests, setBuddyRequests] = useState<BuddyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    loadBuddyRequests();
  }, [user?.id]);

  const loadBuddyRequests = async (showLoading = true) => {
    if (!user?.id) return;
    
    try {
      if (showLoading) setIsLoading(true);
      
      console.log('📥 Loading buddy requests for user:', user.id);
      const requests = await AnonymousChatService.getBuddyRequests(user.id);
      console.log('📥 Loaded buddy requests:', requests.length);
      
      setBuddyRequests(requests);
    } catch (error) {
      console.error('❌ Error loading buddy requests:', error);
      Alert.alert('Error', 'Failed to load buddy requests. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBuddyRequests(false);
  };

  const handleAcceptRequest = async (request: BuddyRequest) => {
    try {
      setProcessingRequest(request.id);
      
      console.log('✅ Accepting buddy request:', request.id);
      console.log('🔍 Request details:', {
        requesterId: request.requester_id,
        receiverId: request.receiver_id,
        currentUserId: user.id
      });
      
      await AnonymousChatService.respondToBuddyRequest(request.id, 'accepted');
      
      // Remove the request from the list
      setBuddyRequests(prev => prev.filter(req => req.id !== request.id));
      
      // ENHANCED: Invalidate buddies cache for BOTH users to ensure immediate updates
      const { QueryCache } = await import('@/services/queryCache');
      const { DeviceEventEmitter } = await import('react-native');
      
      // Invalidate cache for current user (receiver)
      QueryCache.invalidateBuddies(user.id);
      console.log('🔄 Invalidated cache for receiver:', user.id);
      
      // Invalidate cache for requester (sender) as well
      QueryCache.invalidateBuddies(request.requester_id);
      console.log('🔄 Invalidated cache for requester:', request.requester_id);
      
      // Dispatch real-time events to notify both users immediately
      const buddyCreatedEvent = {
        type: 'buddy-created',
        buddyId: 'new-buddy-relationship', // Generic ID since we don't have the specific buddy ID yet
        userId: user.id,
        buddyUserId: request.requester_id,
        source: 'buddyRequestAcceptance',
        timestamp: new Date().toISOString()
      };
      
      // Notify both users via DeviceEventEmitter
      DeviceEventEmitter.emit('buddy-created', buddyCreatedEvent);
      console.log('📢 Dispatched buddy-created event for both users');
      
      // Also dispatch a buddies-updated event for immediate UI refresh
      DeviceEventEmitter.emit('buddies-updated', {
        type: 'buddies-updated',
        userId: user.id,
        buddyUserId: request.requester_id,
        source: 'buddyRequestAcceptance',
        timestamp: new Date().toISOString()
      });
      console.log('📢 Dispatched buddies-updated event for immediate refresh');
      
      Alert.alert(
        'Request Accepted!',
        'You are now buddies! You can start chatting.',
        [
          { text: 'OK' },
          { 
            text: 'Start Chatting', 
            onPress: () => {
              // Navigate to buddies screen to see the new buddy
              onNavigate('buddies');
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error accepting buddy request:', error);
      Alert.alert('Error', 'Failed to accept buddy request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (request: BuddyRequest) => {
    Alert.alert(
      'Decline Buddy Request',
      'Are you sure you want to decline this buddy request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingRequest(request.id);
              
              console.log('❌ Declining buddy request:', request.id);
              await AnonymousChatService.respondToBuddyRequest(request.id, 'declined');
              
              // Remove the request from the list
              setBuddyRequests(prev => prev.filter(req => req.id !== request.id));
              
              Alert.alert('Request Declined', 'The buddy request has been declined.');
            } catch (error) {
              console.error('❌ Error declining buddy request:', error);
              Alert.alert('Error', 'Failed to decline buddy request. Please try again.');
            } finally {
              setProcessingRequest(null);
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const requestDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderBuddyRequest = ({ item }: { item: BuddyRequest }) => {
    const isProcessing = processingRequest === item.id;
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestTitle}>New Buddy Request</Text>
            <Text style={styles.requestTime}>{formatTimeAgo(item.created_at)}</Text>
          </View>
        </View>
        
        {item.request_message && (
          <View style={styles.messageContainer}>
            <Text style={styles.requestMessage}>"{item.request_message}"</Text>
          </View>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDeclineRequest(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <>
                <Icon name="close" size={16} color={theme.colors.surface} />
                <Text style={styles.actionButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <>
                <Icon name="checkmark" size={16} color={theme.colors.surface} />
                <Text style={styles.actionButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Buddy Requests</Text>
      <Text style={styles.emptyMessage}>
        You don't have any pending buddy requests right now.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading buddy requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('buddies')}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buddy Requests</Text>
        <View style={styles.headerRight}>
          <Text style={styles.requestCount}>{buddyRequests.length}</Text>
        </View>
      </View>

      <FlatList
        data={buddyRequests}
        renderItem={renderBuddyRequest}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={buddyRequests.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerRight: {
    padding: 8,
  },
  requestCount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  requestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  requestTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  messageContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  requestMessage: {
    fontSize: 14,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  declineButton: {
    backgroundColor: theme.colors.error,
  },
  acceptButton: {
    backgroundColor: theme.colors.success,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
