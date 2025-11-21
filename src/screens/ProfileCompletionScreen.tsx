import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { useAuth } from '@/store/AuthContext';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';
import { getUserCountry } from '@/utils/locationService';
import PermissionService, {
  NotificationPermissionResult,
} from '@/services/permissionService';
import messaging from '@react-native-firebase/messaging';

interface ProfileCompletionScreenProps {
  onComplete: (profileData: ProfileData) => void;
  user?: any;
  onNavigate?: (screen: string) => void;
}

interface ProfileData {
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  country: string;
  bio: string;
}

export const ProfileCompletionScreen: React.FC<
  ProfileCompletionScreenProps
> = ({ onComplete, user }) => {
  const [gender, setGender] = useState<ProfileData['gender'] | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { markProfileComplete } = useAuth();

  // Automatically detect country on mount
  useEffect(() => {
    detectCountry();
  }, []);

  const detectCountry = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    try {
      const detectedCountry = await getUserCountry();
      setCountry(detectedCountry);
      console.log('✅ Country detected:', detectedCountry);
    } catch (error) {
      console.error('❌ Country detection failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Provide user-friendly error messages
      let userMessage = 'Unable to detect your location.';
      if (errorMessage.includes('permission')) {
        userMessage = 'Location permission is required to set your country.';
      } else if (errorMessage.includes('timeout')) {
        userMessage =
          'Location detection timed out. Please check your internet connection.';
      }

      setLocationError(userMessage);

      // Show alert explaining location is required
      Alert.alert(
        '📍 Location Required',
        'Whispr needs access to your location to automatically set your country during sign-up.\n\nPlease enable location permissions in your device settings and try again.',
        [
          {
            text: 'Retry',
            onPress: () => detectCountry(),
            style: 'default',
          },
          {
            text: 'Open Settings',
            onPress: () => {
              // On Android, we can't directly open settings, but we can show instructions
              Alert.alert(
                'Enable Location',
                'Please go to:\nSettings > Apps > Whispr > Permissions > Location\n\nEnable location access and return to retry.',
                [{ text: 'OK' }],
              );
            },
            style: 'default',
          },
        ],
        { cancelable: false },
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  // Generate years (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1899 },
    (_, i) => currentYear - i,
  );

  // Generate months
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Generate days based on selected month and year
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getDays = () => {
    if (!selectedMonth || !selectedYear) return [];
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const handleComplete = async () => {
    if (
      !gender ||
      !selectedYear ||
      !selectedMonth ||
      !selectedDay ||
      !country
    ) {
      if (!country) {
        Alert.alert(
          'Location Required',
          'Your country must be detected before completing your profile. Please enable location permissions and retry.',
          [
            {
              text: 'Retry Detection',
              onPress: () => detectCountry(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
        );
      } else {
        Alert.alert(
          'Missing Information',
          'Please fill in all required fields.',
        );
      }
      return;
    }

    // Validate date
    const dateOfBirth = `${selectedYear}-${selectedMonth
      .toString()
      .padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    const birthDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const today = new Date();

    if (birthDate > today) {
      Alert.alert('Invalid Date', 'Date of birth cannot be in the future.');
      return;
    }

    const age = today.getFullYear() - selectedYear;
    if (age < 13) {
      Alert.alert(
        'Age Restriction',
        'You must be at least 13 years old to use this app.',
      );
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

      console.log('ProfileCompletionScreen - User object:', user);
      console.log('ProfileCompletionScreen - User ID:', user?.id);

      // Try different possible ID properties
      const userId = user?.id || user?.user_id || user?.uuid;
      console.log('ProfileCompletionScreen - Resolved User ID:', userId);

      if (!userId) {
        console.error(
          'ProfileCompletionScreen - No user ID found in any property',
        );
        throw new Error('No authenticated user');
      }

      const update: Record<string, any> = {
        gender: profileData.gender,
        country: profileData.country,
        bio: profileData.bio,
        profile_completed: true,
        date_of_birth: profileData.dateOfBirth,
        updated_at: new Date().toISOString(),
      };

      const ok = await FlexibleDatabaseService.updateUserProfile(
        userId,
        update,
      );
      if (!ok) {
        throw new Error('Failed to save profile');
      }

      markProfileComplete(true);

      // Request notification permission after profile completion
      // Delay to ensure location permission popup has closed
      setTimeout(async () => {
        try {
          console.log(
            '🔔 ProfileCompletionScreen: Requesting notification permission after profile completion',
          );
          const userSpecificKey = `notificationPermissionAsked_${userId}`;
          const permanentlyDeniedKey = `notificationPermanentlyDenied_${userId}`;
          const hasAskedBefore = await AsyncStorage.getItem(userSpecificKey);

          if (!hasAskedBefore) {
            // Use detailed method to get permanent denial status
            const result: NotificationPermissionResult =
              await PermissionService.requestNotificationPermissionsDetailed();

            // CRITICAL FIX #1: Always set the flag regardless of result
            // This prevents re-prompting users who explicitly denied
            await AsyncStorage.setItem(userSpecificKey, 'true');

            // CRITICAL FIX #4: Track permanent denial separately
            if (result.permanentlyDenied) {
              await AsyncStorage.setItem(permanentlyDeniedKey, 'true');
              console.log(
                '🔕 Notification permission permanently denied after profile completion',
              );
            }

            if (result.granted) {
              console.log(
                '✅ Notification permission granted after profile completion',
              );

              // CRITICAL FIX #2: Save FCM token immediately when granted
              try {
                const token = await messaging().getToken();
                console.log('🔑 FCM Token:', token);

                const { fcmManager } = await import('@/services/FCMManager');
                await fcmManager.initialize(userId);
                console.log(
                  '✅ FCM token saved via FCMManager after profile completion',
                );
              } catch (fcmError) {
                console.warn(
                  '⚠️ Failed to save FCM token after profile completion:',
                  fcmError,
                );
              }
            } else {
              console.log(
                '🚫 Notification permission denied after profile completion',
              );
            }
          } else {
            console.log(
              '🔔 Notification permission already asked for this user',
            );
          }
        } catch (error) {
          console.error('❌ Error requesting notification permission:', error);
        }
      }, 2000);

      onComplete(profileData);
    } catch (error) {
      console.error('Profile completion error:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Help others get to know you better</Text>
      </View>

      <View style={styles.form}>
        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={value => setGender(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value={null} />
              {genderOptions.map(option => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.section}>
          <Text style={styles.label}>Date of Birth *</Text>
          <View style={styles.dateContainer}>
            {/* Year Picker */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Year</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={value => setSelectedYear(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Year" value={null} />
                  {years.map(year => (
                    <Picker.Item
                      key={year}
                      label={year.toString()}
                      value={year}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Month Picker */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Month</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={value => setSelectedMonth(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Month" value={null} />
                  {months.map(month => (
                    <Picker.Item
                      key={month.value}
                      label={month.label}
                      value={month.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Day Picker */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>Day</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={value => setSelectedDay(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Day" value={null} />
                  {getDays().map(day => (
                    <Picker.Item key={day} label={day.toString()} value={day} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Country Selection - Auto-detected */}
        <View style={styles.section}>
          <Text style={styles.label}>Country *</Text>
          {isDetectingLocation ? (
            <View style={styles.countryDetectingContainer}>
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.countryDetectingText}>
                Detecting your location...
              </Text>
            </View>
          ) : country ? (
            <View style={styles.countryDetectedContainer}>
              <View style={styles.countryDisplay}>
                <Icon
                  name="location"
                  size={20}
                  color={theme.colors.primary}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.countryDetectedText}>{country}</Text>
                <Icon
                  name="checkmark-circle"
                  size={20}
                  color="#10b981"
                  style={{ marginLeft: spacing.sm }}
                />
              </View>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={detectCountry}
                disabled={isDetectingLocation}
              >
                <Icon
                  name="refresh"
                  size={16}
                  color={theme.colors.primary}
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.countryErrorContainer}>
              <View style={styles.countryErrorDisplay}>
                <Icon
                  name="location-outline"
                  size={20}
                  color="#ef4444"
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.countryErrorText}>
                  {locationError || 'Location not detected'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.retryButtonError}
                onPress={detectCountry}
                disabled={isDetectingLocation}
              >
                <Icon
                  name="refresh"
                  size={16}
                  color="#ef4444"
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={styles.retryButtonTextError}>Retry Detection</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.countryHint}>
            Your country is automatically detected based on your location.
            Location permission is required.
          </Text>
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
  pickerContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  picker: {
    height: 50,
    color: theme.colors.onBackground,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  datePickerContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onBackground,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  countryDetectingContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 50,
  },
  countryDetectingText: {
    fontSize: 16,
    color: theme.colors.onBackground,
  },
  countryDetectedContainer: {
    gap: spacing.sm,
  },
  countryDisplay: {
    backgroundColor: '#f0fdf4',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    minHeight: 50,
  },
  countryDetectedText: {
    fontSize: 16,
    color: theme.colors.onBackground,
    fontWeight: '600',
    flex: 1,
  },
  countryErrorContainer: {
    gap: spacing.sm,
  },
  countryErrorDisplay: {
    backgroundColor: '#fef2f2',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
    minHeight: 50,
  },
  countryErrorText: {
    fontSize: 16,
    color: '#ef4444',
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#f0f9ff',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  retryButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#fef2f2',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  retryButtonTextError: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  countryHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onBackground,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: spacing.xl,
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
});

export default ProfileCompletionScreen;
