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

type CountryFilter = 'regional' | 'global';

interface FilterCounts {
  regional: number | string; // number or "20+" format
  global: number | string;
}

interface WhisperFeedProps {
  onRecordWhispr?: () => void;
  countryFilter: CountryFilter; // Current country filter
  onFilterLoadingChange?: (loading: boolean) => void; // Callback to notify parent of loading state
  onCountsUpdate?: (counts: FilterCounts) => void; // Callback to update filter counts
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

// Removed - using stableKeyExtractor inside component to prevent re-renders

const WhisperFeed: React.FC<WhisperFeedProps> = ({ 
  onRecordWhispr, 
  countryFilter,
  onFilterLoadingChange,
  onCountsUpdate
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [whisprs, setWhisprs] = useState<TextWhispr[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWhisprForChat, setSelectedWhisprForChat] = useState<string | null>(null);
  const [showJumpToTop, setShowJumpToTop] = useState(false);
  const sectionListRef = useRef<SectionList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // ✅ STORE USER COUNTRY: For real-time filtering
  const userCountryRef = useRef<string | null>(null);
  const countryFilterRef = useRef(countryFilter);
  
  // ✅ STORE CREATOR COUNTRIES: For counting regional whisprs
  const creatorCountryMapRef = useRef<Map<string, string | null>>(new Map());
  
  // ✅ STABLE REF: Store callback to prevent dependency changes
  const onFilterLoadingChangeRef = useRef(onFilterLoadingChange);
  const onCountsUpdateRef = useRef(onCountsUpdate);
  useEffect(() => {
    onFilterLoadingChangeRef.current = onFilterLoadingChange;
    onCountsUpdateRef.current = onCountsUpdate;
  }, [onFilterLoadingChange, onCountsUpdate]);

  // ✅ STATE MANAGEMENT: Notify parent of loading state changes (stabilized)
  React.useEffect(() => {
    if (onFilterLoadingChangeRef.current) {
      onFilterLoadingChangeRef.current(loading);
    }
  }, [loading]);

  // ✅ UPDATE FILTER REF: Keep filter ref in sync
  useEffect(() => {
    countryFilterRef.current = countryFilter;
  }, [countryFilter]);

  // ✅ FETCH USER COUNTRY: Get user's country for filtering
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) return;
      
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('country')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.country) {
        userCountryRef.current = userProfile.country;
        console.log(`🌍 User country: ${userProfile.country}`);
      }
    };
    
    fetchUserCountry();
  }, [user]);

  // ✅ UPDATE CREATOR COUNTRIES: Fetch and cache creator countries for counting
  const updateCreatorCountries = useCallback(async (whisprsList: TextWhispr[]) => {
    if (!userCountryRef.current) return;
    
    // Get unique creator IDs
    const creatorIds = [...new Set(whisprsList.map(w => w.user_id).filter(Boolean))];
    
    if (creatorIds.length === 0) return;
    
    // Fetch creator countries for missing IDs
    const missingIds = creatorIds.filter(id => !creatorCountryMapRef.current.has(id));
    
    if (missingIds.length > 0) {
      const { data: creatorProfiles } = await supabase
        .from('user_profiles')
        .select('id, country')
        .in('id', missingIds);
      
      (creatorProfiles || []).forEach(profile => {
        creatorCountryMapRef.current.set(profile.id, profile.country || null);
      });
    }
  }, []);

  // ✅ CALCULATE COUNTS: Count from fetched whisprs (client-side, zero DB overhead)
  const calculateCounts = useCallback((whisprsList: TextWhispr[], userCountry: string | null) => {
    const limit = 100; // Same limit used in getWhisprsByCountry
    
    // Count regional whisprs (same country as user)
    const regionalCount = userCountry 
      ? whisprsList.filter(w => {
          if (!w.user_id) return false;
          const creatorCountry = creatorCountryMapRef.current.get(w.user_id) || null;
          return creatorCountry === userCountry;
        }).length
      : 0;
    
    // Count global whisprs (all whisprs)
    const globalCount = whisprsList.length;
    
    // Format counts with "+" indicator if at limit
    const formatCount = (count: number, isAtLimit: boolean) => {
      return isAtLimit ? `${limit}+` : count.toString();
    };
    
    const counts: FilterCounts = {
      regional: formatCount(regionalCount, regionalCount >= limit),
      global: formatCount(globalCount, globalCount >= limit),
    };
    
    return counts;
  }, []);

  // ✅ UPDATE COUNTS: Calculate and notify parent when whisprs change
  useEffect(() => {
    if (!onCountsUpdateRef.current || whisprs.length === 0) {
      // If no whisprs, set counts to 0
      if (onCountsUpdateRef.current && whisprs.length === 0) {
        onCountsUpdateRef.current({ regional: '0', global: '0' });
      }
      return;
    }
    
    // Update creator countries cache, then calculate counts
    updateCreatorCountries(whisprs).then(() => {
      const counts = calculateCounts(whisprs, userCountryRef.current);
      onCountsUpdateRef.current?.(counts);
    });
  }, [whisprs, updateCreatorCountries, calculateCounts]);

  // ✅ STABLE: Memoize loadWhisprs to prevent infinite loops
  // ✅ COUNTRY FILTERING: Use country-based filtering
  const loadWhisprs = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      console.log(`🌍 Loading whisprs with ${countryFilter} filter...`);
      
      // ✅ FIX: Use getWhisprsByCountry for country-based filtering
      const filteredWhisprs = await TextWhisperService.getWhisprsByCountry(
        100, // limit
        countryFilter
      );
      
      console.log(`🌍 Fetched ${filteredWhisprs.length} whisprs with ${countryFilter} filter`);
      
      // ✅ UPDATE CREATOR COUNTRIES: Cache creator countries for counting (before setting state)
      await updateCreatorCountries(filteredWhisprs);
      
      // ✅ BATCH UPDATE: Set whisprs and loading state together to reduce flicker
      setWhisprs(filteredWhisprs);
    } catch (error) {
      console.error('Error loading whisprs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load whisprs');
      setWhisprs([]);
    } finally {
      setLoading(false);
      // Notify parent that loading is complete (using ref to avoid dependency)
      if (onFilterLoadingChangeRef.current) {
        onFilterLoadingChangeRef.current(false);
      }
    }
  }, [countryFilter, updateCreatorCountries]);

  // ✅ LOAD ONCE: Only load on mount or when countryFilter changes
  useEffect(() => {
    loadWhisprs();
  }, [loadWhisprs]);

  // Set up real-time subscription for new whisprs with country filtering
  useEffect(() => {
    if (!user) {
      console.log('⏳ Waiting for user before setting up subscription...');
      return;
    }

    console.log('🔄 Setting up real-time subscription for whisprs with country filtering...');
    console.log(`🌍 Current filter: ${countryFilterRef.current}`);
    
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

          // ✅ COUNTRY FILTERING: Check if whispr matches current filter
          const currentFilter = countryFilterRef.current;
          let shouldInclude = true;

          let creatorCountry: string | null = null;
          
          if (currentFilter === 'regional' && userCountryRef.current && newWhispr.user_id) {
            try {
              // Get creator country
              const { data: creatorProfile } = await supabase
                .from('user_profiles')
                .select('country')
                .eq('id', newWhispr.user_id)
                .single();

              creatorCountry = creatorProfile?.country || null;
              shouldInclude = creatorCountry === userCountryRef.current;

              if (!shouldInclude) {
                console.log(`🚫 Filtered out new whispr (creator country: ${creatorCountry}, user country: ${userCountryRef.current})`);
                return;
              }
              
              // ✅ CACHE CREATOR COUNTRY: Store creator country for counting
              if (newWhispr.user_id && creatorCountry) {
                creatorCountryMapRef.current.set(newWhispr.user_id, creatorCountry);
              }
            } catch (error) {
              console.error('❌ Error checking country for new whispr:', error);
              // Fail closed for regional filter
              shouldInclude = false;
            }
          } else if (newWhispr.user_id) {
            // For global filter, still cache creator country for counting
            try {
              const { data: creatorProfile } = await supabase
                .from('user_profiles')
                .select('country')
                .eq('id', newWhispr.user_id)
                .single();
              
              creatorCountry = creatorProfile?.country || null;
              if (newWhispr.user_id && creatorCountry) {
                creatorCountryMapRef.current.set(newWhispr.user_id, creatorCountry);
              }
            } catch (error) {
              // Silently fail - not critical for global filter
            }
          }
          // For 'global' filter, include all whisprs

          // Convert to TextWhispr format and add to list
          const textWhispr: TextWhispr = {
            id: newWhispr.id,
            content: newWhispr.content,
            character_count: newWhispr.character_count,
            mood: newWhispr.mood,
            is_anonymous: newWhispr.is_anonymous,
            created_at: newWhispr.created_at,
            expires_at: newWhispr.expires_at,
            radius_meters: newWhispr.radius_meters,
            user_id: newWhispr.user_id, // Include for counting
          };

          // ✅ OPTIMIZED: Add to beginning of list (most recent first) - only update if new
          setWhisprs(prev => {
            // Check if already exists (avoid duplicates and unnecessary re-renders)
            const exists = prev.some(w => w.id === textWhispr.id);
            if (exists) {
              return prev; // Return same reference to prevent re-render
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

          // ✅ OPTIMIZED: Only update if whispr exists and actually changed
          setWhisprs(prev => {
            const index = prev.findIndex(w => w.id === updatedWhispr.id);
            
            // Remove if expired
            const isExpired = new Date(updatedWhispr.expires_at) <= new Date();
            if (isExpired) {
              if (index >= 0) {
                return prev.filter(w => w.id !== updatedWhispr.id);
              }
              return prev;
            }

            if (index === -1) {
              return prev; // Not in list, no change needed
            }

            // Check if whispr actually changed to avoid unnecessary updates
            const existing = prev[index];
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

            // ✅ COMPARISON: Only update if content actually changed
            if (
              existing.content === textWhispr.content &&
              existing.mood === textWhispr.mood &&
              existing.is_anonymous === textWhispr.is_anonymous &&
              existing.expires_at === textWhispr.expires_at
            ) {
              return prev; // No change, return same reference
            }

            // Update only the changed item
            const newList = [...prev];
            newList[index] = textWhispr;
            return newList;
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
  }, [user]);

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
    if (sectionListRef.current) {
      sectionListRef.current.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
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
  const getEmptyStateMessage = useCallback((filter: CountryFilter) => {
    switch (filter) {
      case 'regional':
        return {
          emoji: '🌍',
          title: 'No whisprs from your country',
          subtitle: 'No one from your country has shared a whispr yet',
          suggestion: 'Switch to Global view to see whisprs from all countries',
        };
      case 'global':
        return {
          emoji: '🚀',
          title: 'No active whisprs',
          subtitle: 'Be the first to share a whispr!',
          suggestion: 'Tap the + button to create your first whispr',
        };
      default:
        return {
          emoji: '💭',
          title: 'No whisprs found',
          subtitle: 'Be the first to share a whispr!',
          suggestion: 'Tap the + button to create your first whispr',
        };
    }
  }, []);

  const emptyState = useMemo(() => getEmptyStateMessage(countryFilter), [countryFilter, getEmptyStateMessage]);

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

  // ✅ FEED INTERACTION: Group whisprs by time (optimized to prevent flicker)
  const groupedWhisprs = useMemo(() => {
    if (whisprs.length === 0) {
      return [];
    }
    
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
  
  // ✅ STABLE: Memoize key extractor to prevent re-renders
  const stableKeyExtractor = useCallback((item: TextWhispr) => item.id, []);

  // Memoized render item for SectionList
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
            ref={sectionListRef}
            sections={groupedWhisprs}
            renderItem={renderWhisprItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={stableKeyExtractor}
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