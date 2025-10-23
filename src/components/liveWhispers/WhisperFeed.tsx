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

interface WhisperFeedProps {
  onRecordWhispr?: () => void;
  distanceRadius?: number; // Distance radius in meters
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
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: moodColors.primary,
      shadowColor: moodColors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    moodInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    moodEmoji: {
      fontSize: 20,
      marginRight: spacing.xs,
    },
    moodText: {
      fontSize: 14,
      fontWeight: '600',
      color: moodColors.text,
    },
    timeText: {
      fontSize: 12,
      color: moodColors.accent,
    },
    content: {
      fontSize: 16,
      lineHeight: 24,
      color: moodColors.text,
      marginBottom: spacing.md,
    },
    characterCount: {
      fontSize: 12,
      color: moodColors.accent,
      textAlign: 'right',
      marginBottom: spacing.md,
    },
    feelButton: {
      backgroundColor: moodColors.primary,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    feelButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: spacing.sm,
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
      
      {/* Character Count */}
      <Text style={styles.characterCount}>
        {whispr.character_count} characters
      </Text>

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.feelButton}
        onPress={handleFeel}
        disabled={isFeeling}
      >
        <Icon
          name={isFeeling ? 'chatbubbles' : 'chatbubble-outline'}
          size={24}
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

const WhisperFeed: React.FC<WhisperFeedProps> = ({ onRecordWhispr, distanceRadius = 50000 }) => {
  const theme = useTheme();
  const [whisprs, setWhisprs] = useState<TextWhispr[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWhisprForChat, setSelectedWhisprForChat] = useState<string | null>(null);

  // Debug: Track selectedWhisprForChat state changes
  useEffect(() => {
    console.log('🎯 selectedWhisprForChat state changed:', selectedWhisprForChat);
  }, [selectedWhisprForChat]);

  const loadWhisprs = useCallback(async () => {
    try {
      setError(null);
      console.log(`📍 Loading whisprs within ${distanceRadius}m radius...`);
      const nearbyWhisprs = await TextWhisperService.getNearbyTextWhisprs(20, distanceRadius);
      setWhisprs(nearbyWhisprs);
    } catch (error) {
      console.error('Error loading whisprs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load whisprs');
    } finally {
      setLoading(false);
    }
  }, [distanceRadius]);

  useEffect(() => {
    loadWhisprs();
  }, [loadWhisprs]);

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
        (payload) => {
          console.log('🆕 New whispr created:', payload.new);
          // Refresh the feed when a new whispr is created
          loadWhisprs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whisprs'
        },
        (payload) => {
          console.log('🔄 Whispr updated:', payload.new);
          // Refresh the feed when a whispr is updated (e.g., expired)
          loadWhisprs();
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
  }, [loadWhisprs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWhisprs();
    setRefreshing(false);
  }, [loadWhisprs]);

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

  // Memoized render item for FlatList
  const renderWhisprItem = useCallback(({ item }: { item: TextWhispr }) => (
    <WhisprItem
      whispr={item}
      onFeel={handleWhisprFeel}
    />
  ), [handleWhisprFeel]);

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
      padding: spacing.lg,
      minHeight: 400, // Ensure minimum height for scrolling
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
          <Text style={styles.emptyEmoji}>💭</Text>
          <Text style={styles.emptyText}>No whispers near yet</Text>
          <Text style={styles.emptySubtext}>
            Start one?
          </Text>
          <TouchableOpacity style={styles.recordButton} onPress={onRecordWhispr} testID="record-first-button">
            <Icon name="add" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.recordButtonText}>🪶 Share Your Whispr</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={whisprs}
          renderItem={renderWhisprItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
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