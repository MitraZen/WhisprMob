import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService, Buddy } from '@/services/buddiesService';
import { BuddyCard } from '@/components/BuddyCard';
import { formatLastSeen } from '@/utils/date';
import { notificationService } from '@/services/notificationService';
import { realtimeService } from '@/services/realtimeService';

interface BuddiesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  user: any;
}

export const BuddiesScreen: React.FC<BuddiesScreenProps> = ({ onNavigate, user }) => {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'online'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const loadBuddies = async (isRefresh = false) => {
    if (!user?.id) return;
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      if (__DEV__) {
        console.log('Loading buddies for user:', user.id);
      }
      const buddiesData = await BuddiesService.getBuddies(user.id);
      if (__DEV__) {
        console.log(`Loaded ${buddiesData.length} buddies successfully`);
      }
      setBuddies(buddiesData);
    } catch (err) {
      console.error('Error loading buddies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load buddies');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const onRefresh = useCallback(() => {
    loadBuddies(true);
  }, [user?.id]);

  const simulateIncomingMessage = async () => {
    if (buddies.length === 0) {
      Alert.alert('No Buddies', 'You need to have buddies to simulate incoming messages.');
      return;
    }
    
    const randomBuddy = buddies[Math.floor(Math.random() * buddies.length)];
    const sampleMessages = [
      "Hey! How are you doing?",
      "Just wanted to say hi! 👋",
      "Hope you're having a great day!",
      "What's up?",
      "Thinking of you! 💭",
      "How was your day?",
      "Miss you! 😊",
      "Let's chat soon!"
    ];
    
    const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    
    try {
      await notificationService.showMessageNotification(
        'New Message',
        randomMessage,
        randomBuddy.name || randomBuddy.initials
      );
      Alert.alert('Simulation', `Simulated message from ${randomBuddy.name || randomBuddy.initials}: "${randomMessage}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to simulate message notification');
    }
  };

  const simulateIncomingNote = async () => {
    const sampleNotes = [
      "Feeling grateful today! 🌟",
      "Having a wonderful day! ☀️",
      "Life is beautiful! ✨",
      "Feeling hopeful! 🌈",
      "Today is amazing! 🎉",
      "Feeling blessed! 🙏",
      "Everything is going great! 🚀",
      "Feeling positive! 💪"
    ];
    
    const randomNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
    
    try {
      await notificationService.showNoteNotification(
        'New Whispr Note',
        randomNote
      );
      Alert.alert('Simulation', `Simulated Whispr note: "${randomNote}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to simulate note notification');
    }
  };

  const triggerNotificationCheck = async () => {
    try {
      const status = realtimeService.getConnectionStatus();
      Alert.alert(
        'Realtime Status', 
        `Connected: ${status.isConnected}\nUser: ${status.userId}\nSubscriptions: ${status.subscriptionCount}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get realtime status');
    }
  };

  const filteredBuddies = useMemo(() => {
    return buddies.filter(buddy => {
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
  }, [buddies, searchQuery, filter]);

  const handleChatPress = (buddy: Buddy) => {
    onNavigate('chat', { buddy });
  };

  const handlePinToggle = useCallback(async (buddyId: string) => {
    // Optimistic update
    setBuddies(prev => 
      prev.map(buddy => 
        buddy.id === buddyId 
          ? { ...buddy, isPinned: !buddy.isPinned }
          : buddy
      )
    );

    try {
      await BuddiesService.toggleBuddyPin(buddyId, user.id);
    } catch (error) {
      console.error('Error toggling pin:', error);
      // Revert optimistic update on error
      setBuddies(prev => 
        prev.map(buddy => 
          buddy.id === buddyId 
            ? { ...buddy, isPinned: !buddy.isPinned }
            : buddy
        )
      );
      Alert.alert('Error', 'Failed to update buddy pin status');
    }
  }, [user.id]);

  const handleClearChat = useCallback((buddyId: string) => {
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
              // Optimistic update - clear last message
              setBuddies(prev => 
                prev.map(buddy => 
                  buddy.id === buddyId 
                    ? { ...buddy, lastMessage: undefined, lastMessageTime: undefined }
                    : buddy
                )
              );
              Alert.alert('Success', 'Chat history cleared successfully');
            } catch (error) {
              console.error('Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat history');
            }
          }
        },
      ]
    );
  }, []);


  const getFilterCount = useCallback((filterType: typeof filter): number => {
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
  }, [buddies]);

  const renderBuddy = useCallback(({ item: buddy }: { item: Buddy }) => (
    <BuddyCard
      buddy={buddy}
      onPress={() => handleChatPress(buddy)}
      onPinToggle={() => handlePinToggle(buddy.id)}
      onClearChat={() => handleClearChat(buddy.id)}
      formatLastSeen={formatLastSeen}
    />
  ), [handlePinToggle, handleClearChat]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('notes')}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Buddies</Text>
          <Text style={styles.subtitle}>Your connections and conversations</Text>
        </View>
        <View style={styles.testButtons}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={simulateIncomingMessage}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>📱</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={simulateIncomingNote}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>📝</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={triggerNotificationCheck}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search buddies..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✖</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'unread', 'pinned', 'online'] as const).map((filterType) => {
          const icons = {
            all: '👥',
            unread: '🔴',
            pinned: '📌',
            online: '🟢'
          };
          
          return (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterChip,
                filter === filterType && styles.activeFilterChip,
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={styles.filterIcon}>{icons[filterType]}</Text>
              <Text style={[
                styles.filterChipText,
                filter === filterType && styles.activeFilterChipText,
              ]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)} ({getFilterCount(filterType)})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredBuddies}
        keyExtractor={(item) => item.id}
        renderItem={renderBuddy}
        style={styles.buddiesList}
        contentContainerStyle={styles.buddiesListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading buddies...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadBuddies()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>👻</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No buddies found matching your search.' : 'No buddies yet.'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Start chatting by listening to Whispr notes!
              </Text>
            </View>
          )
        }
      />
      
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  testButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  testButtonText: {
    fontSize: 16,
    color: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
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
  searchContainer: {
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...theme.shadows.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    color: '#9ca3af',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  clearIcon: {
    fontSize: 16,
    color: '#9ca3af',
    padding: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: '#f3f4f6',
    ...theme.shadows.sm,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
  },
  filterIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  filterChipText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  buddiesList: {
    flex: 1,
  },
  buddiesListContent: {
    padding: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '500',
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
