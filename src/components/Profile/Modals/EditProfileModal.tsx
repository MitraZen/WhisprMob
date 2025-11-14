/**
 * Edit Profile Modal Component
 * Modal for editing profile information (bio, age, location, gender, date of birth)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ProfileData } from '@/types/profile.types';
import { GENDER_OPTIONS } from '@/config/profile.config';
import { calculateAge } from '@/utils/profile.utils';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profileData: ProfileData;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
  onCancel: () => void;
  theme: any;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  profileData,
  onSave,
  onCancel,
  theme,
}) => {
  const styles = createStyles(theme);
  
  const [editedData, setEditedData] = useState<Partial<ProfileData>>({
    username: profileData.username,
    bio: profileData.bio,
    location: profileData.location,
    gender: profileData.gender,
    dateOfBirth: profileData.dateOfBirth,
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    profileData.dateOfBirth || new Date(2000, 0, 1)
  );
  const [isLoading, setIsLoading] = useState(false);

  // Reset edited data when modal opens/closes or profileData changes
  useEffect(() => {
    if (visible) {
      setEditedData({
        username: profileData.username,
        bio: profileData.bio,
        location: profileData.location,
        gender: profileData.gender,
        dateOfBirth: profileData.dateOfBirth,
      });
      setSelectedDate(profileData.dateOfBirth || new Date(2000, 0, 1));
    }
  }, [visible, profileData]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Don't allow username changes - remove it from the data to save
      const dataToSave = { ...editedData };
      delete dataToSave.username; // Remove username from save data
      
      await onSave(dataToSave);
      Alert.alert('Success', 'Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      username: profileData.username,
      bio: profileData.bio,
      location: profileData.location,
      gender: profileData.gender,
      dateOfBirth: profileData.dateOfBirth,
    });
    setShowDatePicker(false);
    setShowGenderPicker(false);
    onCancel();
    onClose();
  };

  const handleTextChange = (field: keyof ProfileData, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') {
        return;
      }
    }
    if (date) {
      setSelectedDate(date);
      const age = calculateAge(date);
      setEditedData(prev => ({ 
        ...prev, 
        dateOfBirth: date,
        age: age,
      }));
      if (Platform.OS === 'android') {
        // On Android, date is selected immediately
      }
    }
  };

  const handleDateSelect = () => {
    if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const age = calculateAge(selectedDate);
      setEditedData(prev => ({ 
        ...prev, 
        dateOfBirth: selectedDate,
        age: age,
      }));
    }
    setShowDatePicker(false);
  };

  const handleGenderSelect = (gender: string) => {
    setEditedData(prev => ({ ...prev, gender }));
    setShowGenderPicker(false);
  };

  const handleGetLocation = async () => {
    try {
      // This would integrate with actual location services
      Alert.alert(
        'Location Services',
        'Location services will be integrated here. This will automatically detect your current location.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Unable to get your location. Please try again.');
    }
  };

  const formatJoinDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Username */}
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={editedData.username}
                placeholder="Username"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                editable={false}
              />
              <Text style={styles.disabledHint}>
                Username cannot be changed
              </Text>
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedData.bio}
                onChangeText={(value) => handleTextChange('bio', value)}
                placeholder="Tell us about yourself"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Location */}
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={handleGetLocation}
              >
                <Text style={styles.dateText}>
                  {editedData.location === 'Not specified' 
                    ? 'Get Current Location' 
                    : editedData.location}
                </Text>
                <Icon name="location" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.locationHint}>
                Location is automatically detected for security
              </Text>
            </View>

            {/* Date of Birth */}
            <View style={styles.field}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {editedData.dateOfBirth
                    ? editedData.dateOfBirth.toLocaleDateString()
                    : 'Select Date of Birth'}
                </Text>
                <Icon name="calendar" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              {editedData.dateOfBirth && (
                <Text style={styles.ageDisplay}>
                  Age: {calculateAge(editedData.dateOfBirth)}
                </Text>
              )}
              {showDatePicker && (
                <>
                  {Platform.OS === 'ios' ? (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                      />
                      <View style={styles.datePickerActions}>
                        <TouchableOpacity
                          style={styles.datePickerCancelButton}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.datePickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.datePickerSelectButton}
                          onPress={handleDateSelect}
                        >
                          <Text style={styles.datePickerSelectText}>Select</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                    />
                  )}
                </>
              )}
            </View>

            {/* Gender */}
            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              {showGenderPicker ? (
                <View style={styles.pickerOptions}>
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        editedData.gender === option.value && styles.pickerOptionSelected
                      ]}
                      onPress={() => handleGenderSelect(option.value)}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        editedData.gender === option.value && styles.pickerOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowGenderPicker(true)}
                >
                  <Text style={styles.pickerText}>
                    {editedData.gender === 'Not specified' 
                      ? 'Select Gender' 
                      : GENDER_OPTIONS.find(g => g.value === editedData.gender)?.label || editedData.gender}
                  </Text>
                  <Icon name="chevron-down" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Joined Date Section */}
            <View style={styles.field}>
              <Text style={styles.label}>Member Since</Text>
              <View style={styles.joinedDateContainer}>
                <Icon name="calendar-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.joinedDateText}>
                  {formatJoinDate(profileData.joinDate)}
                </Text>
              </View>
              <Text style={styles.joinedDateHint}>
                This date cannot be changed
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
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
    maxHeight: '90%',
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
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputDisabled: {
    backgroundColor: theme.colors.surface,
    opacity: 0.6,
  },
  disabledHint: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  pickerOptions: {
    marginTop: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerOptionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  pickerOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  ageDisplay: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  locationHint: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  datePickerContainer: {
    marginTop: spacing.sm,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  datePickerCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  datePickerCancelText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onSurfaceVariant,
  },
  datePickerSelectButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  datePickerSelectText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  joinedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  joinedDateText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    marginLeft: spacing.sm,
    flex: 1,
  },
  joinedDateHint: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});

