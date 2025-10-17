import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius, theme } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { supabase } from '@/config/supabase';

interface AchievementsScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ onNavigate, user }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const styles = createStyles(theme);

  // Load real achievements data from existing tables
  useEffect(() => {
    const loadAchievements = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Fetch real data from existing tables
        const [
          messagesResult,
          notesResult,
          buddiesResult,
          profileResult
        ] = await Promise.all([
          // Get message count and activity
          supabase
            .from('buddy_messages')
            .select('id, created_at')
            .eq('sender_id', user.id),
          
          // Get notes count and activity
          supabase
            .from('whispr_notes')
            .select('id, created_at, status')
            .eq('sender_id', user.id),
          
          // Get buddies count
          supabase
            .from('buddies')
            .select('id, created_at')
            .eq('user_id', user.id),
          
          // Get user profile data
          supabase
            .from('user_profiles')
            .select('created_at')
            .eq('id', user.id)
            .single()
        ]);

        const messages = messagesResult.data || [];
        const notes = notesResult.data || [];
        const buddies = buddiesResult.data || [];
        const profile = profileResult.data;

        // Calculate achievements based on real data
        const userJoinDate = profile?.created_at ? new Date(profile.created_at) : new Date();
        const daysSinceJoin = Math.floor((Date.now() - userJoinDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate activity streaks (simplified - based on recent activity)
        const recentMessages = messages.filter(msg => {
          const msgDate = new Date(msg.created_at);
          const daysDiff = Math.floor((Date.now() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7;
        });

        const recentNotes = notes.filter(note => {
          const noteDate = new Date(note.created_at);
          const daysDiff = Math.floor((Date.now() - noteDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7;
        });

        const realAchievements = [
          {
            id: 'firstMessage',
            title: 'First Message',
            description: 'Sent your first message to a buddy',
            icon: '💬',
            color: '#10b981',
            category: 'communication',
            isUnlocked: messages.length > 0,
            progress: Math.min(messages.length, 1),
            requirement: 1,
            progressPercentage: messages.length > 0 ? 100 : 0,
            unlockedAt: messages.length > 0 ? new Date(messages[0].created_at) : null,
          },
          {
            id: 'firstNote',
            title: 'First Whispr Note',
            description: 'Shared your first anonymous note',
            icon: '📝',
            color: '#06b6d4',
            category: 'content',
            isUnlocked: notes.length > 0,
            progress: Math.min(notes.length, 1),
            requirement: 1,
            progressPercentage: notes.length > 0 ? 100 : 0,
            unlockedAt: notes.length > 0 ? new Date(notes[0].created_at) : null,
          },
          {
            id: 'firstBuddy',
            title: 'First Connection',
            description: 'Made your first buddy connection',
            icon: '🤝',
            color: '#8b5cf6',
            category: 'social',
            isUnlocked: buddies.length > 0,
            progress: Math.min(buddies.length, 1),
            requirement: 1,
            progressPercentage: buddies.length > 0 ? 100 : 0,
            unlockedAt: buddies.length > 0 ? new Date(buddies[0].created_at) : null,
          },
          {
            id: 'messageMaster',
            title: 'Message Master',
            description: 'Sent 10 messages to buddies',
            icon: '💬',
            color: '#f59e0b',
            category: 'communication',
            isUnlocked: messages.length >= 10,
            progress: Math.min(messages.length, 10),
            requirement: 10,
            progressPercentage: Math.min((messages.length / 10) * 100, 100),
            unlockedAt: messages.length >= 10 ? new Date(messages[9].created_at) : null,
          },
          {
            id: 'noteMaster',
            title: 'Note Master',
            description: 'Shared 5 Whispr Notes',
            icon: '📝',
            color: '#ec4899',
            category: 'content',
            isUnlocked: notes.length >= 5,
            progress: Math.min(notes.length, 5),
            requirement: 5,
            progressPercentage: Math.min((notes.length / 5) * 100, 100),
            unlockedAt: notes.length >= 5 ? new Date(notes[4].created_at) : null,
          },
          {
            id: 'socialButterfly',
            title: 'Social Butterfly',
            description: 'Connected with 5 buddies',
            icon: '🦋',
            color: '#10b981',
            category: 'social',
            isUnlocked: buddies.length >= 5,
            progress: Math.min(buddies.length, 5),
            requirement: 5,
            progressPercentage: Math.min((buddies.length / 5) * 100, 100),
            unlockedAt: buddies.length >= 5 ? new Date(buddies[4].created_at) : null,
          },
          {
            id: 'active7Days',
            title: 'Active This Week',
            description: 'Been active for 7 days',
            icon: '🔥',
            color: '#f59e0b',
            category: 'activity',
            isUnlocked: daysSinceJoin >= 7 && (recentMessages.length > 0 || recentNotes.length > 0),
            progress: Math.min(daysSinceJoin, 7),
            requirement: 7,
            progressPercentage: Math.min((daysSinceJoin / 7) * 100, 100),
            unlockedAt: daysSinceJoin >= 7 && (recentMessages.length > 0 || recentNotes.length > 0) ? new Date() : null,
          },
          {
            id: 'earlyBird',
            title: 'Early Bird',
            description: 'Active for 30 days',
            icon: '🌅',
            color: '#8b5cf6',
            category: 'activity',
            isUnlocked: daysSinceJoin >= 30,
            progress: Math.min(daysSinceJoin, 30),
            requirement: 30,
            progressPercentage: Math.min((daysSinceJoin / 30) * 100, 100),
            unlockedAt: daysSinceJoin >= 30 ? new Date() : null,
          },
        ];
        
        setAchievements(realAchievements);
      } catch (error) {
        console.error('Error loading achievements:', error);
        // Fallback to empty array if there's an error
        setAchievements([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [user?.id]);

  const categories = [
    { id: 'all', name: 'All', icon: 'trophy-outline' },
    { id: 'activity', name: 'Activity', icon: 'walk-outline' },
    { id: 'communication', name: 'Messages', icon: 'chatbubbles-outline' },
    { id: 'social', name: 'Social', icon: 'people-outline' },
    { id: 'content', name: 'Content', icon: 'document-text-outline' },
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('profile')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('profile')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Summary */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Icon name="trophy" size={24} color={theme.colors.warning} />
            <Text style={styles.progressTitle}>Your Progress</Text>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{unlockedCount}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{Math.round((unlockedCount / totalCount) * 100)}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={category.icon} 
                  size={20} 
                  color={selectedCategory === category.id ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} 
                />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Achievements List */}
        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>
            {selectedCategory === 'all' ? 'All Achievements' : categories.find(c => c.id === selectedCategory)?.name} Achievements
          </Text>
          
          {filteredAchievements.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="trophy-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyStateText}>No achievements found</Text>
              <Text style={styles.emptyStateSubtext}>Try selecting a different category</Text>
            </View>
          ) : (
            <View style={styles.achievementsList}>
              {filteredAchievements.map((achievement, index) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <View style={[
                    styles.achievementIconContainer,
                    { backgroundColor: achievement.isUnlocked ? achievement.color + '15' : theme.colors.surfaceVariant }
                  ]}>
                    <Text style={[
                      styles.achievementIcon,
                      { opacity: achievement.isUnlocked ? 1 : 0.5 }
                    ]}>
                      {achievement.icon}
                    </Text>
                    {achievement.isUnlocked && (
                      <View style={styles.achievementBadge}>
                        <Icon name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.achievementContent}>
                    <View style={styles.achievementHeader}>
                      <Text style={[
                        styles.achievementTitle,
                        { color: achievement.isUnlocked ? theme.colors.onSurface : theme.colors.onSurfaceVariant }
                      ]}>
                        {achievement.title}
                      </Text>
                      {achievement.isUnlocked && (
                        <Text style={styles.achievementDate}>
                          Unlocked {formatDate(achievement.unlockedAt)}
                        </Text>
                      )}
                    </View>
                    
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    
                    {!achievement.isUnlocked && (
                      <View style={styles.achievementProgress}>
                        <View style={styles.achievementProgressBar}>
                          <View style={[
                            styles.achievementProgressFill,
                            { 
                              width: `${achievement.progressPercentage}%`,
                              backgroundColor: achievement.color
                            }
                          ]} />
                        </View>
                        <Text style={styles.achievementProgressText}>
                          {achievement.progress}/{achievement.requirement}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="achievements" onNavigate={onNavigate} />
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  progressSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.lg,
    ...theme.shadows.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...theme.typography.headlineLarge,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  categorySection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  categoryScrollContent: {
    paddingRight: spacing.lg,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryButtonText: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  categoryButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  achievementsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  achievementsTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  achievementsList: {
    gap: spacing.md,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  achievementIconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10b981',
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  achievementTitle: {
    ...theme.typography.titleMedium,
    fontWeight: '600',
    flex: 1,
  },
  achievementDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  achievementDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  achievementProgressText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
});

export default AchievementsScreen;
