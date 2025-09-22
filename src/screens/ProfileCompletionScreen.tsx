import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { useAuth } from '@/store/AuthContext';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';

interface ProfileCompletionScreenProps {
  onComplete: (profileData: ProfileData) => void;
  onSkip: () => void;
}

interface ProfileData {
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  dateOfBirth: string;
  country: string;
  bio: string;
}

export const ProfileCompletionScreen: React.FC<ProfileCompletionScreenProps> = ({ onComplete, onSkip }) => {
  const [gender, setGender] = useState<ProfileData['gender'] | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, markProfileComplete } = useAuth();

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ];

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'India', 'Brazil', 'Mexico'
  ];

  const handleComplete = async () => {
    if (!gender || !dateOfBirth || !country) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const profileData: ProfileData = {
        gender,
        dateOfBirth,
        country,
        bio: bio.trim(),
      };
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Try to persist fields based on common column names
      const update: Record<string, any> = {
        gender: profileData.gender,
        country: profileData.country,
        bio: profileData.bio,
        profile_completed: true,
      };
      // map dateOfBirth to likely column names
      update['date_of_birth'] = profileData.dateOfBirth;

      const ok = await FlexibleDatabaseService.updateUserProfile(user.id, update);
      if (!ok) {
        throw new Error('Failed to save profile');
      }

      markProfileComplete(true);
      onComplete(profileData);
    } catch (error) {
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Help others get to know you better</Text>
      </View>

      <View style={styles.form}>
        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderGrid}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderButton,
                  gender === option.value && styles.selectedGenderButton,
                ]}
                onPress={() => setGender(option.value as ProfileData['gender'])}
                disabled={isLoading}
              >
                <Text style={[
                  styles.genderButtonText,
                  gender === option.value && styles.selectedGenderButtonText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.section}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        {/* Country Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Country *</Text>
          <ScrollView style={styles.countryList} nestedScrollEnabled>
            {countries.map((countryName) => (
              <TouchableOpacity
                key={countryName}
                style={[
                  styles.countryButton,
                  country === countryName && styles.selectedCountryButton,
                ]}
                onPress={() => setCountry(countryName)}
                disabled={isLoading}
              >
                <Text style={[
                  styles.countryButtonText,
                  country === countryName && styles.selectedCountryButtonText,
                ]}>
                  {countryName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>Bio (Optional)</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#9ca3af"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isLoading}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.completeButtonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: spacing.md,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGenderButton: {
    backgroundColor: '#dbeafe',
    borderColor: theme.colors.primary,
  },
  genderButtonText: {
    fontSize: 14,
    color: theme.colors.onBackground,
    fontWeight: '500',
  },
  selectedGenderButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  countryList: {
    maxHeight: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  countryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  selectedCountryButton: {
    backgroundColor: theme.colors.primary,
  },
  countryButtonText: {
    fontSize: 14,
    color: theme.colors.onBackground,
  },
  selectedCountryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileCompletionScreen;

