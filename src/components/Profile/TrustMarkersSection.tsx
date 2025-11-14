/**
 * Trust Markers Section Component
 * Display user's trust markers and trust score with accordion functionality
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Animated } from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { TrustMarker } from '@/types/profile.types';

interface TrustMarkersSectionProps {
  trustMarkers: TrustMarker[];
  trustScore: number;
  isExpanded: boolean;
  onToggle: () => void;
  accordionHeight: any;
  onViewAll: () => void;
  theme: any;
}

export const TrustMarkersSection: React.FC<TrustMarkersSectionProps> = ({
  trustMarkers = [],
  trustScore,
  isExpanded,
  onToggle,
  accordionHeight,
  onViewAll,
  theme,
}) => {
  const styles = createStyles(theme);
  const safeMarkers = trustMarkers || [];
  const earnedMarkers = safeMarkers.filter(m => m.isEarned);
  const inProgressMarkers = safeMarkers.filter(m => !m.isEarned);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Trust Markers</Text>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {/* Trust Score Display */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{trustScore}</Text>
          <Text style={styles.scoreLabel}>Trust Score</Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAll}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Icon name="arrow-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            height: accordionHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 350], // TODO: Calculate dynamic height
            }),
            opacity: accordionHeight,
          }
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Earned Markers */}
          <View style={styles.markersContainer}>
            {earnedMarkers.slice(0, 6).map((marker) => (
              <View key={marker.id} style={styles.marker}>
                <View style={[styles.markerIconContainer, { backgroundColor: marker.color + '20' }]}>
                  <Text style={styles.markerIcon}>{marker.icon}</Text>
                </View>
                <Text style={styles.markerTitle}>{marker.title}</Text>
                <Text style={styles.markerPoints}>+{marker.points}</Text>
              </View>
            ))}
          </View>

          {/* In Progress Markers */}
          {inProgressMarkers.length > 0 && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>In Progress</Text>
              {inProgressMarkers.slice(0, 3).map((marker) => (
                <View key={marker.id} style={styles.progressMarker}>
                  <View style={styles.progressIconContainer}>
                    <Text style={styles.progressIcon}>{marker.icon}</Text>
                  </View>
                  <View style={styles.progressContent}>
                    <Text style={styles.progressMarkerTitle}>{marker.title}</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${(marker.progress / marker.maxProgress) * 100}%`,
                            backgroundColor: marker.color
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressMarkerText}>
                      {marker.progress}/{marker.maxProgress}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  scoreValue: {
    ...theme.typography.headlineMedium,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  scoreLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  viewAllText: {
    ...theme.typography.labelMedium,
    color: theme.colors.primary,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  content: {
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  markersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  marker: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  markerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  markerIcon: {
    fontSize: 24,
  },
  markerTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  markerPoints: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSurfaceVariant,
  },
  progressSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  progressTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  progressMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  progressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginRight: spacing.md,
  },
  progressIcon: {
    fontSize: 20,
  },
  progressContent: {
    flex: 1,
  },
  progressMarkerTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressMarkerText: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSurfaceVariant,
  },
});

