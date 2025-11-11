import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, BackHandler, RefreshControl, AppState, Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius, getMoodConfig } from '@/utils/themes';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService, WhisprNote } from '@/services/buddiesService';
import { CachedBuddiesService } from '@/services/cachedBuddiesService';
import { useAdmin } from '@/store/AdminContext';
import { WalkthroughManager } from '@/components/WalkthroughManager';
import GradientBackground from '@/components/GradientBackground';

interface WhisprNotesScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const WhisprNotesScreen: React.FC<WhisprNotesScreenProps> = ({ onNavigate, user }) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);
  const [notes, setNotes] = useState<WhisprNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [noteAlerts, setNoteAlerts] = useState<number>(0);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { enableAdminMode } = useAdmin();

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Start animations on mount
  useEffect(() => {
    // Pulse animation for Share Your Whispr button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Floating animation for background elements
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    floatAnimation.start();

    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
    };
  }, []);

  // Load notes
  useEffect(() => {
    if (user?.id) loadNotes();
  }, [user?.id]);

  // Listen for real-time updates from notification manager
  useEffect(() => {
    if (!user?.id) return;

    const handleRealtimeUpdate = () => {
      console.log('📱 Real-time update received, refreshing notes');
      loadNotes(false);
    };

    // Listen for custom events from notification manager
    const eventListener = (event: any) => {
      if (event.detail?.type === 'notes-updated') {
        handleRealtimeUpdate();
      }
    };

    // Add event listener for real-time updates
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('notes-updated', eventListener);
    }

    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('notes-updated', eventListener);
      }
    };
  }, [user?.id]);

  // Smart refresh strategy - only refresh when app becomes active
  useEffect(() => {
    if (!user?.id) return;
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active, refreshing notes');
        loadNotes();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id]);

  // Handle Android back button - prevent going back to login screen
  useEffect(() => {
    const backAction = () => {
      // Show exit confirmation instead of going back to login
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit Whispr?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Calculate note alerts (new notes since last check)
  const calculateNoteAlerts = () => {
    // For now, we'll count unread notes as alerts
    // In a real implementation, you might track timestamps of when user last checked
    const newNotesCount = notes.filter(note => {
      // Consider notes created in the last 24 hours as "new"
      const noteDate = new Date(note.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    }).length;
    setNoteAlerts(newNotesCount);
  };

  // Clear all note alerts
  const clearAllNoteAlerts = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you might update a "lastChecked" timestamp
      // For now, we'll just hide the alerts
      setNoteAlerts(0);
      setShowAlertsDropdown(false);
      Alert.alert('Success', 'Note alerts have been cleared!');
    } catch (error) {
      console.error('Error clearing note alerts:', error);
      Alert.alert('Error', 'Failed to clear note alerts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate note alerts whenever notes change
  useEffect(() => {
    calculateNoteAlerts();
  }, [notes]);

  const loadNotes = async (isManualRefresh = false) => {
    if (!user?.id) return;
    
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);
    try {
      const buddies = await BuddiesService.getBuddies(user.id);
      const userIsNew = !buddies || buddies.length === 0;
      setIsNewUser(userIsNew);
      let notesData = userIsNew
        ? await BuddiesService.getNewUserNotes(user.id, 5)
        : await BuddiesService.getWhisprNotes(user.id);
      setNotes(notesData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await loadNotes(true);
  };

  const handleRefreshControl = () => {
    loadNotes(true);
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };


  const handleListen = async (noteId: string) => {
    console.log('🎧 Starting to listen to note:', noteId, 'for user:', user.id);
    setActionLoading(prev => new Set(prev).add(noteId));
    try {
      const result = await CachedBuddiesService.listenToWhisprNote(noteId, user.id);
      console.log('🎧 Listen result:', result);
      if (result?.success) {
        // Show success message with buddy creation info
        const buddyCreated = result.buddy_created;
        const message = buddyCreated 
          ? 'Note listened! Check your Buddies tab to start chatting with your new buddy! 👥'
          : 'Note listened! You\'ve acknowledged this note. 👂';
        
        Alert.alert('Note Listened! 👂', message);
        
        // Refresh notes to update the list
        await loadNotes();
        
        // If a buddy was created, trigger a global event to refresh buddies screen
        if (buddyCreated) {
          console.log('🎧 Buddy created, triggering buddies refresh');
          // Invalidate buddies cache to ensure the new buddy appears immediately
          const { QueryCache } = await import('@/services/queryCache');
          QueryCache.invalidateBuddies(user.id);
          // Use a callback approach instead of CustomEvent for React Native compatibility
          // The navigation callback will handle refreshing the buddies screen
          onNavigate('buddies');
        }
      } else {
        console.log('🎧 Listen failed - result:', result);
        Alert.alert('Error', 'Failed to listen to note. Result: ' + JSON.stringify(result));
      }
    } catch (error) {
      console.error('🎧 Error listening to note:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', 'Failed to listen to note: ' + errorMessage);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  const handleReject = async (noteId: string) => {
    console.log('❌ Starting to reject note:', noteId, 'for user:', user.id);
    setActionLoading(prev => new Set(prev).add(noteId));
    try {
      const result = await BuddiesService.rejectNote(noteId, user.id);
      console.log('❌ Reject result:', result);
      if (result?.success) {
        Alert.alert('Note Rejected', 'The note has been rejected.');
        await loadNotes();
      } else {
        console.log('❌ Reject failed - result:', result);
        Alert.alert('Error', 'Failed to reject note. Result: ' + JSON.stringify(result));
      }
    } catch (error) {
      console.error('❌ Error rejecting note:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', 'Failed to reject note: ' + errorMessage);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  const formatTimestamp = (ts: Date | string) => {
    const date = ts instanceof Date ? ts : new Date(ts);
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000), hr = Math.floor(diff / 3600000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return date.toLocaleDateString();
  };

  const toggleExpand = (id: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const truncateText = (txt: string) => {
    // Find the first line break or limit to a reasonable length for single line
    const firstLineBreak = txt.indexOf('\n');
    if (firstLineBreak !== -1) {
      return txt.substring(0, firstLineBreak);
    }
    
    // If no line break, limit to approximately one line (around 50-60 characters)
    const maxLength = 60;
    if (txt.length > maxLength) {
      return txt.substring(0, maxLength) + '...';
    }
    
    return txt;
  };

  return (
    <GradientBackground variant="default">
      {/* Floating Background Animation */}
      <Animated.View 
        style={[
          styles.floatingAnimation,
          {
            opacity: floatAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1.0],
            }),
            transform: [{
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -30],
              }),
            }],
          }
        ]}
      >
        <LottieView
          source={require('../../assets/animations/Voice line _ wave animation.json')}
          autoPlay
          loop
          style={styles.lottieBackground}
        />
      </Animated.View>

      <KeyboardAvoidingView style={styles.contentContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('buddies')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Whispr Notes</Text>
          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Updated {formatLastUpdated(lastUpdated)}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.alertsButton}
          onPress={() => setShowAlertsDropdown(!showAlertsDropdown)}
        >
          <Icon name="notifications" size={24} color={theme.colors.onSurface} />
          {noteAlerts > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {noteAlerts > 99 ? '99+' : noteAlerts}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Note Alerts Dropdown */}
      {showAlertsDropdown && (
        <View style={styles.alertsDropdown}>
          <View style={styles.alertsDropdownContent}>
            <View style={styles.alertsHeader}>
              <Icon name="document-text" size={20} color={theme.colors.primary} />
              <Text style={styles.alertsTitle}>Note Activity</Text>
            </View>
            
            {/* Alert Summary */}
            <View style={styles.alertSummary}>
              <Text style={styles.alertsCount}>
                {noteAlerts} new note{noteAlerts !== 1 ? 's' : ''} in the last 24 hours
              </Text>
            </View>
            
            {/* Activity Breakdown */}
            <View style={styles.activityBreakdown}>
              <View style={styles.activityItem}>
                <Icon name="eye" size={16} color={theme.colors.success} />
                <Text style={styles.activityText}>Received by others</Text>
              </View>
              <View style={styles.activityItem}>
                <Icon name="play" size={16} color={theme.colors.info} />
                <Text style={styles.activityText}>Listened to</Text>
              </View>
              <View style={styles.activityItem}>
                <Icon name="close" size={16} color={theme.colors.error} />
                <Text style={styles.activityText}>Rejected</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.clearAlertsButton}
              onPress={clearAllNoteAlerts}
              disabled={isLoading || noteAlerts === 0}
            >
              <Text style={[
                styles.clearAlertsButtonText,
                (isLoading || noteAlerts === 0) && styles.clearAlertsButtonTextDisabled
              ]}>
                {isLoading ? 'Clearing...' : 'Clear All Alerts'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Welcome Banner for New Users */}
      {isNewUser && (
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeBannerText}>
            🎉 Welcome! You're seeing a limited set of notes. Listen to discover more!
          </Text>
        </View>
      )}

      {/* Sent Notes Section */}
      <View style={styles.sentNotesSection}>
        <TouchableOpacity 
          style={styles.sentNotesCard}
          onPress={() => onNavigate('sentNotes')}
          activeOpacity={0.7}
        >
          <View style={styles.sentNotesContent}>
            <View style={styles.sentNotesIcon}>
              <Icon name="send" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.sentNotesText}>
              <Text style={styles.sentNotesTitle}>Sent Notes</Text>
              <Text style={styles.sentNotesSubtitle}>View your shared notes and their impact</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <ScrollView 
        style={styles.notesContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshControl}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            title="Pull to refresh"
            titleColor={theme.colors.text}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text>Loading notes...</Text>
          </View>
        ) : error ? (
          <View>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity onPress={() => loadNotes()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💭</Text>
            <Text style={styles.emptyText}>No Whispr notes yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
          </View>
        ) : (
          notes.map(note => {
            const expanded = expandedNotes.has(note.id);
            return (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard]}
                activeOpacity={0.9}
                onPress={() => toggleExpand(note.id)}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.moodIndicator}>
                    <Text style={styles.moodEmoji}>{getMoodConfig(note.mood || 'happy').emoji}</Text>
                    <Text style={styles.moodText}>{getMoodConfig(note.mood || 'happy').description}</Text>
                  </View>
                  <Text style={styles.timestamp}>{formatTimestamp(note.createdAt)}</Text>
                </View>
                <Text style={styles.noteContent} numberOfLines={expanded ? undefined : 1}>
                  {expanded ? note.content : truncateText(note.content)}
                </Text>
                {!expanded && (note.content.includes('\n') || note.content.length > 60) && (
                  <Text style={styles.expandHint}>Tap to expand...</Text>
                )}
                <View style={styles.noteActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.listenButton, actionLoading.has(note.id) && styles.actionButtonDisabled]} 
                    onPress={() => handleListen(note.id)}
                    disabled={actionLoading.has(note.id)}
                  >
                    {actionLoading.has(note.id) ? (
                      <ActivityIndicator color={theme.colors.onSurface} size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>👂 Listen</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton, actionLoading.has(note.id) && styles.actionButtonDisabled]} 
                    onPress={() => handleReject(note.id)}
                    disabled={actionLoading.has(note.id)}
                  >
                    {actionLoading.has(note.id) ? (
                      <ActivityIndicator color={theme.colors.onSurface} size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>❌ Reject</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Demarcation Line */}
      <View style={styles.demarcationContainer}>
        <View style={styles.demarcationLine} />
        <Text style={styles.demarcationText}>Send Your Note</Text>
        <View style={styles.demarcationLine} />
      </View>

      {/* Share Your Whispr Button */}
      <Animated.View
        style={[
          styles.startWhisperingButtonContainer,
          {
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => onNavigate('sendNote')}
          activeOpacity={0.8}
        >
          <View style={styles.startWhisperingButtonGradient}>
            <Icon name="add" size={18} color={theme.colors.onPrimary} style={styles.startIcon} />
            <Text style={styles.startWhisperingButtonText}>🪶 Share Your Whispr</Text>
            <Icon name="chevron-forward" size={18} color={theme.colors.onPrimary} style={styles.endIcon} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <NavigationMenu currentScreen="notes" onNavigate={onNavigate} />
      
      {/* Walkthrough for new users */}
      <WalkthroughManager 
        walkthroughId="main_app_tour" 
        autoShow={true}
        context="whispr_notes"
        userId={user?.id}
      />
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
  },
  contentContainer: {
    flex: 1,
  },
  floatingAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  lottieBackground: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backdropFilter: 'blur(10px)',
    zIndex: 1,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    backdropFilter: 'blur(10px)',
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  lastUpdatedText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    fontSize: 12,
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
    backgroundColor: theme.colors.error,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertsDropdown: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  alertsDropdownContent: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
    color: theme.colors.onSurface,
  },
  alertSummary: {
    marginBottom: spacing.sm,
  },
  alertsCount: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  activityBreakdown: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  clearAlertsButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
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
  welcomeBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  welcomeBannerText: {
    color: theme.colors.onSurface,
    fontSize: 14,
    textAlign: 'center',
  },
  sentNotesSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sentNotesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  sentNotesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  sentNotesIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sentNotesText: {
    flex: 1,
  },
  sentNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  sentNotesSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  notesContainer: { flex: 1, padding: spacing.md },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  moodIndicator: { flexDirection: 'row', alignItems: 'center' },
  moodEmoji: { fontSize: 16, marginRight: spacing.xs },
  moodText: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurface },
  timestamp: { fontSize: 10, color: theme.colors.onSurfaceVariant },
  noteContent: { 
    fontSize: 14, 
    color: theme.colors.onSurface, 
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  expandHint: { fontSize: 10, fontStyle: 'italic', color: theme.colors.onSurfaceVariant },
  noteActions: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: { 
    flex: 1, 
    alignItems: 'center', 
    padding: spacing.sm, 
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  listenButton: { 
    backgroundColor: theme.colors.success + '15',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  rejectButton: { 
    backgroundColor: theme.colors.error + '15',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  actionButtonText: { 
    color: theme.colors.onSurface, 
    fontSize: 12, 
    fontWeight: '600' 
  },
  emptyContainer: { alignItems: 'center', marginTop: spacing.xl },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: spacing.md, color: theme.colors.onSurface },
  emptySubtext: { fontSize: 14, color: theme.colors.onSurfaceVariant },
  demarcationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.background,
  },
  demarcationLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  demarcationText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginHorizontal: spacing.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.xl 
  },
  errorText: { 
    color: theme.colors.error, 
    textAlign: 'center', 
    marginBottom: spacing.md 
  },
  retryButton: { 
    backgroundColor: theme.colors.primary, 
    padding: spacing.md, 
    borderRadius: borderRadius.lg, 
    alignItems: 'center' 
  },
  retryButtonText: { 
    color: theme.colors.onPrimary, 
    fontWeight: '600' 
  },
  actionButtonDisabled: { 
    opacity: 0.6 
  },
  startWhisperingButtonContainer: {
    position: 'absolute',
    bottom: 120, // Moved up from 100 to 120 for better spacing
    alignSelf: 'center', // Center the button
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200, // Set minimum width
    maxWidth: 280, // Set maximum width
  },
  startWhisperingButtonGradient: {
    paddingVertical: 4, // Further reduced from 8 to move content higher
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary, // Use theme primary color instead of hard-coded purple
  },
  startWhisperingButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  startIcon: {
    marginRight: 2,
    marginTop: -3, // Increased negative margin to move icon higher
  },
  endIcon: {
    marginLeft: 2,
    marginTop: -3, // Increased negative margin to move icon higher
  },
});

export default WhisprNotesScreen;
