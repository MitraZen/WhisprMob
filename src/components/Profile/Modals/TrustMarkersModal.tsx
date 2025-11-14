/**
 * Trust Markers Modal Component
 * Modal for viewing all trust markers and their details
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { TrustMarker } from '@/types/profile.types';

interface TrustMarkersModalProps {
  visible: boolean;
  onClose: () => void;
  trustMarkers: TrustMarker[];
  trustScore: number;
  theme: any;
}

export const TrustMarkersModal: React.FC<TrustMarkersModalProps> = ({
  visible,
  onClose,
  trustMarkers = [],
  trustScore,
  theme,
}) => {
  const styles = createStyles(theme);
  const safeMarkers = trustMarkers || [];

  const earnedMarkers = safeMarkers.filter(m => m.isEarned);
  const inProgressMarkers = safeMarkers.filter(m => !m.isEarned);

  // Group markers by category
  const markersByCategory = safeMarkers.reduce((acc, marker) => {
    if (!acc[marker.category]) {
      acc[marker.category] = [];
    }
    acc[marker.category].push(marker);
    return acc;
  }, {} as Record<string, typeof trustMarkers>);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Trust Markers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Trust Score Display */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{trustScore}</Text>
              <Text style={styles.scoreLabel}>Trust Score</Text>
            </View>
            <Text style={styles.scoreDescription}>
              {earnedMarkers.length} of {trustMarkers.length} markers earned
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {/* Group by Category */}
            {Object.entries(markersByCategory).map(([categoryName, categoryMarkers]) => {
              const earned = categoryMarkers.filter(m => m.isEarned);
              const inProgress = categoryMarkers.filter(m => !m.isEarned);
              
              return (
                <View key={categoryName} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Markers
                  </Text>
                  
                  {/* Earned Markers in this category */}
                  {earned.length > 0 && (
                    <View style={styles.markersGrid}>
                      {earned.map((marker) => (
                        <View key={marker.id} style={styles.markerCard}>
                          <View style={[styles.markerIconContainer, { backgroundColor: marker.color + '20' }]}>
                            <Text style={styles.markerIcon}>{marker.icon}</Text>
                          </View>
                          <Text style={styles.markerTitle}>{marker.title}</Text>
                          <Text style={styles.markerDescription}>{marker.description}</Text>
                          <Text style={styles.markerPoints}>+{marker.points} points</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* In Progress Markers in this category */}
                  {inProgress.length > 0 && (
                    <View style={styles.progressSection}>
                      {inProgress.map((marker) => (
                        <View key={marker.id} style={styles.progressCard}>
                          <View style={styles.progressIconContainer}>
                            <Text style={styles.progressIcon}>{marker.icon}</Text>
                          </View>
                          <View style={styles.progressContent}>
                            <Text style={styles.progressTitle}>{marker.title}</Text>
                            <Text style={styles.progressDescription}>{marker.description}</Text>
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
                            <Text style={styles.progressText}>
                              {marker.progress}/{marker.maxProgress}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onClose}
            >
              <Text style={styles.footerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: Dimensions.get('window').height * 0.85,
    maxHeight: '90%',
    flexDirection: 'column',
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  scoreSection: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    marginBottom: spacing.md,
  },
  scoreValue: {
    ...theme.typography.headlineLarge,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  scoreLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  scoreDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  markersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  markerCard: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  markerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  markerIcon: {
    fontSize: 28,
  },
  markerTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  markerDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  markerPoints: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.sm,
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginRight: spacing.md,
  },
  progressIcon: {
    fontSize: 24,
  },
  progressContent: {
    flex: 1,
  },
  progressTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSurfaceVariant,
  },
  progressSection: {
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  footerButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
});

