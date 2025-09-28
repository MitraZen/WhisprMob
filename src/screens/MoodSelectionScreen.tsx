import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '@/store/AuthContext';
import { theme, moodConfig, spacing, borderRadius } from '@/utils/theme';
import { MoodType } from '@/types';

const MoodSelectionScreen: React.FC = () => {
  const { login } = useAuth();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
  };

  const handleContinue = async () => {
    if (!selectedMood) {
      Alert.alert('Please select a mood', 'Choose how you\'re feeling to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await login(selectedMood);
      // Navigation will be handled automatically by the auth state change
    } catch (error) {
      Alert.alert('Error', 'Failed to start your anonymous session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const moods = Object.entries(moodConfig) as [MoodType, typeof moodConfig[MoodType]][];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>How are you feeling right now?</Text>
          <Text style={styles.subtitle}>
            This helps us connect you with others who share similar emotions
          </Text>
        </View>

        <View style={styles.moodsGrid}>
          {moods.map(([mood, config]) => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.moodCard,
                selectedMood === mood && styles.selectedMoodCard,
              ]}
              onPress={() => handleMoodSelect(mood)}
            >
              <Text style={styles.moodEmoji}>{config.emoji}</Text>
              <Text style={[
                styles.moodName,
                selectedMood === mood && styles.selectedMoodName,
              ]}>
                {mood.charAt(0).toUpperCase() + mood.slice(1)}
              </Text>
              <Text style={[
                styles.moodDescription,
                selectedMood === mood && styles.selectedMoodDescription,
              ]}>
                {config.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedMood || isLoading) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!selectedMood || isLoading}
        >
          <Text style={[
            styles.continueButtonText,
            (!selectedMood || isLoading) && styles.disabledButtonText,
          ]}>
            {isLoading ? 'Starting...' : 'Continue Anonymously'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    lineHeight: 22,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  moodCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedMoodCard: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  moodName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  selectedMoodName: {
    color: theme.colors.primary,
  },
  moodDescription: {
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedMoodDescription: {
    color: theme.colors.primary,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  disabledButton: {
    backgroundColor: theme.colors.outline,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButtonText: {
    color: theme.colors.onSurface,
  },
});

export default MoodSelectionScreen;


