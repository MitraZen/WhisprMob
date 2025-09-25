import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService, Buddy } from '@/services/buddiesService';
import { formatLastSeen } from '@/utils/date';

interface BuddiesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  user: any;
}

export const BuddiesScreen: React.FC<BuddiesScreenProps> = ({ onNavigate, user }) => {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'online'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadBuddies();
  }, [user?.id]);

  const loadBuddies = async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await BuddiesService.getBuddies(user.id);
      setBuddies(data);
    } catch (error) {
      console.error('Error loading buddies:', error);
    } finally {
      if (isRefresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadBuddies(true);
  }, [user?.id]);

  const filteredBuddies = useMemo(() => {
    return buddies.filter(buddy => {
      const matchesSearch =
        buddy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const renderBuddy = ({ item: buddy }: { item: Buddy }) => (
    <TouchableOpacity
      style={styles.buddyCard}
      onPress={() => onNavigate('chat', { buddy })}
      activeOpacity={0.8}
    >
      <View style={styles.buddyInfo}>
        {/* Gradient Avatar */}
        <LinearGradient
          colors={['#A78BFA', '#8B5CF6']}
          style={styles.buddyAvatarWrapper}
        >
          <Text style={styles.buddyAvatar}>{buddy.initials}</Text>
        </LinearGradient>

        <View>
          <Text style={styles.buddyName}>{buddy.name}</Text>
          {buddy.lastMessage && (
            <Text style={styles.buddyMessage} numberOfLines={1}>
              {buddy.lastMessage}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.buddyMeta}>
        {buddy.unreadCount > 0 && (
          <Text style={styles.unreadBadge}>{buddy.unreadCount}</Text>
        )}
        {buddy.isOnline && <Text style={styles.onlineDot}>●</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Buddies</Text>
        <Text style={styles.headerSubtitle}>
          Stay connected with your Whispr friends
        </Text>
        <LinearGradient
          colors={['#A78BFA', '#8B5CF6']}
          style={styles.headerUnderline}
        />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search buddies..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {(['all', 'unread', 'pinned', 'online'] as const).map(type => {
          const isActive = filter === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => setFilter(type)}
              activeOpacity={0.8}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#A78BFA', '#8B5CF6']}
                  style={styles.activeFilterChip}
                >
                  <Text style={styles.activeFilterChipText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Buddy List */}
      <FlatList
        data={filteredBuddies}
        keyExtractor={item => item.id}
        renderItem={renderBuddy}
        style={styles.buddyList}
        contentContainerStyle={styles.buddyListContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.emptyText}>Loading buddies...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👻</Text>
              <Text style={styles.emptyText}>No buddies yet.</Text>
              <Text style={styles.emptySubtext}>
                Start chatting by listening to Whispr notes!
              </Text>
            </View>
          )
        }
      />

      {/* Bottom Nav */}
      <NavigationMenu currentScreen="buddies" onNavigate={onNavigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.md,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  headerUnderline: {
    height: 3,
    width: 80,
    borderRadius: 2,
    marginTop: 12,
  },
  searchContainer: {
    margin: spacing.md,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
    color: '#111827',
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: '#F3F4F6',
  },
  activeFilterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  activeFilterChipText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  buddyList: {
    flex: 1,
  },
  buddyListContent: {
    padding: spacing.md,
  },
  buddyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...theme.shadows.sm,
  },
  buddyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buddyAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  buddyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    fontWeight: '600',
    color: '#6D28D9',
  },
  buddyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  buddyMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  buddyMeta: {
    alignItems: 'flex-end',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  onlineDot: {
    fontSize: 14,
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default BuddiesScreen;
