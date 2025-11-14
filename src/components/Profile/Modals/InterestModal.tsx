/**
 * Interest Modal Component
 * Modal for selecting and managing interest tokens
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { InterestToken } from '@/types/profile.types';

interface InterestModalProps {
  visible: boolean;
  onClose: () => void;
  interestTokens: InterestToken[];
  onTokensChange: (tokens: InterestToken[]) => void;
  theme: any;
}

export const InterestModal: React.FC<InterestModalProps> = ({
  visible,
  onClose,
  interestTokens = [],
  onTokensChange,
  theme,
}) => {
  const styles = createStyles(theme);
  const safeTokens = interestTokens || [];
  const [localTokens, setLocalTokens] = useState<InterestToken[]>(safeTokens);

  useEffect(() => {
    if (visible) {
      setLocalTokens(safeTokens);
    }
  }, [visible, safeTokens]);

  const handleTokenToggle = (tokenId: string) => {
    const updatedTokens = localTokens.map(token =>
      token.id === tokenId
        ? { ...token, selected: !token.selected }
        : token
    );
    setLocalTokens(updatedTokens);
  };

  const handleSave = () => {
    onTokensChange(localTokens);
    Alert.alert('Interests Updated', 'Your interest tokens have been saved!');
    onClose();
  };

  // Group tokens by category
  const groupedTokens = localTokens.reduce((acc, token) => {
    const category = token.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(token);
    return acc;
  }, {} as Record<string, InterestToken[]>);

  // Get category emoji (extract from first token's category or use default)
  const getCategoryEmoji = (category: string): string => {
    const categoryEmojis: Record<string, string> = {
      'Lifestyle & Vibes': '🎯',
      'Music & Audio': '🎵',
      'Social & Modern Interests': '🌍',
      'Nature & Outdoors': '🍀',
      'Food & Drinks': '🍽️',
      'Games & Hobbies': '🎮',
      'Travel & Culture': '🚗',
      'Mind & Growth': '📚',
      'Cute & Aesthetic Interests': '🎁',
      'Fitness & Health': '💪',
      'Tech & Innovation': '💻',
    };
    return categoryEmojis[category] || '📌';
  };

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
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Interests</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.description}>
              Select your interests to help others find you
            </Text>

            {/* Grouped Interest Tokens */}
            {Object.entries(groupedTokens).map(([category, tokens]) => (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
                  <Text style={styles.categoryTitle}>{category}</Text>
                </View>
                <View style={styles.tokensGrid}>
                  {tokens.map((token) => (
                    <TouchableOpacity
                      key={token.id}
                      style={[
                        styles.token,
                        token.selected && styles.tokenSelected,
                        { borderColor: token.selected ? theme.colors.primary : theme.colors.border }
                      ]}
                      onPress={() => handleTokenToggle(token.id)}
                    >
                      <Text style={styles.tokenEmoji}>{token.emoji}</Text>
                      <Text style={[
                        styles.tokenLabel,
                        token.selected && { color: theme.colors.primary }
                      ]}>
                        {token.label}
                      </Text>
                      {token.selected && (
                        <Icon name="checkmark-circle" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Interests</Text>
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
    height: '90%',
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
  cancelText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onSurfaceVariant,
  },
  title: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  saveText: {
    ...theme.typography.labelLarge,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xl,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  categoryTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  tokensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    backgroundColor: theme.colors.surfaceVariant,
    minWidth: 120,
  },
  tokenSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  tokenEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  tokenLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
});

