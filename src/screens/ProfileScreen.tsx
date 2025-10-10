import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput, Modal, Animated, Dimensions, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { MoodType } from '@/types';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService } from '@/services/buddiesService';
import { useAuth } from '@/store/AuthContext';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, user }) => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  
  // Animation values for form inputs
  const [showMoodModal, setShowMoodModal] = useState(false);
  
  const styles = createStyles(theme);
  
  
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: 'Anonymous User',
    username: '@anonymous',
    bio: 'No bio yet',
    age: 'Not specified',
    location: 'Not specified',
    gender: 'Not specified',
    mood: 'happy',
    joinDate: new Date(),
    dateOfBirth: null as Date | null,
  });
  const [userStats, setUserStats] = useState({
    messagesSent: 0,
    buddiesCount: 0,
    notesShared: 0,
  });
  const [originalProfileData, setOriginalProfileData] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);

  useEffect(() => {
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await BuddiesService.getUserProfile(user.id);
      const stats = await BuddiesService.getUserStats(user.id);
      
      if (profile) {
        const ageDisplay = profile.age ? calculateAge(new Date(profile.age)) : 'Not specified';
        const genderDisplay = profile.gender ? formatGender(profile.gender) : 'Not specified';
        
        setProfileData({
          displayName: profile.username || profile.anonymous_id || 'Anonymous User',
          username: profile.username || `@${profile.anonymous_id || 'anonymous'}`,
          bio: profile.bio || 'No bio yet',
          age: ageDisplay,
          location: profile.country || profile.location || 'Not specified',
          gender: genderDisplay,
          mood: profile.mood || 'happy',
          joinDate: new Date(profile.created_at),
        });
        
        setUserStats({
          messagesSent: stats.messagesSent || 0,
          buddiesCount: stats.buddiesCount || 0,
          notesShared: stats.notesShared || 0,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const formatGender = (gender: string): string => {
    const genderMap: { [key: string]: string } = {
      'male': 'Male',
      'female': 'Female',
      'other': 'Other',
    };
    return genderMap[gender.toLowerCase()] || gender;
  };


  const handleDeleteAccount = () => {
    setShowDeleteDropdown(true);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data, messages, and connections.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowDeleteDropdown(false) },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await BuddiesService.deleteUserAccount(user.id);
              await logout();
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setIsLoading(false);
              setShowDeleteDropdown(false);
            }
          }
        },
      ]
    );
  };

  const formatJoinDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate age from date of birth
  const calculateAge = (dob: Date): string => {
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      return `${age - 1} years old`;
    }
    return `${age} years old`;
  };



  const getMoodGradient = (mood: string) => {
    const moodConfig = getMoodConfig(mood);
    return (moodConfig as any).gradient || ['#667eea', '#764ba2'];
  };

  const handleEditProfile = () => {
    setOriginalProfileData(profileData);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Update profile in database - only include fields that exist
      const updateData: any = {
        mood: profileData.mood,
        updated_at: new Date().toISOString(),
      };
      
      // Only add fields if they have values (to avoid null errors)
      if (profileData.displayName && profileData.displayName !== 'Anonymous User') {
        updateData.username = profileData.displayName;
      }
      if (profileData.username && profileData.username !== '@anonymous') {
        updateData.username = profileData.username;
      }
      if (profileData.bio && profileData.bio !== 'No bio yet') {
        updateData.bio = profileData.bio;
      }
      if (profileData.age && profileData.age !== 'Not specified') {
        updateData.age = profileData.age;
      }
      if (profileData.location && profileData.location !== 'Not specified') {
        updateData.location = profileData.location;
      }
      if (profileData.gender && profileData.gender !== 'Not specified') {
        // Convert display gender back to database value
        const genderMap: { [key: string]: string } = {
          'Male': 'male',
          'Female': 'female',
          'Other': 'other',
        };
        updateData.gender = genderMap[profileData.gender] || profileData.gender.toLowerCase();
      }

      await BuddiesService.updateUserProfile(user.id, updateData);
      
      setShowEditModal(false);
      setOriginalProfileData(profileData);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (originalProfileData) {
      setProfileData(originalProfileData);
    }
    setShowEditModal(false);
    setShowGenderDropdown(false);
    setShowDatePicker(false);
  };

  const handleTextChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenderSelect = (gender: string) => {
    setProfileData(prev => ({ ...prev, gender }));
    setShowGenderDropdown(false);
  };

  const handleDateSelect = () => {
    const age = calculateAge(selectedDate);
    setProfileData(prev => ({ ...prev, age, dateOfBirth: selectedDate }));
    setShowDatePicker(false);
  };

  const handleGetLocation = async () => {
    try {
      // This would integrate with actual location services
      // For now, we'll show a placeholder
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


  const profileOptions = [
    {
      id: 'edit',
      title: 'Edit Profile',
      subtitle: 'Update your bio, age, location, and gender',
      icon: 'create-outline',
      onPress: handleEditProfile,
      color: '#7c3aed'
    },
    {
      id: 'mood',
      title: 'Change Mood',
      subtitle: `${getMoodConfig(profileData.mood).description}`,
      icon: 'happy-outline',
      onPress: () => setShowMoodModal(true),
      color: '#059669'
    },
    {
      id: 'stats',
      title: 'View Statistics',
      subtitle: `${userStats.messagesSent} messages, ${userStats.buddiesCount} buddies`,
      icon: 'stats-chart-outline',
      onPress: () => {}, // Could navigate to detailed stats
      color: '#0891b2'
    },
    {
      id: 'delete',
      title: 'Delete Account',
      subtitle: 'Permanently delete your account',
      icon: 'trash-outline',
      onPress: handleDeleteAccount,
      color: '#ef4444'
    }
  ];

  return (
    <Animated.View 
      style={[styles.container, { opacity: fadeAnim }]}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('settingsHub')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Profile Info Section */}
        <Animated.View 
          style={[
            styles.profileSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profileData.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{profileData.displayName}</Text>
          <Text style={styles.username}>{profileData.username}</Text>
          <TouchableOpacity 
            style={styles.moodButton}
            onPress={() => setShowMoodModal(true)}
          >
            <Text style={styles.moodEmoji}>
              {getMoodConfig(profileData.mood).emoji}
            </Text>
            <Text style={styles.moodText}>
              {getMoodConfig(profileData.mood).description}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View 
          style={[
            styles.statsContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💬</Text>
            <Text style={styles.statNumber}>{userStats.messagesSent}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statNumber}>{userStats.buddiesCount}</Text>
            <Text style={styles.statLabel}>Buddies</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statNumber}>{userStats.notesShared}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
        </Animated.View>

        {/* Profile Options */}
        <Animated.View 
          style={[
            styles.optionsContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {profileOptions.map((option, index) => (
            <View key={option.id}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  index === profileOptions.length - 1 && styles.lastOptionCard
                ]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                    <Icon 
                      name={option.icon} 
                      size={24} 
                      color={option.color} 
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  <Icon 
                    name="chevron-forward" 
                    size={20} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                </View>
              </TouchableOpacity>
              
              {/* Delete Account Confirmation Dropdown */}
              {option.id === 'delete' && showDeleteDropdown && (
                <View style={styles.deleteDropdown}>
                  <View style={styles.deleteDropdownContent}>
                    <View style={styles.deleteWarningHeader}>
                      <Icon name="warning" size={24} color="#ef4444" />
                      <Text style={styles.deleteWarningTitle}>Confirm Account Deletion</Text>
                    </View>
                    <Text style={styles.deleteWarningText}>
                      This action cannot be undone. All your data, messages, and connections will be permanently deleted.
                    </Text>
                    <View style={styles.deleteDropdownActions}>
                      <TouchableOpacity 
                        style={styles.deleteCancelButton}
                        onPress={() => setShowDeleteDropdown(false)}
                      >
                        <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deleteConfirmButton}
                        onPress={confirmDeleteAccount}
                        disabled={isLoading}
                      >
                        <Text style={styles.deleteConfirmButtonText}>
                          {isLoading ? 'Deleting...' : 'Delete Account'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}
        </Animated.View>


      </ScrollView>

      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="profile" onNavigate={onNavigate} />

      {/* Mood Selection Modal */}
      <Modal
        visible={showMoodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Mood</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowMoodModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.moodGrid}>
              {Object.entries(moodConfig).map(([mood, config]) => (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.moodOption,
                    profileData.mood === mood && styles.selectedMoodOption
                  ]}
                  onPress={() => {
                    setProfileData(prev => ({ ...prev, mood }));
                    setShowMoodModal(false);
                  }}
                >
                  <Text style={styles.moodOptionEmoji}>{config.emoji}</Text>
                  <Text style={styles.moodOptionText}>{config.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={handleCancelEdit}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
              {/* Bio Section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Bio</Text>
                <TextInput
                  style={styles.editTextInput}
                  value={profileData.bio}
                  onChangeText={(value) => handleTextChange('bio', value)}
                  multiline
                  numberOfLines={4}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Age Section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Date of Birth</Text>
                <TouchableOpacity 
                  style={styles.editSelectButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.editSelectButtonText}>
                    {profileData.dateOfBirth ? 
                      profileData.dateOfBirth.toLocaleDateString() : 
                      'Select Date of Birth'
                    }
                  </Text>
                  <Icon name="calendar" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                {profileData.age && (
                  <Text style={styles.ageDisplay}>Age: {profileData.age}</Text>
                )}
              </View>

              {/* Location Section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Location</Text>
                <TouchableOpacity 
                  style={styles.editSelectButton}
                  onPress={handleGetLocation}
                >
                  <Text style={styles.editSelectButtonText}>
                    {profileData.location === 'Not specified' ? 
                      'Get Current Location' : 
                      profileData.location
                    }
                  </Text>
                  <Icon name="location" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.locationHint}>
                  Location is automatically detected for security
                </Text>
              </View>

              {/* Gender Section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Gender</Text>
                <View style={styles.genderEditContainer}>
                  {showGenderDropdown ? (
                    <View style={styles.genderEditDropdown}>
                      {['Male', 'Female', 'Other'].map((gender) => (
                        <TouchableOpacity
                          key={gender}
                          style={[
                            styles.genderEditOption,
                            profileData.gender === gender && styles.selectedGenderEditOption
                          ]}
                          onPress={() => handleGenderSelect(gender)}
                        >
                          <Text style={[
                            styles.genderEditOptionText,
                            profileData.gender === gender && styles.selectedGenderEditOptionText
                          ]}>
                            {gender}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editSelectButton}
                      onPress={() => setShowGenderDropdown(true)}
                    >
                      <Text style={styles.editSelectButtonText}>
                        {profileData.gender === 'Not specified' ? 
                          'Select Gender' : 
                          profileData.gender
                        }
                      </Text>
                      <Icon name="chevron-down" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Joined Date Section */}
              <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Member Since</Text>
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
            
            <View style={styles.editModalActions}>
              <TouchableOpacity 
                style={styles.editCancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.editCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editSaveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                <Text style={styles.editSaveButtonText}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  if (event.type === 'set' && date) {
                    setSelectedDate(date);
                    // Auto-close after selection
                    setTimeout(() => {
                      handleDateSelect();
                    }, 100);
                  } else if (event.type === 'dismissed') {
                    setShowDatePicker(false);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            </View>
            
            <View style={styles.editModalActions}>
              <TouchableOpacity 
                style={styles.editCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.editCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editSaveButton}
                onPress={handleDateSelect}
              >
                <Text style={styles.editSaveButtonText}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Space for navigation menu
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
    width: 40, // Same width as back button to center the title
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  username: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  moodText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statNumber: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  optionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  optionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  lastOptionCard: {
    marginBottom: 0,
  },
  deleteDropdown: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#ef444420',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteDropdownContent: {
    padding: spacing.lg,
  },
  deleteWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  deleteWarningTitle: {
    ...theme.typography.titleMedium,
    color: '#ef4444',
    fontWeight: '600',
  },
  deleteWarningText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  deleteDropdownActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    ...theme.typography.labelLarge,
    color: '#ffffff',
    fontWeight: '600',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  optionSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    ...theme.typography.bodyMedium,
    color: '#fff',
    fontWeight: '600',
  },
  saveButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    ...theme.typography.bodyMedium,
    color: '#fff',
    fontWeight: '600',
  },
  editInput: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  moodGrid: {
    padding: spacing.lg,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  selectedMoodOption: {
    backgroundColor: theme.colors.primary + '15',
  },
  moodOptionEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  moodOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
  },
  genderOptions: {
    padding: spacing.lg,
  },
  genderOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  selectedGenderOption: {
    backgroundColor: theme.colors.primary + '15',
  },
  genderOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
  },
  selectedGenderOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Edit Modal Styles
  editModalContent: {
    backgroundColor: theme.colors.surface,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    maxHeight: '90%',
    flex: 1,
  },
  editForm: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  editSection: {
    marginBottom: spacing.xl,
  },
  editSectionTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  editTextInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  editSelectButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    flex: 1,
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
  genderEditContainer: {
    position: 'relative',
  },
  genderEditDropdown: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  genderEditOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedGenderEditOption: {
    backgroundColor: theme.colors.primary + '15',
  },
  genderEditOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
  },
  selectedGenderEditOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  editModalActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: spacing.md,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  editCancelButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  editSaveButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  datePickerModal: {
    backgroundColor: theme.colors.surface,
    margin: spacing.xl,
    borderRadius: borderRadius.lg,
    maxHeight: '80%',
  },
  datePickerContainer: {
    padding: spacing.lg,
    alignItems: 'center',
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
  countryList: {
    maxHeight: 400,
    padding: spacing.lg,
  },
  countryOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  selectedCountryOption: {
    backgroundColor: theme.colors.primary + '15',
  },
  countryOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
  },
});

export default ProfileScreen;