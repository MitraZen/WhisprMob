import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Platform,
  FlatList,
  SectionList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { useAuth } from '@/store/AuthContext';
import { spacing, borderRadius } from '@/utils/themes';
import TextWhisperService, { TextWhispr } from '@/services/textWhisperServiceClean';
import VisualFeedbackService from '@/services/visualFeedbackService';
import AnonymousChatModal from './AnonymousChatModal';
import AnonymousChatService from '@/services/anonymousChatService';
import { supabase } from '@/config/supabase';

type DistanceFilter = '50km' | '100km' | 'beyond';

interface WhisperFeedProps {
  onRecordWhispr?: () => void;
  distanceRange?: { min: number; max: number }; // EXCLUSIVE distance range in meters
  distanceFilter?: DistanceFilter; // Current filter for empty state messaging
  onFilterLoadingChange?: (loading: boolean) => void; // Callback to notify parent of loading state
}

interface WhisprItemProps {
  whispr: TextWhispr;
  onFeel: (whispr: TextWhispr) => void;
}

// Memoized WhisprItem component for better performance
const WhisprItem = React.memo<WhisprItemProps>(({ whispr, onFeel }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [isFeeling, setIsFeeling] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Memoize mood config to avoid recalculation
  const moodConfig = useMemo(() => 
    VisualFeedbackService.getMoodConfig(whispr.mood), 
    [whispr.mood]
  );

  // Memoize mood colors to avoid recalculation
  const moodColors = useMemo(() => 
    VisualFeedbackService.getMoodColors(whispr.mood), 
    [whispr.mood]
  );

  // Check if whispr is expired
  const isExpired = useMemo(() => {
    const now = new Date();
    const expires = new Date(whispr.expires_at);
    return expires.getTime() <= now.getTime();
  }, [whispr.expires_at]);

  // Memoize time formatting with expiry
  const timeAgo = useMemo(() => {
    const now = new Date();
    const created = new Date(whispr.created_at);
    const expires = new Date(whispr.expires_at);
    const timeUntilExpiry = expires.getTime() - now.getTime();
    
    if (timeUntilExpiry <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(timeUntilExpiry / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m left`;
    } else {
      return `${minutes}m left`;
    }
  }, [whispr.created_at, whispr.expires_at]);


  const handleFeel = useCallback(async () => {
    try {
      setIsFeeling(true);
      
      console.log('💬 Opening chat for whispr:', whispr.id);
      
      // Open chat modal
      onFeel(whispr);
      
    } catch (error) {
      console.error('Error opening chat:', error);
    } finally {
      setIsFeeling(false);
    }
  }, [whispr, onFeel]);

  // Memoize styles to avoid recalculation
  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: moodColors.background,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs / 2,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: moodColors.primary,
      shadowColor: moodColors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    moodInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    moodEmoji: {
      fontSize: 14,
      marginRight: 3,
    },
    moodText: {
      fontSize: 11,
      fontWeight: '600',
      color: moodColors.text,
    },
    timeText: {
      fontSize: 9,
      color: moodColors.accent,
    },
    content: {
      fontSize: 12,
      lineHeight: 16,
      color: moodColors.text,
      marginBottom: 2,
    },
    feelButton: {
      backgroundColor: moodColors.primary,
      borderRadius: borderRadius.sm,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    feelButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 11,
      fontWeight: '600',
      marginLeft: 3,
    },
    reactionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: moodColors.accent,
    },
    reactionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
    },
    reactionIcon: {
      marginRight: spacing.xs,
    },
    reactionText: {
      fontSize: 14,
      color: moodColors.text,
    },
    listensContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    listensText: {
      fontSize: 12,
      color: moodColors.accent,
      marginLeft: spacing.xs,
    },
    commentsSection: {
      marginTop: spacing.sm,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
    },
    commentsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    commentsTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    addCommentButton: {
      padding: spacing.xs,
    },
  }), [moodColors, theme.colors.onPrimary]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: isExpired ? 0.6 : fadeAnim, // Reduce opacity for expired whisprs
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.moodInfo}>
          <Text style={styles.moodEmoji}>{moodConfig.emoji}</Text>
          <Text style={styles.moodText}>{moodConfig.description}</Text>
        </View>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      {/* Content */}
      <Text style={styles.content}>{whispr.content}</Text>

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.feelButton}
        onPress={handleFeel}
        disabled={isFeeling}
      >
        <Icon
          name={isFeeling ? 'chatbubbles' : 'chatbubble-outline'}
          size={14}
          color={theme.colors.onPrimary}
        />
        <Text style={styles.feelButtonText}>
          {isFeeling ? 'Chatting...' : 'Tap to Chat'}
        </Text>
      </TouchableOpacity>

    </Animated.View>
  );
});

// Memoized key extractor for FlatList
const keyExtractor = (item: TextWhispr) => item.id;

const WhisperFeed: React.FC<WhisperFeedProps> = ({ 
  onRecordWhispr, 
  distanceRange = { min: 0, max: 50000 },
  distanceFilter = '50km',
  onFilterLoadingChange
}) => {
  // Safety check: ensure distanceRange is valid
  const safeDistanceRange = distanceRange || { min: 0, max: 50000 };
  const theme = useTheme();
  const [whisprs, setWhisprs] = useState<TextWhispr[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWhisprForChat, setSelectedWhisprForChat] = useState<string | null>(null);
  const [showJumpToTop, setShowJumpToTop] = useState(false);
  const flatListRef = useRef<FlatList | SectionList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // ✅ STATE MANAGEMENT: Notify parent of loading state changes
  React.useEffect(() => {
    if (onFilterLoadingChange) {
      onFilterLoadingChange(loading);
    }
  }, [loading, onFilterLoadingChange]);

  // Debug: Track selectedWhisprForChat state changes
  useEffect(() => {
    console.log('🎯 selectedWhisprForChat state changed:', selectedWhisprForChat);
  }, [selectedWhisprForChat]);

  // Location fetching disabled per user request

  const loadWhisprs = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const range = safeDistanceRange;
      const rangeDesc = range.max === Infinity 
        ? `${range.min / 1000}km+` 
        : `${range.min / 1000}-${range.max / 1000}km`;
      console.log(`📍 Loading whisprs in EXCLUSIVE range: ${rangeDesc}...`);
      console.log(`📍 Distance range:`, range);
      
      // Fetch whisprs up to max range using the proven method
      const maxRadius = range.max === Infinity ? undefined : range.max;
      const allWhisprs = await TextWhisperService.getNearbyTextWhisprs(100, maxRadius);
      
      console.log(`📍 Fetched ${allWhisprs.length} whisprs - showing all active whisprs (location filtering disabled)`);
      
      // Show all active whisprs regardless of filter - location filtering disabled per user request
      setWhisprs(allWhisprs);
    } catch (error) {
      console.error('Error loading whisprs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load whisprs');
      // On error, try to show whisprs without exclusive filtering
      try {
        const maxRadius = safeDistanceRange.max === Infinity ? undefined : safeDistanceRange.max;
        console.log('⚠️ Falling back to basic filtering...');
        const fallbackWhisprs = await TextWhisperService.getNearbyTextWhisprs(20, maxRadius);
        setWhisprs(fallbackWhisprs);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setWhisprs([]);
      }
    } finally {
      setLoading(false);
      // Notify parent that loading is complete
      if (onFilterLoadingChange) {
        onFilterLoadingChange(false);
      }
    }
  }, [safeDistanceRange, onFilterLoadingChange]);

  useEffect(() => {
    loadWhisprs();
  }, [loadWhisprs]);

  // Location-based filtering disabled per user request

  // Set up real-time subscription for new whisprs
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for whisprs...');
    
    const channel = supabase
      .channel('whisprs-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whisprs'
        },
        async (payload) => {
          console.log('🆕 New whispr created:', payload.new);
          const newWhispr = payload.new as any;

          // Convert to TextWhispr format and add to list (location filtering disabled)
          const textWhispr: TextWhispr = {
            id: newWhispr.id,
            content: newWhispr.content,
            character_count: newWhispr.character_count,
            mood: newWhispr.mood,
            is_anonymous: newWhispr.is_anonymous,
            created_at: newWhispr.created_at,
            expires_at: newWhispr.expires_at,
            radius_meters: newWhispr.radius_meters,
          };

          // Add to beginning of list (most recent first)
          setWhisprs(prev => {
            // Check if already exists (avoid duplicates)
            if (prev.some(w => w.id === textWhispr.id)) {
              return prev;
            }
            return [textWhispr, ...prev];
          });
          console.log('✅ Added new whispr to feed');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whisprs'
        },
        async (payload) => {
          console.log('🔄 Whispr updated:', payload.new);
          const updatedWhispr = payload.new as any;

          setWhisprs(prev => {
            // Remove if expired (location filtering disabled)
            const isExpired = new Date(updatedWhispr.expires_at) <= new Date();
            if (isExpired) {
              return prev.filter(w => w.id !== updatedWhispr.id);
            }

            // Update existing whispr
            const textWhispr: TextWhispr = {
              id: updatedWhispr.id,
              content: updatedWhispr.content,
              character_count: updatedWhispr.character_count,
              mood: updatedWhispr.mood,
              is_anonymous: updatedWhispr.is_anonymous,
              created_at: updatedWhispr.created_at,
              expires_at: updatedWhispr.expires_at,
              radius_meters: updatedWhispr.radius_meters,
            };

            const index = prev.findIndex(w => w.id === updatedWhispr.id);
            if (index >= 0) {
              const newList = [...prev];
              newList[index] = textWhispr;
              return newList;
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Whisprs subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Whisprs real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Whisprs subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Whisprs subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔌 Whisprs subscription closed');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up whisprs subscription');
      channel.unsubscribe();
    };
  }, []);

  // ✅ FEED INTERACTION: Enhanced pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadWhisprs();
    } catch (error) {
      console.error('Error refreshing whisprs:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadWhisprs]);

  // ✅ FEED INTERACTION: Jump to top handler
  const handleJumpToTop = useCallback(() => {
    if (flatListRef.current) {
      if ('scrollToOffset' in flatListRef.current) {
        (flatListRef.current as FlatList).scrollToOffset({ offset: 0, animated: true });
      } else if ('scrollToLocation' in flatListRef.current) {
        (flatListRef.current as SectionList).scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
      }
    }
  }, []);

  // ✅ FEED INTERACTION: Track scroll position for jump-to-top button
  const handleScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: false,
        listener: (event: any) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          setShowJumpToTop(offsetY > 300); // Show button after scrolling 300px
        },
      }
    ),
    []
  );

  const handleWhisprFeel = useCallback((updatedWhispr: TextWhispr) => {
    // Open chat modal instead of updating whispr
    console.log('🎯 Setting selectedWhisprForChat:', updatedWhispr.id);
    setSelectedWhisprForChat(updatedWhispr.id);
  }, []);

  const handleReply = useCallback((whispr: TextWhispr) => {
    Alert.alert(
      'Reply to Whispr',
      `Reply to: "${whispr.content.substring(0, 50)}${whispr.content.length > 50 ? '...' : ''}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reply', onPress: () => console.log('Reply to whispr:', whispr.id) },
      ]
    );
  }, []);

  // ✅ STATE MANAGEMENT: Enhanced empty state messages based on filter
  const getEmptyStateMessage = useCallback((filter: DistanceFilter) => {
    switch (filter) {
      case '50km':
        return {
          emoji: '📍',
          title: 'No whisprs within 50km',
          subtitle: 'Try expanding your search to see more whisprs!',
          suggestion: 'Switch to Regional (100km) or Global view',
        };
      case '100km':
        return {
          emoji: '🌍',
          title: 'No whisprs within 100km',
          subtitle: 'Expand to Global view to see whisprs from anywhere!',
          suggestion: 'Switch to Global view',
        };
      case 'beyond':
        return {
          emoji: '🚀',
          title: 'No whisprs available',
          subtitle: 'Be the first to share a whispr in your area!',
          suggestion: 'Create your first whispr',
        };
      default:
        return {
          emoji: '💭',
          title: 'No whispers near yet',
          subtitle: 'Start one?',
          suggestion: '',
        };
    }
  }, []);

  const emptyState = useMemo(() => getEmptyStateMessage(distanceFilter), [distanceFilter, getEmptyStateMessage]);

  // ✅ FEED INTERACTION: Format timestamp for grouping
  const formatTimeGroup = useCallback((timestamp: string): string => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return created.toLocaleDateString();
    }
  }, []);

  // ✅ FEED INTERACTION: Group whisprs by time
  const groupedWhisprs = useMemo(() => {
    const groups: Record<string, TextWhispr[]> = {};
    
    whisprs.forEach(whispr => {
      const timeGroup = formatTimeGroup(whispr.created_at);
      if (!groups[timeGroup]) {
        groups[timeGroup] = [];
      }
      groups[timeGroup].push(whispr);
    });

    // Convert to array format for SectionList
    return Object.entries(groups).map(([timeGroup, items]) => ({
      title: timeGroup,
      data: items,
    }));
  }, [whisprs, formatTimeGroup]);

  // Memoized render item for FlatList
  const renderWhisprItem = useCallback(({ item }: { item: TextWhispr }) => (
    <WhisprItem
      whispr={item}
      onFeel={handleWhisprFeel}
    />
  ), [handleWhisprFeel]);

  // ✅ FEED INTERACTION: Render section header (timestamp grouping)
  const renderSectionHeader = useCallback(({ section }: { section: { title: string; data: TextWhispr[] } }) => (
    <View style={[
      styles.sectionHeader,
      { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }
    ]}>
      <Text style={[styles.sectionHeaderText, { color: theme.colors.onSurfaceVariant }]}>
        {section.title}
      </Text>
    </View>
  ), [theme.colors]);

  // Memoize styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
    },
    recordButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    recordButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
    content: {
      padding: spacing.sm,
      paddingBottom: spacing.md, // Extra bottom padding for last item
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptySubtext: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
    },
    retryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionHeader: {
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      backgroundColor: theme.colors.surface,
    },
    sectionHeaderText: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    jumpToTopButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    jumpToTopTouchable: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [theme.colors]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Whisprs</Text>
          <TouchableOpacity style={styles.recordButton} onPress={onRecordWhispr}>
            <Icon name="add" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.recordButtonText}>📜 Whispr</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWhisprs}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Whisprs</Text>
        <TouchableOpacity style={styles.recordButton} onPress={onRecordWhispr} testID="record-button">
          <Icon name="add" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.recordButtonText}>📜 Whispr</Text>
        </TouchableOpacity>
      </View>

      {whisprs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{emptyState.emoji}</Text>
          <Text style={styles.emptyText}>{emptyState.title}</Text>
          <Text style={styles.emptySubtext}>{emptyState.subtitle}</Text>
          {emptyState.suggestion ? (
            <Text style={[styles.emptySubtext, { fontSize: 14, marginBottom: spacing.md }]}>
              💡 {emptyState.suggestion}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.recordButton} onPress={onRecordWhispr} testID="record-first-button">
            <Icon name="add" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.recordButtonText}>🪶 Share Your Whispr</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <SectionList
            ref={flatListRef as any}
            sections={groupedWhisprs}
            renderItem={renderWhisprItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={keyExtractor}
            stickySectionHeadersEnabled={true}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.content}
            // Ensure proper scrolling
            nestedScrollEnabled={true}
            scrollEnabled={true}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
          />
          
          {/* ✅ FEED INTERACTION: Jump to top floating button */}
          {showJumpToTop && (
            <Animated.View
              style={[
                styles.jumpToTopButton,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleJumpToTop}
                activeOpacity={0.8}
                style={styles.jumpToTopTouchable}
              >
                <Icon name="arrow-up" size={24} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}

      {/* Chat Modal */}
      {selectedWhisprForChat && (
        <AnonymousChatModal
          visible={!!selectedWhisprForChat}
          whisprId={selectedWhisprForChat}
          onClose={() => setSelectedWhisprForChat(null)}
        />
      )}
    </View>
  );
};

export default WhisperFeed;