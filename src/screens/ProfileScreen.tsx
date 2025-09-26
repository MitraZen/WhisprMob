import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { theme, spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/theme';
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
  // Comprehensive list of countries
  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
    'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia',
    'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland',
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg',
    'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan',
    'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Singapore',
    'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
    'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam'
  ];
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState({
    displayName: 'Anonymous User',
    username: '@anonymous',
    bio: 'No bio yet',
    age: 'Not specified',
    location: 'Not specified',
    gender: 'Not specified',
    mood: 'happy',
    joinDate: new Date(),
  });
  const [userStats, setUserStats] = useState({
    messagesSent: 0,
    buddiesCount: 0,
    notesShared: 0,
  });
  const [originalProfileData, setOriginalProfileData] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Load profile data from database
  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  // Refresh profile data when component comes into focus
  useEffect(() => {
    const refreshProfile = () => {
      if (user?.id) {
        loadProfileData();
      }
    };

    // Refresh profile data every time the component mounts
    refreshProfile();
  }, []);

  const loadProfileData = async () => {
    setIsLoadingProfile(true);
    try {
      // Load user profile from database
      const profile = await BuddiesService.getUserProfile(user.id);
      
      // Load user statistics
      const stats = await BuddiesService.getUserStats(user.id);
      
      if (profile) {
        // Calculate age from date_of_birth if available
        let ageDisplay = 'Not specified';
        if (profile.date_of_birth) {
          try {
            const birthDate = new Date(profile.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            ageDisplay = `${age} years old`;
          } catch (error) {
            console.error('Error calculating age:', error);
          }
        } else if (profile.age) {
          ageDisplay = profile.age;
        }

        // Format gender display
        const formatGender = (gender: string) => {
          switch (gender) {
            case 'male': return 'Male';
            case 'female': return 'Female';
            case 'other': return 'Other';
            default: return 'Not specified';
          }
        };

        const profileData = {
            displayName: profile.username || profile.anonymous_id || 'Anonymous User',
          username: profile.username || `@${profile.anonymous_id || 'anonymous'}`,
          bio: profile.bio || 'No bio yet',
          age: ageDisplay,
          location: profile.country || profile.location || 'Not specified',
          gender: formatGender(profile.gender),
          mood: profile.mood || 'happy',
          joinDate: new Date(profile.created_at),
        };
        
        setProfileData(profileData);
        setOriginalProfileData(profileData);
      } else {
        // Set default profile if none exists
        const defaultProfile = {
          displayName: user.anonymousId || 'Anonymous User',
          username: `@${user.anonymousId || 'anonymous'}`,
          bio: 'No bio yet',
          age: 'Not specified',
          location: 'Not specified',
          gender: 'Not specified',
          mood: user.mood || 'happy',
          joinDate: new Date(),
        };
        setProfileData(defaultProfile);
        setOriginalProfileData(null);
      }
      
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Set default profile on error
      const defaultProfile = {
        displayName: user.anonymousId || 'Anonymous User',
        username: `@${user.anonymousId || 'anonymous'}`,
        bio: 'No bio yet',
        age: 'Not specified',
        location: 'Not specified',
        gender: 'Not specified',
        mood: user.mood || 'happy',
        joinDate: new Date(),
      };
      setProfileData(defaultProfile);
      setOriginalProfileData(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
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
      
      console.log('Updating profile with data:', updateData);
      
      try {
        await BuddiesService.updateUserProfile(user.id, updateData);
        setIsEditing(false);
        setOriginalProfileData({ ...profileData });
        Alert.alert('Success', 'Profile updated successfully!');
      } catch (dbError: any) {
        console.error('Database update error:', dbError);
        
        // Check if it's a column missing error
        if (dbError.message && dbError.message.includes('Could not find the') && dbError.message.includes('column')) {
          Alert.alert(
            'Database Setup Required', 
            'The database needs to be updated with new columns. Please run the SQL script in Supabase:\n\n1. Open Supabase Dashboard\n2. Go to SQL Editor\n3. Run the complete-profile-schema.sql script\n\nThis will add the missing columns to the user_profiles table.',
            [
              { text: 'OK', style: 'default' },
              { text: 'Continue Anyway', style: 'cancel', onPress: () => {
                setIsEditing(false);
                setOriginalProfileData({ ...profileData });
              }}
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to update profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original data
    if (originalProfileData) {
      setProfileData({ ...originalProfileData });
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete all your data, messages, and connections. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('=== PROFILE SCREEN: Starting account deletion ===');
              console.log('User object:', user);
              console.log('User ID:', user?.id);
              
              if (!user?.id) {
                throw new Error('User ID not found. Please sign in again.');
              }
              
              // Delete the user account and all associated data
              console.log('Calling BuddiesService.deleteUserAccount...');
              const deleteResult = await BuddiesService.deleteUserAccount(user.id);
              console.log('Delete result:', deleteResult);
              
              if (deleteResult) {
                console.log('Account deleted successfully, logging out...');
                
                // Logout the user
                await logout();
                
                Alert.alert(
                  'Account Deleted', 
                  'Your account and all associated data have been permanently deleted.',
                  [
                    { 
                      text: 'OK', 
                      onPress: () => onNavigate('welcome') 
                    }
                  ]
                );
              } else {
                throw new Error('Account deletion returned false');
              }
            } catch (error) {
              console.error('=== PROFILE SCREEN: Error deleting account ===');
              console.error('Error details:', error);
              console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
              setIsLoading(false);
              Alert.alert(
                'Deletion Failed', 
                `Failed to delete your account: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the problem persists.`,
                [{ text: 'OK' }]
              );
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

  // Handle field editing
  const handleFieldEdit = (field: string) => {
    setEditingField(field);
    if (field === 'gender') {
      setShowGenderModal(true);
    } else if (field === 'age') {
      setShowDateModal(true);
    } else if (field === 'location') {
      setShowCountryModal(true);
    }
  };

  // Handle text input change
  const handleTextChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  // Handle gender selection
  const handleGenderSelect = (gender: string) => {
    // Convert database value to display value
    const genderMap: { [key: string]: string } = {
      'male': 'Male',
      'female': 'Female',
      'other': 'Other',
    };
    const displayGender = genderMap[gender] || gender;
    setProfileData(prev => ({ ...prev, gender: displayGender }));
    setShowGenderModal(false);
    setEditingField(null);
  };

  // Handle date selection
  const handleDateSelect = () => {
    const age = calculateAge(selectedDate);
    setProfileData(prev => ({ ...prev, age }));
    setShowDateModal(false);
    setEditingField(null);
  };

  // Handle country selection
  const handleCountrySelect = (country: string) => {
    setProfileData(prev => ({ ...prev, location: country }));
    setShowCountryModal(false);
    setEditingField(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {isLoadingProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('notes')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Manage your account and preferences</Text>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('notes')}
          >
            <Text style={styles.navButtonText}>📝 Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('buddies')}
          >
            <Text style={styles.navButtonText}>👥 Buddies</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, styles.activeNavButton]}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.activeNavButtonText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('settings')}
          >
            <Text style={styles.navButtonText}>⚙️ Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profileData.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{profileData.displayName}</Text>
            <Text style={styles.username}>{profileData.username}</Text>
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>
                {getMoodConfig(profileData.mood).emoji}
              </Text>
              <Text style={styles.moodText}>
                {getMoodConfig(profileData.mood).description}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bio</Text>
            {isEditing && editingField === 'bio' ? (
              <TextInput
                style={styles.editInput}
                value={profileData.bio}
                onChangeText={(value) => handleTextChange('bio', value)}
                multiline
                placeholder="Enter your bio..."
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <TouchableOpacity 
                style={styles.detailValueContainer}
                onPress={() => isEditing && handleFieldEdit('bio')}
              >
                <Text style={styles.detailValue}>{profileData.bio}</Text>
                {isEditing && <Text style={styles.editHint}>Tap to edit</Text>}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Age</Text>
            {isEditing && editingField === 'age' ? (
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDateModal(true)}
              >
                <Text style={styles.dateButtonText}>
                  Select Date of Birth
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.detailValueContainer}
                onPress={() => isEditing && handleFieldEdit('age')}
              >
                <Text style={styles.detailValue}>{profileData.age}</Text>
                {isEditing && <Text style={styles.editHint}>Tap to edit</Text>}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            {isEditing && editingField === 'location' ? (
              <TouchableOpacity 
                style={styles.countryButton}
                onPress={() => setShowCountryModal(true)}
              >
                <Text style={styles.countryButtonText}>
                  Select Country
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.detailValueContainer}
                onPress={() => isEditing && handleFieldEdit('location')}
              >
                <Text style={styles.detailValue}>{profileData.location}</Text>
                {isEditing && <Text style={styles.editHint}>Tap to edit</Text>}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender</Text>
            {isEditing && editingField === 'gender' ? (
              <TouchableOpacity 
                style={styles.editInput}
                onPress={() => setShowGenderModal(true)}
              >
                <Text style={styles.editInputText}>{profileData.gender}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.detailValueContainer}
                onPress={() => isEditing && handleFieldEdit('gender')}
              >
                <Text style={styles.detailValue}>{profileData.gender}</Text>
                {isEditing && <Text style={styles.editHint}>Tap to edit</Text>}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Joined</Text>
            <Text style={styles.detailValue}>{formatJoinDate(profileData.joinDate)}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {!isEditing ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Your Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.messagesSent}</Text>
            <Text style={styles.statLabel}>Messages Sent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.buddiesCount}</Text>
            <Text style={styles.statLabel}>Buddies</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.notesShared}</Text>
            <Text style={styles.statLabel}>Notes Shared</Text>
          </View>
        </View>
        </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity 
          style={[styles.deleteButton, isLoading && styles.deleteButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          )}
          </TouchableOpacity>
          
        </View>
      
        {/* Bottom Navigation Menu */}
        <NavigationMenu currentScreen="profile" onNavigate={onNavigate} />
        </>
      )}

      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContent}>
            <Text style={styles.modalTitle}>Select Date of Birth</Text>
            
            {/* Custom Date Picker */}
            <View style={styles.datePickerContainer}>
              {/* Year Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Year</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 100 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerOption,
                          selectedDate.getFullYear() === year && styles.datePickerOptionSelected
                        ]}
                        onPress={() => setSelectedDate(new Date(year, selectedDate.getMonth(), selectedDate.getDate()))}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          selectedDate.getFullYear() === year && styles.datePickerOptionTextSelected
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              {/* Month Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Month</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerOption,
                        selectedDate.getMonth() === index && styles.datePickerOptionSelected
                      ]}
                      onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), index, selectedDate.getDate()))}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        selectedDate.getMonth() === index && styles.datePickerOptionTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Day Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Day</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerOption,
                          selectedDate.getDate() === day && styles.datePickerOptionSelected
                        ]}
                        onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          selectedDate.getDate() === day && styles.datePickerOptionTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            
            {/* Selected Date Display */}
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateText}>
                Selected: {selectedDate.toLocaleDateString()} ({calculateAge(selectedDate)})
              </Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleDateSelect}
              >
                <Text style={styles.modalConfirmText}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalContent}>
            <Text style={styles.modalTitle}>Select Country</Text>
            
            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#9ca3af"
              onChangeText={(text) => {
                // Filter countries based on search
                const filtered = countries.filter(country => 
                  country.toLowerCase().includes(text.toLowerCase())
                );
                // You could implement search state here if needed
              }}
            />
            
            {/* Country List */}
            <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={styles.countryOption}
                  onPress={() => handleCountrySelect(country)}
                >
                  <Text style={styles.countryOptionText}>{country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCountryModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showGenderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {['Not specified', 'Male', 'Female', 'Other'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={styles.genderOption}
                onPress={() => handleGenderSelect(gender)}
              >
                <Text style={styles.genderOptionText}>{gender}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowGenderModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  username: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: spacing.sm,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  moodText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  profileDetails: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#9ca3af',
    flex: 2,
    textAlign: 'right',
  },
  detailValueContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  editHint: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 2,
  },
  editInput: {
    flex: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dateButton: {
    flex: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  pickerContainer: {
    flex: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  picker: {
    height: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  genderOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  genderOptionText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  modalCancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
  },
  modalCancelText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    fontWeight: '600',
  },
  editInputText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  dateButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  dateModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
    height: 200,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  datePickerScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  datePickerOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  datePickerOptionText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  datePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedDateContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalConfirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flex: 1,
    marginLeft: spacing.sm,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  countryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  countryButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  countryModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countryList: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  countryOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  countryOptionText: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  actionButtons: {
    marginTop: spacing.md,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  dangerZone: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;