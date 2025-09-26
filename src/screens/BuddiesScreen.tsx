import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService, Buddy } from '@/services/buddiesService';

interface BuddiesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  user: any;
}

export const BuddiesScreen: React.FC<BuddiesScreenProps> = ({ onNavigate, user }) => {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'online'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load buddies from database
  useEffect(() => {
    loadBuddies();
  }, [user?.id]);

  // Auto-refresh buddies every 10 seconds
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadBuddies();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadBuddies = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading buddies for user:', user.id);
      const buddiesData = await BuddiesService.getBuddies(user.id);
      console.log(`Loaded ${buddiesData.length} buddies successfully`);
      setBuddies(buddiesData);
    } catch (err) {
      console.error('Error loading buddies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load buddies');
      
      // Show fallback message
      Alert.alert(
        'Error Loading Buddies',
        'Unable to load your buddies. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: loadBuddies },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBuddies = buddies.filter(buddy => {
    const matchesSearch = buddy.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    switch (filter) {
      case 'unread':
        return matchesSearch && buddy.unreadCount > 0;
      case 'pinned':
        return matchesSearch && buddy.isPinned;
      case 'online':
        return matchesSearch && buddy.isOnline;
      default:
        return matchesSearch;
    }
  });

  const handleChatPress = (buddy: Buddy) => {
    onNavigate('chat', { buddy });
  };

  const handlePinToggle = async (buddyId: string) => {
    try {
      await BuddiesService.toggleBuddyPin(buddyId, user.id);
      // Reload buddies to reflect the change
      await loadBuddies();
    } catch (error) {
      console.error('Error toggling pin:', error);
      Alert.alert('Error', 'Failed to update buddy pin status');
    }
  };

  const handleClearChat = (buddyId: string) => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages with this buddy? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting to clear chat for buddy:', buddyId);
              await BuddiesService.clearChatHistory(buddyId);
              
              // Reload buddies to reflect the change
              await loadBuddies();
              
              Alert.alert('Success', 'Chat history cleared successfully');
            } catch (error) {
              console.error('Error clearing chat:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', `Failed to clear chat history: ${errorMessage}`);
            }
          }
        },
      ]
    );
  };

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
              console.log('Deleting buddy:', buddy.id);
              await BuddiesService.deleteBuddy(buddy.id, user.id);
              
              // Reload buddies to reflect the change
              await loadBuddies();
              
              Alert.alert('Success', `${buddy.name} has been removed from your buddies list`);
            } catch (error) {
              console.error('Error deleting buddy:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', `Failed to delete buddy: ${errorMessage}`);
            }
          }
        },
      ]
    );
  };

  const handleBlockUser = (buddy: Buddy) => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${buddy.name}? This will remove them from your buddies list and prevent them from contacting you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Blocking user:', buddy.buddyUserId);
              await BuddiesService.blockUser(buddy.buddyUserId || buddy.id, user.id);
              
              // Reload buddies to reflect the change
              await loadBuddies();
              
              Alert.alert('Success', `${buddy.name} has been blocked`);
            } catch (error) {
              console.error('Error blocking user:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', `Failed to block user: ${errorMessage}`);
            }
          }
        },
      ]
    );
  };

  const handleBuddyOptions = (buddy: Buddy) => {
    Alert.alert(
      'Buddy Options',
      `What would you like to do with ${buddy.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Buddy', 
          style: 'destructive',
          onPress: () => handleDeleteBuddy(buddy)
        },
        { 
          text: 'Block User', 
          style: 'destructive',
          onPress: () => handleBlockUser(buddy)
        },
        { 
          text: 'Clear Chat', 
          onPress: () => handleClearChat(buddy.id)
        },
      ]
    );
  };

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
      case 'unread':
        return buddies.filter(b => b.unreadCount > 0).length;
      case 'pinned':
        return buddies.filter(b => b.isPinned).length;
      case 'online':
        return buddies.filter(b => b.isOnline).length;
      default:
        return buddies.length;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buddies</Text>
        <Text style={styles.subtitle}>Your connections and conversations</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search buddies..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'unread', 'pinned', 'online'] as const).map((filterType) => (
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
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} ({getFilterCount(filterType)})
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
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadBuddies}>
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
            >
              <View style={styles.buddyHeader}>
                <View style={styles.buddyInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.buddyName}>{buddy.name}</Text>
                  </View>
                </View>
                
                <View style={styles.buddyStatus}>
                  <View style={[
                    styles.statusIndicator,
                    buddy.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
                  ]} />
                  <Text style={styles.lastSeen}>
                    {buddy.isOnline ? 'Online' : formatLastSeen(buddy.lastMessageTime)}
                  </Text>
                </View>
              </View>

              <Text style={styles.lastMessage} numberOfLines={2}>
                {buddy.lastMessage || 'No messages yet'}
              </Text>

              <View style={styles.buddyActions}>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePinToggle(buddy.id)}
                  >
                    <Text style={styles.actionButtonText}>
                      {buddy.isPinned ? '📌' : '📍'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleClearChat(buddy.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleBuddyOptions(buddy)}
                  >
                    <Text style={styles.actionButtonText}>⋯</Text>
                  </TouchableOpacity>
                </View>
                
                {buddy.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{buddy.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="buddies" onNavigate={onNavigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: '#7c3aed',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra padding for camera hole
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
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
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: '#f3f4f6',
  },
  activeFilterButton: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buddiesList: {
    flex: 1,
    padding: spacing.sm,
  },
  buddyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  buddyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  buddyInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buddyName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginRight: spacing.xs,
  },
  pinIcon: {
    fontSize: 10,
  },
  buddyUsername: {
    fontSize: 10,
    color: '#9ca3af',
  },
  buddyStatus: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    marginBottom: 2,
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  lastSeen: {
    fontSize: 10,
    color: '#9ca3af',
  },
  lastMessage: {
    fontSize: 11,
    color: theme.colors.onSurface,
    marginBottom: 2,
    lineHeight: 15,
  },
  buddyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: 2,
  },
  actionButtonText: {
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
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
});

export default BuddiesScreen;
