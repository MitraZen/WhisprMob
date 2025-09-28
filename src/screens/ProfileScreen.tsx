import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput, Modal, Animated, Dimensions, Platform } from 'react-native';
import { spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { MoodType } from '@/types';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService } from '@/services/buddiesService';
import { useAuth } from '@/store/AuthContext';
// import { LinearGradient } from 'expo-linear-gradient';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, user }) => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  
  const styles = createStyles(theme);
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
  const [originalProfileData, setOriginalProfileData] = useState<any>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
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
      
      // Animate profile loading
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
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

  const handleMoodChange = (newMood: MoodType) => {
    setProfileData(prev => ({ ...prev, mood: newMood }));
    // Add haptic feedback here if available
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
      
      setIsEditing(false);
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
    setIsEditing(false);
    setEditingField(null);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data, messages, and connections.',
      [
        { text: 'Cancel', style: 'cancel' },
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

  const getMoodGradient = (mood: string) => {
    const moodConfig = getMoodConfig(mood);
    return (moodConfig as any).gradient || ['#667eea', '#764ba2'];
  };

  return (
    <View style={styles.container}>
      {isLoadingProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <>
          {/* Profile Cover Section */}
          <View
            style={[styles.profileCover, { backgroundColor: '#7c3aed' }]}
          >
            <View style={styles.coverContent}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => onNavigate('notes')}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>‹</Text>
              </TouchableOpacity>
              
              {/* Profile Title */}
              <View style={styles.profileTitleSection}>
                <Text style={styles.profileTitle}>Profile</Text>
              </View>
              
              <Animated.View 
                style={[
                  styles.profileHeader,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                {/* Left side - Avatar */}
                <View style={styles.leftSection}>
                  <View style={styles.avatarContainer}>
                    <View
                      style={[styles.avatarGradient, { backgroundColor: getMoodGradient(profileData.mood)[0] }]}
                    >
                      <Text style={styles.avatarText}>
                        {profileData.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Center - Mood Selector */}
                <View style={styles.centerSection}>
                  <TouchableOpacity 
                    style={styles.moodButton}
                    onPress={() => setShowMoodModal(true)}
                  >
                    <Text style={styles.moodEmoji}>
                      {getMoodConfig(profileData.mood).emoji}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Right side - User Info */}
                <View style={styles.rightSection}>
                  <Text style={styles.displayName}>{profileData.displayName}</Text>
                  <Text style={styles.moodDescription}>
                    {getMoodConfig(profileData.mood).description}
                  </Text>
                </View>
              </Animated.View>
            </View>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Stats Cards */}
            <Animated.View 
              style={[
                styles.statsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
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

            {/* Profile Details Card */}
            <Animated.View 
              style={[
                styles.profileCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Profile Details</Text>
                {!isEditing ? (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={handleEditProfile}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.saveButtons}>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => setIsEditing(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={handleSaveProfile}
                      disabled={isLoading}
                    >
                      <Text style={styles.saveButtonText}>
                        {isLoading ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bio</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={profileData.bio}
                    onChangeText={(value) => handleTextChange('bio', value)}
                    multiline
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#9ca3af"
                  />
                ) : (
                  <Text style={styles.detailValue}>{profileData.bio}</Text>
                )}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Age</Text>
                {isEditing ? (
                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={() => setShowDateModal(true)}
                  >
                    <Text style={styles.selectButtonText}>
                      {profileData.age === 'Not specified' ? 'Select Age' : profileData.age}
                    </Text>
                    <Text style={styles.selectArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.detailValue}>{profileData.age}</Text>
                )}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                {isEditing ? (
                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Text style={styles.selectButtonText}>
                      {profileData.location === 'Not specified' ? 'Select Country' : profileData.location}
                    </Text>
                    <Text style={styles.selectArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.detailValue}>{profileData.location}</Text>
                )}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gender</Text>
                {isEditing ? (
                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={() => setShowGenderModal(true)}
                  >
                    <Text style={styles.selectButtonText}>
                      {profileData.gender === 'Not specified' ? 'Select Gender' : profileData.gender}
                    </Text>
                    <Text style={styles.selectArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.detailValue}>{profileData.gender}</Text>
                )}
              </View>
          
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Joined</Text>
                <Text style={styles.detailValue}>{formatJoinDate(profileData.joinDate)}</Text>
              </View>
            </Animated.View>

            {/* Danger Zone */}
            <Animated.View 
              style={[
                styles.dangerZone,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.dangerZoneHeader}
                onPress={() => setShowDangerZone(!showDangerZone)}
              >
                <View style={styles.dangerZoneTitle}>
                  <Text style={styles.dangerIcon}>⚠️</Text>
                  <Text style={styles.dangerTitle}>Danger Zone</Text>
                </View>
                <Text style={styles.dangerZoneArrow}>
                  {showDangerZone ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              
              {showDangerZone && (
                <View style={styles.dangerZoneContent}>
                  <Text style={styles.dangerZoneWarning}>
                    Deleting your account will permanently remove all your data, messages, and connections. This action cannot be undone.
                  </Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
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
              )}
            </Animated.View>
          </ScrollView>

          {/* Floating Action Button */}
          {!isEditing && (
            <TouchableOpacity 
              style={styles.fab}
              onPress={handleEditProfile}
            >
              <Text style={styles.fabIcon}>✏️</Text>
            </TouchableOpacity>
          )}

          {/* Bottom Navigation Menu */}
          <NavigationMenu currentScreen="profile" onNavigate={onNavigate} />
        </>
      )}

      {/* Mood Selection Modal */}
      <Modal
        visible={showMoodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.moodModalContent}>
            <Text style={styles.modalTitle}>Choose Your Mood</Text>
            <View style={styles.moodGrid}>
              {Object.entries(moodConfig).map(([mood, config]) => (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.moodOption,
                    profileData.mood === mood && styles.moodOptionSelected
                  ]}
                  onPress={() => {
                    handleMoodChange(mood as MoodType);
                    setShowMoodModal(false);
                  }}
                >
                  <Text style={styles.moodOptionEmoji}>{config.emoji}</Text>
                  <Text style={styles.moodOptionText}>{config.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowMoodModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateText}>
                Selected: {selectedDate.toLocaleDateString()}
              </Text>
            </View>
            
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
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gender Selection Modal */}
      <Modal
        visible={showGenderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {['male', 'female', 'other'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={styles.genderOption}
                onPress={() => handleGenderSelect(gender)}
              >
                <Text style={styles.genderOptionText}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </Text>
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
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#9ca3af"
            />
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
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  // Profile Cover Section
  profileCover: {
    height: 180,
    paddingTop: spacing.xl,
  },
  coverContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileTitleSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra padding for camera hole
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingLeft: 64, // leave space for back button
    paddingBottom: spacing.lg, // pushes stats row down
    position: 'relative',
  },
  leftSection: {
    alignItems: 'center',
    width: 60, // Fixed width for avatar
  },
  centerSection: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -25 }], // Half of mood button width (50/2)
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 3,
    backgroundColor: '#fff',
    ...theme.shadows.lg,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  moodEmoji: {
    fontSize: 24,
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: spacing.md,
    marginLeft: 60, // Account for left section width
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  moodDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  // Scroll Content
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    ...theme.shadows.sm,
    minHeight: 60,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // Profile Card
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#6b7280',
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Detail Rows
  detailRow: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  editInput: {
    fontSize: 16,
    color: theme.colors.onSurface,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectButtonText: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  selectArrow: {
    fontSize: 12,
    color: '#9ca3af',
  },
  // Danger Zone
  dangerZone: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#fef2f2',
  },
  dangerZoneTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  dangerZoneArrow: {
    fontSize: 16,
    color: '#dc2626',
  },
  dangerZoneContent: {
    padding: spacing.lg,
    backgroundColor: '#fff',
  },
  dangerZoneWarning: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 120,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    zIndex: 10,
  },
  fabIcon: {
    fontSize: 24,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  moodOption: {
    width: '30%',
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moodOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  moodOptionEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  moodOptionText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#6b7280',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Additional modal styles
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
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
});

export default ProfileScreen;
