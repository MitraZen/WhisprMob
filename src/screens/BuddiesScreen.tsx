import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Platform, AppState } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { CachedBuddiesService, Buddy } from '@/services/cachedBuddiesService';

interface BuddiesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  user: any;
}

export const BuddiesScreen: React.FC<BuddiesScreenProps> = ({ onNavigate, user }) => {
  const { theme } = useTheme();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'online'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [messageAlerts, setMessageAlerts] = useState<number>(0);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  
  const styles = createStyles(theme);

  // Simple alert system - in a real app, this would come from a context or service
  const getMessageAlerts = () => {
    // For now, calculate from unread messages
    // In a real implementation, this would come from a centralized alert service
    return buddies.reduce((sum, buddy) => sum + (buddy.unreadCount || 0), 0);
  };

  // Load buddies from database (initial load)
  useEffect(() => {
    loadBuddies(true);
  }, [user?.id]);

  // Auto-refresh buddies every 30 seconds (reduced frequency for better performance)
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      loadBuddies(false);
    }, 30000); // Increased from 5 seconds to 30 seconds for better performance
    return () => clearInterval(interval);
  }, [user?.id]);

  // Refresh buddies when app comes back to foreground (to update unread counts)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && user?.id) {
        console.log('App became active, refreshing buddies to update unread counts');
        loadBuddies(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id]);

  // Calculate message alerts whenever buddies change
  useEffect(() => {
    setMessageAlerts(getMessageAlerts());
  }, [buddies]);

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
    Alert.alert(
      'Buddy Options',
      `What would you like to do with ${buddy.name}?`,
      [
        { text: 'View Profile', onPress: () => onNavigate('profile', { userId: buddy.buddyUserId }) },
        { text: 'Clear Chat', onPress: () => clearBuddyChat(buddy) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('notes')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buddies</Text>
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
                <View style={styles.buddyIconContainer}>
                  <Text style={styles.buddyInitials}>
                    {buddy.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.buddyText}>
                  <View style={styles.buddyNameRow}>
                    <Text style={styles.buddyName}>{buddy.name}</Text>
                    {buddy.isOnline && (
                      <View style={styles.onlineStatusContainer}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.buddySubtitle}>
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
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
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
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
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
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    color: '#7c3aed',
  },
  alertsCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.lg,
  },
  clearAlertsButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  clearAlertsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearAlertsButtonTextDisabled: {
    color: '#9ca3af',
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
    backgroundColor: '#7c3aed',
    ...theme.shadows.md,
  },
  filterButtonText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  activeFilterButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  buddiesList: { flex: 1, padding: spacing.xs },
  buddyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  buddyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  buddyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: '#7c3aed15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
    position: 'relative',
  },
  buddyInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
  },
  buddyText: {
    flex: 1,
  },
  buddyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
    gap: spacing.xs,
  },
  buddyName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10b981',
  },
  buddySubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 1,
  },
  buddyStatus: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  buddyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
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
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lastUpdatedContainer: { alignItems: 'center', paddingVertical: spacing.sm },
  lastUpdatedText: { fontSize: 12, color: '#9ca3af' },
});

export default BuddiesScreen;
