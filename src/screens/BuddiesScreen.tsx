import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Platform, AppState, DeviceEventEmitter, Modal, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { CachedBuddiesService, Buddy } from '@/services/cachedBuddiesService';
import AnonymousChatService from '@/services/anonymousChatService';
import { BuddyRealtimeService } from '@/services/buddyRealtimeService';
import { WalkthroughManager } from '@/components/WalkthroughManager';
import GradientBackground from '@/components/GradientBackground';
import { BuddiesService } from '@/services/buddiesService';
import { CONVERSATION_STATES } from '@/config/profile.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BuddiesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  user: any;
  refreshTrigger?: number; // Add refresh trigger parameter
}

export const BuddiesScreen: React.FC<BuddiesScreenProps> = ({ onNavigate, user, refreshTrigger }) => {
  const { theme, isDark } = useTheme();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'online'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [messageAlerts, setMessageAlerts] = useState<number>(0);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showBuddyOptions, setShowBuddyOptions] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null);
  const [buddyRequestsCount, setBuddyRequestsCount] = useState<number>(0);
  const [myConversationMode, setMyConversationMode] = useState<string>('open');
  
  const styles = createStyles(theme, isDark);

  // Simple alert system - in a real app, this would come from a context or service
  const getMessageAlerts = () => {
    // For now, calculate from unread messages
    // In a real implementation, this would come from a centralized alert service
    return buddies.reduce((sum, buddy) => sum + (buddy.unreadCount || 0), 0);
  };

  // Load buddies from database (initial load)
  useEffect(() => {
    loadBuddies(true);
    loadBuddyRequestsCount();
    loadMyConversationMode();
  }, [user?.id]);

  // Load current user's conversation mode
  const loadMyConversationMode = async () => {
    if (!user?.id) return;
    
    try {
      const profile = await BuddiesService.getUserProfile(user.id);
      if (profile?.conversation_mode) {
        setMyConversationMode(profile.conversation_mode);
      } else {
        // Try to load from local storage as fallback
        try {
          const localMode = await AsyncStorage.getItem(`conversation_mode_${user.id}`);
          if (localMode) {
            setMyConversationMode(localMode);
          } else {
            setMyConversationMode('open');
          }
        } catch (storageError) {
          console.error('Error loading conversation mode from local storage:', storageError);
          setMyConversationMode('open');
        }
      }
    } catch (error) {
      console.error('Error loading conversation mode:', error);
      setMyConversationMode('open');
    }
  };

  // Set up real-time subscription for conversation mode changes
  useEffect(() => {
    if (!user?.id) return;

    const setupRealtimeSubscription = async () => {
      try {
        const { supabase } = await import('@/config/supabase');
        
        const channel = supabase
          .channel(`my_conversation_mode:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              if (payload.new?.conversation_mode) {
                setMyConversationMode(payload.new.conversation_mode);
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
  }, [user?.id]);

  // Smart refresh strategy - only refresh when app becomes active or user manually refreshes
  useEffect(() => {
    if (!user?.id) return;
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active, refreshing buddies to update unread counts');
        loadBuddies(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id]);

  // Listen for refresh trigger from notes screen
  useEffect(() => {
    if (refreshTrigger && user?.id) {
      console.log('🎧 Refresh trigger received, refreshing buddies immediately');
      loadBuddies(false); // Silent refresh
    }
  }, [refreshTrigger, user?.id]);

  // Calculate message alerts whenever buddies change
  useEffect(() => {
    setMessageAlerts(getMessageAlerts());
  }, [buddies]);

  // Setup real-time buddy notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up real-time buddy notifications for user:', user.id);

    const handleBuddyDeleted = (deletedBuddy: any) => {
      console.log('🗑️ Real-time buddy deletion received:', deletedBuddy);
      // Remove the deleted buddy from the local state immediately
      setBuddies(prevBuddies => 
        prevBuddies.filter(buddy => buddy.id !== deletedBuddy.id)
      );
    };

    const handleBuddyCreated = (newBuddy: any) => {
      console.log('➕ Real-time buddy creation received:', newBuddy);
      // IMMEDIATE REFRESH: Force immediate buddy list refresh for instant updates
      console.log('🔄 Forcing immediate buddy list refresh due to new buddy creation');
      loadBuddies(false); // Silent refresh to get latest data
    };

    const handleBuddyUpdated = (updatedBuddy: any) => {
      console.log('🔄 Real-time buddy update received:', updatedBuddy);
      // console.log('🔄 [DEBUG] Updated buddy keys:', Object.keys(updatedBuddy));
      // console.log('🔄 [DEBUG] unread_count value:', updatedBuddy.unread_count);
      // console.log('🔄 [DEBUG] last_message value:', updatedBuddy.last_message);
      
      // Transform database field names to app field names
      const transformedBuddy = {
        id: updatedBuddy.id,
        name: updatedBuddy.name,
        lastMessage: updatedBuddy.last_message,
        lastMessageTime: updatedBuddy.last_message_time ? new Date(updatedBuddy.last_message_time) : undefined,
        unreadCount: updatedBuddy.unread_count || 0,
        isOnline: updatedBuddy.is_online || false,
        status: updatedBuddy.status || 'active',
        mood: updatedBuddy.mood || undefined,
        isPinned: updatedBuddy.is_pinned || false,
        initials: updatedBuddy.initials,
        avatar: updatedBuddy.avatar_url,
        buddyUserId: updatedBuddy.buddy_user_id,
        createdAt: new Date(updatedBuddy.created_at),
        updatedAt: new Date(updatedBuddy.updated_at),
      };
      
      // console.log('🔄 [DEBUG] Transformed buddy:', transformedBuddy);
      // console.log('🔄 [DEBUG] Transformed unreadCount:', transformedBuddy.unreadCount);
      
      // Update the specific buddy in the local state
      setBuddies(prevBuddies => {
        const updatedBuddies = prevBuddies.map(buddy => {
          if (buddy.id === transformedBuddy.id) {
            // console.log('🔄 [DEBUG] Updating existing buddy:', { old: buddy, new: transformedBuddy });
            return transformedBuddy;
          }
          return buddy;
        });
        // console.log('🔄 [DEBUG] Total buddies after update:', updatedBuddies.length);
        return updatedBuddies;
      });
    };

    const handleBuddiesUpdated = (eventData: any) => {
      console.log('🔄 Buddies-updated event received:', eventData);
      // Force immediate refresh when buddies are updated
      console.log('🔄 Forcing immediate buddy list refresh due to buddies-updated event');
      loadBuddies(false); // Silent refresh to get latest data
    };

    const handleMessageUpdated = (eventData: any) => {
      console.log('💬 Message-updated event received:', eventData);
      // Don't manually refresh - rely on realtime buddy UPDATE events instead
      // The database trigger will update unread_count in buddies table,
      // which will trigger a realtime UPDATE event via handleBuddyUpdated
      console.log('⏭️ Relying on realtime buddy UPDATE events for unread count updates');
    };

    // Subscribe to real-time notifications
    BuddyRealtimeService.subscribeToAllBuddyNotifications(
      user.id,
      handleBuddyDeleted,
      handleBuddyCreated,
      handleBuddyUpdated
    );

    // Also subscribe to DeviceEventEmitter events for cross-user notifications
    const deviceEventCleanup = BuddyRealtimeService.subscribeToDeviceBuddyEvents(
      user.id,
      handleBuddyDeleted,
      handleBuddyCreated,
      handleBuddyUpdated
    );

    // Subscribe to buddies-updated events for immediate refresh
    const buddiesUpdatedSubscription = DeviceEventEmitter.addListener('buddies-updated', handleBuddiesUpdated);
    console.log('🔔 Subscribed to buddies-updated events for immediate refresh');

    // Subscribe to message-updated events to refresh unread counts
    const messageUpdatedSubscription = DeviceEventEmitter.addListener('message-updated', handleMessageUpdated);
    console.log('🔔 Subscribed to message-updated events for unread count updates');

    // Cleanup on unmount
    return () => {
      console.log('🔕 Cleaning up real-time buddy notifications');
      BuddyRealtimeService.unsubscribeFromBuddyNotifications(user.id);
      deviceEventCleanup();
      buddiesUpdatedSubscription.remove();
      messageUpdatedSubscription.remove();
    };
  }, [user?.id]);

  // Load buddy requests count
  const loadBuddyRequestsCount = async () => {
    if (!user?.id) return;
    
    try {
      const requests = await AnonymousChatService.getBuddyRequests(user.id);
      setBuddyRequestsCount(requests.length);
    } catch (error) {
      console.error('Error loading buddy requests count:', error);
    }
  };

  // Clear all message alerts
  const clearAllMessageAlerts = async () => {
    try {
      setIsLoading(true);
      // Mark all messages as read for all buddies
      for (const buddy of buddies) {
        if (buddy.unreadCount && buddy.unreadCount > 0) {
          await CachedBuddiesService.markMessagesAsRead(buddy.id, user.id);
        }
      }
      // Reload buddies to update unread counts
      await loadBuddies(false);
      setShowAlertsDropdown(false);
      Alert.alert('Success', 'All message alerts have been cleared!');
    } catch (error) {
      console.error('Error clearing message alerts:', error);
      Alert.alert('Error', 'Failed to clear message alerts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuddies = async (showLoader = false) => {
    if (!user?.id) return;
  
    if (showLoader) setIsLoading(true);
    setError(null);
  
    try {
      const buddiesData = await CachedBuddiesService.getBuddies(user.id);
  
      setBuddies((prevBuddies) => {
        // Quick length check first
        if (prevBuddies.length !== buddiesData.length) {
          return buddiesData;
        }

        // Create a map for faster lookup
        const prevBuddiesMap = new Map(prevBuddies.map(buddy => [buddy.id, buddy]));
        
        // Check if any buddy has changed
        let hasChanges = false;
        const updatedBuddies = buddiesData.map((newBuddy) => {
          const oldBuddy = prevBuddiesMap.get(newBuddy.id);
          if (!oldBuddy) {
            hasChanges = true;
            return newBuddy;
          }

          // Quick comparison of key fields
          if (oldBuddy.name !== newBuddy.name ||
              oldBuddy.unreadCount !== newBuddy.unreadCount ||
              oldBuddy.isOnline !== newBuddy.isOnline ||
              oldBuddy.lastMessage !== newBuddy.lastMessage) {
            hasChanges = true;
            return newBuddy;
          }

          return oldBuddy; // No changes, keep the old object
        });

        return hasChanges ? updatedBuddies : prevBuddies;
      });
  
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading buddies:', err);
  
      // Only show alert if it's the *first load* or a manual retry
      if (showLoader) {
        setError(err instanceof Error ? err.message : 'Failed to load buddies');
        Alert.alert(
          'Error Loading Buddies',
          'Unable to load your buddies. Please check your connection and try again.',
          [
            { text: 'Retry', onPress: () => loadBuddies(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } finally {
      setIsLoading(false); // always reset
    }
  };

  const filteredBuddies = buddies.filter(buddy => {
    const matchesSearch = buddy.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    switch (filter) {
      case 'unread': return matchesSearch && buddy.unreadCount > 0;
      case 'online': return matchesSearch && buddy.isOnline;
      default: return matchesSearch;
    }
  });

  // Handle chat press - navigate to chat screen
  const handleChatPress = (buddy: Buddy) => {
    onNavigate('chat', { buddy });
  };

  // Handle buddy options (long press) - show context menu
  const handleBuddyOptions = (buddy: Buddy) => {
    setSelectedBuddy(buddy);
    setShowBuddyOptions(true);
  };

  // Clear chat for a specific buddy
  const clearBuddyChat = async (buddy: Buddy) => {
    try {
      await CachedBuddiesService.clearBuddyChat(buddy.id, user.id);
      await loadBuddies(false);
      Alert.alert('Success', `Chat with ${buddy.name} has been cleared.`);
    } catch (error) {
      console.error('Error clearing buddy chat:', error);
      Alert.alert('Error', 'Failed to clear chat. Please try again.');
    }
  };

  // Handle buddy option actions
  const handleViewProfile = () => {
    if (selectedBuddy) {
      onNavigate('profile', { userId: selectedBuddy.buddyUserId });
      setShowBuddyOptions(false);
      setSelectedBuddy(null);
    }
  };

  const handleClearChat = () => {
    if (selectedBuddy) {
      clearBuddyChat(selectedBuddy);
      setShowBuddyOptions(false);
      setSelectedBuddy(null);
    }
  };

  const handleDeleteBuddyAction = () => {
    if (selectedBuddy) {
      handleDeleteBuddy(selectedBuddy);
      setShowBuddyOptions(false);
      setSelectedBuddy(null);
    }
  };

  const handleCancelOptions = () => {
    setShowBuddyOptions(false);
    setSelectedBuddy(null);
  };

  // Delete buddy with enhanced real-time handling
  const handleDeleteBuddy = (buddy: Buddy) => {
    Alert.alert(
      'Delete Buddy',
      `Are you sure you want to remove ${buddy.name} from your buddies list? This will end your relationship and remove all chat history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting buddy:', buddy.id);
              const result = await CachedBuddiesService.deleteBuddy(buddy.id, user.id);
              
              // The real-time service will handle updating the UI immediately
              // No need to manually reload buddies as the real-time notification will trigger it
              
              console.log('✅ Buddy deleted successfully:', result);
              Alert.alert('Success', `${buddy.name} has been removed from your buddies list`);
            } catch (error) {
              console.error('❌ Error deleting buddy:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', `Failed to delete buddy: ${errorMessage}`);
            }
          }
        },
      ]
    );
  };

  // ✅ Instant local state updates (no reload needed)





  const formatLastSeen = (lastMessageTime?: Date): string => {
    if (!lastMessageTime) return 'No messages';
    const now = new Date();
    const diff = now.getTime() - lastMessageTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return lastMessageTime.toLocaleDateString();
  };

  const getFilterCount = (filterType: typeof filter): number => {
    switch (filterType) {
      case 'unread': return buddies.filter(b => b.unreadCount > 0).length;
      case 'online': return buddies.filter(b => b.isOnline).length;
      default: return buddies.length;
    }
  };

  // Helper function to generate consistent avatar colors
  const getAvatarColor = (name: string): string => {
    const colors = [
      '#7c3aed', // Purple
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f97316', // Orange
      '#ec4899', // Pink
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <GradientBackground variant="subtle">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('notes')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Buddies</Text>
          {(() => {
            const modeConfig = CONVERSATION_STATES.find(s => s.id === myConversationMode);
            if (modeConfig) {
              return (
                <TouchableOpacity
                  style={[styles.myConversationModeBadge, { backgroundColor: modeConfig.color + '20' }]}
                  onPress={() => onNavigate('profile')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.myConversationModeEmoji}>{modeConfig.emoji}</Text>
                  <Text style={[styles.myConversationModeText, { color: modeConfig.color }]}>
                    {modeConfig.label}
                  </Text>
                  <Icon name="chevron-forward" size={14} color={modeConfig.color} style={styles.myConversationModeChevron} />
                </TouchableOpacity>
              );
            }
            return null;
          })()}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.buddyRequestsButton}
            onPress={() => onNavigate('buddyRequests')}
          >
            <Icon name="people" size={24} color={theme.colors.onSurface} />
            {buddyRequestsCount > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>
                  {buddyRequestsCount > 99 ? '99+' : buddyRequestsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.alertsButton}
            onPress={() => setShowAlertsDropdown(!showAlertsDropdown)}
          >
            <Icon name="notifications" size={24} color={theme.colors.onSurface} />
            {messageAlerts > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>
                  {messageAlerts > 99 ? '99+' : messageAlerts}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Message Alerts Dropdown */}
      {showAlertsDropdown && (
        <View style={styles.alertsDropdown}>
          <View style={styles.alertsDropdownContent}>
            <View style={styles.alertsHeader}>
              <Icon name="chatbubbles" size={20} color="#7c3aed" />
              <Text style={styles.alertsTitle}>Message Alerts</Text>
            </View>
            <Text style={styles.alertsCount}>
              {messageAlerts} unread message{messageAlerts !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity 
              style={styles.clearAlertsButton}
              onPress={clearAllMessageAlerts}
              disabled={isLoading || messageAlerts === 0}
            >
              <Text style={[
                styles.clearAlertsButtonText,
                (isLoading || messageAlerts === 0) && styles.clearAlertsButtonTextDisabled
              ]}>
                {isLoading ? 'Clearing...' : 'Clear All Alerts'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search your buddies"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'unread', 'online'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterButton,
              filter === filterType && styles.activeFilterButton,
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterType && styles.activeFilterButtonText,
            ]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} • {getFilterCount(filterType)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.buddiesList} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading buddies...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={24} color={theme.colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadBuddies(true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredBuddies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No buddies found matching your search.' : 'No buddies yet.'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Start chatting by listening to Whispr notes!
            </Text>
          </View>
        ) : (
          filteredBuddies.map((buddy) => (
            <TouchableOpacity
              key={buddy.id}
              style={styles.buddyCard}
              onPress={() => handleChatPress(buddy)}
              onLongPress={() => handleBuddyOptions(buddy)}
              delayLongPress={500}
              activeOpacity={0.7}
            >
              <View style={styles.buddyContent}>
                {/* Enhanced Avatar with Colored Circle */}
                <View style={[
                  styles.buddyAvatarContainer,
                  { backgroundColor: getAvatarColor(buddy.name) }
                ]}>
                  <Text style={styles.buddyInitials}>
                    {buddy.name.charAt(0).toUpperCase()}
                  </Text>
                  {/* Online Status Dot */}
                  {buddy.isOnline && (
                    <View style={styles.onlineStatusDot} />
                  )}
                </View>
                
                <View style={styles.buddyText}>
                  <View style={styles.buddyNameRow}>
                    <Text style={styles.buddyName}>{buddy.name}</Text>
                    {/* Secondary Online Indicator */}
                    {buddy.isOnline && (
                      <View style={styles.onlineStatusContainer}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.buddySubtitle} numberOfLines={1} ellipsizeMode="tail">
                    {buddy.lastMessage || 'No messages yet'}
                  </Text>
                  <Text style={styles.buddyStatus}>
                    {buddy.isOnline ? '' : formatLastSeen(buddy.lastMessageTime)}
                  </Text>
                </View>
                
                <View style={styles.buddyActions}>
                  {buddy.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {buddy.unreadCount > 99 ? '99+' : buddy.unreadCount}
                      </Text>
                    </View>
                  )}
                  <Icon 
                    name="chevron-forward" 
                    size={20} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                </View>
              </View>
              
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ✅ Last Updated Timestamp */}
      {lastUpdated && (
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>
            Last updated at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="buddies" onNavigate={onNavigate} />
      
      {/* Walkthrough for new users */}
      <WalkthroughManager 
        walkthroughId="main_app_tour" 
        autoShow={true}
        context="buddies"
        userId={user?.id}
      />

      {/* Buddy Options Modal */}
      <Modal
        visible={showBuddyOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelOptions}
      >
        <Pressable 
          style={styles.buddyOptionsOverlay}
          onPress={handleCancelOptions}
        >
          <View style={styles.buddyOptionsContainer}>
            <View style={styles.buddyOptionsContent}>
              <Text style={styles.buddyOptionsTitle}>
                {selectedBuddy?.name} Options
              </Text>
              <View style={styles.buddyOptionsButtons}>
                <TouchableOpacity
                  style={styles.buddyOptionButton}
                  onPress={handleViewProfile}
                >
                  <Icon name="person-outline" size={24} color="#007AFF" />
                  <Text style={styles.buddyOptionText}>View Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.buddyOptionButton}
                  onPress={handleClearChat}
                >
                  <Icon name="trash-outline" size={24} color="#FF9500" />
                  <Text style={styles.buddyOptionText}>Clear Chat</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.buddyOptionButton}
                  onPress={handleDeleteBuddyAction}
                >
                  <Icon name="person-remove-outline" size={24} color="#FF3B30" />
                  <Text style={styles.buddyOptionText}>Delete Buddy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.buddyOptionButton}
                  onPress={handleCancelOptions}
                >
                  <Icon name="close-outline" size={24} color="#8E8E93" />
                  <Text style={styles.buddyOptionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  myConversationModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  myConversationModeEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  myConversationModeText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  myConversationModeChevron: {
    marginLeft: spacing.xs,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buddyRequestsButton: {
    position: 'relative',
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  alertsButton: {
    position: 'relative',
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  alertBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertsDropdown: {
    marginTop: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertsDropdownContent: {
    padding: spacing.lg,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  alertsCount: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  clearAlertsButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  clearAlertsButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  clearAlertsButtonTextDisabled: {
    color: theme.colors.onSurfaceVariant,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    paddingVertical: 0, // Remove default padding since container handles it
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.colors.surfaceVariant,
    minWidth: 80,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  activeFilterButton: { 
    backgroundColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  filterButtonText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  activeFilterButtonText: { 
    color: theme.colors.onPrimary, 
    fontWeight: '600' 
  },
  buddiesList: { flex: 1, padding: spacing.xs },
  buddyCard: {
    backgroundColor: theme.colors.surface, // Use solid theme color instead of glass effect
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xs,
    borderWidth: 0,
    // Removed all shadow and glass effects for cleaner look
  },
  buddyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm, // Reduced from md to sm
    paddingVertical: spacing.xs, // Additional vertical padding reduction
  },
  buddyAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    position: 'relative',
    // Removed shadows for cleaner look
  },
  buddyInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    // Removed text shadow for cleaner look
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
    // Removed shadows for cleaner look
  },
  buddyText: {
    flex: 1,
  },
  buddyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // Reduced from 1 to 0
    gap: spacing.xs,
  },
  buddyName: {
    fontSize: 15, // Reduced from 16 to 15
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3, // Reduced from 4 to 3
  },
  onlineDot: {
    width: 6, // Reduced from 8 to 6
    height: 6, // Reduced from 8 to 6
    borderRadius: 3, // Adjusted for new size
    backgroundColor: '#10b981',
  },
  onlineText: {
    fontSize: 11, // Reduced from 12 to 11
    fontWeight: '500',
    color: '#10b981',
  },
  buddySubtitle: {
    fontSize: 11, // Reduced from 12 to 11
    color: theme.colors.onSurfaceVariant,
    marginBottom: 0, // Reduced from 1 to 0
    opacity: 0.8, // Added slight opacity for hierarchy
  },
  buddyStatus: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.6, // Reduced opacity for cleaner focus
  },
  buddyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs, // Added small padding for better spacing
  },
  buddyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buddyInfo: { flex: 1 },
  nameContainer: { flexDirection: 'row', alignItems: 'center' },
  lastSeen: { fontSize: 12, color: '#9ca3af' },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  errorIcon: {
    marginBottom: spacing.sm,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 6, // Reduced from 8 to 6
    minWidth: 14, // Reduced from 16 to 14
    height: 14, // Reduced from 16 to 14
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3, // Reduced from 4 to 3
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 8, // Reduced from 9 to 8
    fontWeight: 'bold',
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: { fontSize: 14, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  loadingContainer: { alignItems: 'center', paddingVertical: spacing.xxl },
  loadingText: { marginTop: spacing.md, fontSize: 16, color: theme.colors.onSurface },
  errorContainer: { alignItems: 'center', paddingVertical: spacing.xxl },
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
  retryButtonText: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: '600' },
  lastUpdatedContainer: { alignItems: 'center', paddingVertical: spacing.sm },
  lastUpdatedText: { fontSize: 12, color: theme.colors.onSurfaceVariant },
  
  // Buddy Options Modal Styles
  buddyOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buddyOptionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 30,
    maxWidth: 320,
    width: '100%',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.3 : 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  buddyOptionsContent: {
    padding: 16,
  },
  buddyOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 16,
  },
  buddyOptionsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  buddyOptionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buddyOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default BuddiesScreen;
