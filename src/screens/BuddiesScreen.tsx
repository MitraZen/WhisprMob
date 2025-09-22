import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
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
    const matchesSearch = buddy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         buddy.initials.toLowerCase().includes(searchQuery.toLowerCase());
    
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
      'Are you sure you want to clear all messages with this buddy?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await BuddiesService.clearChatHistory(buddyId);
              // Reload buddies to reflect the change
              await loadBuddies();
              Alert.alert('Success', 'Chat history cleared successfully');
            } catch (error) {
              console.error('Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat history');
            }
          }
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
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('notes')}
          >
            <Text style={styles.navButtonText}>📝 Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, styles.activeNavButton]}
            onPress={() => onNavigate('buddies')}
          >
            <Text style={styles.activeNavButtonText}>👥 Buddies</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.navButtonText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('settings')}
          >
            <Text style={styles.navButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
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
            >
              <View style={styles.buddyHeader}>
                <View style={styles.buddyInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.buddyName}>{buddy.name}</Text>
                    {buddy.isPinned && <Text style={styles.pinIcon}>📌</Text>}
                  </View>
                  <Text style={styles.buddyUsername}>{buddy.initials}</Text>
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
    backgroundColor: theme.colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    padding: spacing.md,
  },
  buddyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buddyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  buddyInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buddyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginRight: spacing.xs,
  },
  pinIcon: {
    fontSize: 12,
  },
  buddyUsername: {
    fontSize: 14,
    color: '#9ca3af',
  },
  buddyStatus: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  lastSeen: {
    fontSize: 12,
    color: '#9ca3af',
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  buddyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  actionButtonText: {
    fontSize: 16,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
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
