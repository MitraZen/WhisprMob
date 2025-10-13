import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Modal, Animated, Platform, Dimensions, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
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
  const [showConversationModal, setShowConversationModal] = useState(false);
  
  const styles = createStyles(theme);
  
  
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: 'Anonymous User',
    username: 'anonymous',
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
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public', // 'public', 'friends', 'private'
    showOnlineStatus: true,
    allowFriendRequests: true,
    showActivityFeed: true,
    shareLocation: false,
    showMoodStatus: true,
    allowMessages: 'everyone', // 'everyone', 'friends', 'none'
    showLastSeen: true,
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Interest Tokens System
  const [interestTokens, setInterestTokens] = useState([
    { id: 'music', emoji: '🎵', label: 'Music', selected: true },
    { id: 'travel', emoji: '🌍', label: 'Travel', selected: false },
    { id: 'nature', emoji: '🌿', label: 'Nature', selected: true },
    { id: 'coffee', emoji: '☕', label: 'Coffee', selected: false },
    { id: 'books', emoji: '📚', label: 'Books', selected: true },
    { id: 'art', emoji: '🎨', label: 'Art', selected: false },
    { id: 'fitness', emoji: '💪', label: 'Fitness', selected: false },
    { id: 'food', emoji: '🍕', label: 'Food', selected: true },
    { id: 'tech', emoji: '💻', label: 'Tech', selected: false },
    { id: 'photography', emoji: '📸', label: 'Photography', selected: false },
    { id: 'gaming', emoji: '🎮', label: 'Gaming', selected: false },
    { id: 'meditation', emoji: '🧘', label: 'Meditation', selected: false },
  ]);
  const [showInterestModal, setShowInterestModal] = useState(false);

  // Trust Markers System
  const [trustMarkers, setTrustMarkers] = useState<any[]>([]);
  const [showTrustMarkersModal, setShowTrustMarkersModal] = useState(false);
  const [trustScore, setTrustScore] = useState(0);

  const trustMarkerConfig = {
    // Activity Markers
    active7Days: {
      id: 'active7Days',
      title: 'Active 7 Days',
      description: 'Been active this week',
      icon: '🔥',
      color: '#f59e0b',
      category: 'activity',
      requirement: 'lastActiveWithin7Days',
      points: 10,
      maxProgress: 7
    },
    active30Days: {
      id: 'active30Days',
      title: 'Active 30 Days',
      description: 'Been active this month',
      icon: '⭐',
      color: '#8b5cf6',
      category: 'activity',
      requirement: 'lastActiveWithin30Days',
      points: 15,
      maxProgress: 30
    },
    consistentUser: {
      id: 'consistentUser',
      title: 'Consistent User',
      description: 'Regular activity pattern',
      icon: '📅',
      color: '#10b981',
      category: 'activity',
      requirement: 'consistentActivity',
      points: 20,
      maxProgress: 3
    },
    
    // Communication Markers
    respectfulChatter: {
      id: 'respectfulChatter',
      title: 'Respectful Chatter',
      description: 'Positive message interactions',
      icon: '💬',
      color: '#3b82f6',
      category: 'communication',
      requirement: 'positiveMessageRatio',
      points: 15,
      maxProgress: 10
    },
    goodListener: {
      id: 'goodListener',
      title: 'Good Listener',
      description: 'High response rate',
      icon: '👂',
      color: '#ec4899',
      category: 'communication',
      requirement: 'highResponseRate',
      points: 20,
      maxProgress: 1
    },
    engagedBuddy: {
      id: 'engagedBuddy',
      title: 'Engaged Buddy',
      description: 'Active in conversations',
      icon: '🤝',
      color: '#06b6d4',
      category: 'communication',
      requirement: 'highEngagement',
      points: 15,
      maxProgress: 3
    },
    
    // Verification Markers
    profileComplete: {
      id: 'profileComplete',
      title: 'Profile Complete',
      description: 'Filled out profile details',
      icon: '✅',
      color: '#22c55e',
      category: 'verification',
      requirement: 'profileComplete',
      points: 10,
      maxProgress: 1
    },
    interestTokensSet: {
      id: 'interestTokensSet',
      title: 'Interest Tokens Set',
      description: 'Has selected interests',
      icon: '🎯',
      color: '#f97316',
      category: 'verification',
      requirement: 'hasInterestTokens',
      points: 15,
      maxProgress: 3
    },
    
    // Community Markers
    earlyAdopter: {
      id: 'earlyAdopter',
      title: 'Early Adopter',
      description: 'Joined early in app lifecycle',
      icon: '🚀',
      color: '#6366f1',
      category: 'community',
      requirement: 'earlyJoinDate',
      points: 30,
      maxProgress: 1
    },
    trustedMember: {
      id: 'trustedMember',
      title: 'Trusted Member',
      description: 'High community rating',
      icon: '🛡️',
      color: '#8b5cf6',
      category: 'community',
      requirement: 'highCommunityRating',
      points: 50,
      maxProgress: 1
    }
  };

  // Enhanced Mood-Based Profile System
  const [conversationState, setConversationState] = useState({
    currentMood: 'happy', // Existing mood system
    conversationMode: 'open', // New conversation states
    availability: 'available', // availability level
    lastUpdated: new Date(),
  });

  const conversationStates = [
    {
      id: 'open',
      emoji: '💬',
      label: 'Open to Chat',
      description: 'Ready for any conversation',
      color: '#10b981',
      availability: 'high'
    },
    {
      id: 'reflective',
      emoji: '🤔',
      label: 'Reflective',
      description: 'Prefer deep, thoughtful conversations',
      color: '#6366f1',
      availability: 'medium'
    },
    {
      id: 'playful',
      emoji: '😄',
      label: 'Playful',
      description: 'Fun and light-hearted mood',
      color: '#f59e0b',
      availability: 'high'
    },
    {
      id: 'busy',
      emoji: '⏰',
      label: 'Busy',
      description: 'Limited availability',
      color: '#ef4444',
      availability: 'low'
    },
    {
      id: 'listening',
      emoji: '👂',
      label: 'Listening',
      description: 'Available to listen and support',
      color: '#8b5cf6',
      availability: 'medium'
    },
    {
      id: 'creative',
      emoji: '✨',
      label: 'Creative',
      description: 'Inspired and sharing ideas',
      color: '#ec4899',
      availability: 'high'
    }
  ];
  const [originalProfileData, setOriginalProfileData] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1)); // Default to year 2000
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
    setIsLoading(true);
    try {
      const profile = await BuddiesService.getUserProfile(user.id);
      const stats = await BuddiesService.getUserStats(user.id);
      
      if (profile) {
        const ageDisplay = profile.age ? calculateAge(new Date(profile.age)) : 'Not specified';
        const genderDisplay = profile.gender ? formatGender(profile.gender) : 'Not specified';
        
        setProfileData({
          displayName: profile.username || profile.display_name || user.username || 'Anonymous User',
          username: profile.username || user.username || 'anonymous',
          bio: profile.bio || 'No bio yet',
          age: ageDisplay,
          location: profile.country || profile.location || 'Not specified',
          gender: genderDisplay,
          mood: profile.mood || user.mood || 'happy',
          joinDate: new Date(profile.created_at || user.createdAt),
          dateOfBirth: profile.age ? new Date(profile.age) : null,
        });
        
        const statsData = {
          messagesSent: stats.messagesSent || 0,
          buddiesCount: stats.buddiesCount || 0,
          notesShared: stats.notesShared || 0,
        };
        
        setUserStats(statsData);
        setAchievements(calculateAchievements(statsData));
        setRecentActivity(generateRecentActivity(statsData));
        
        // Calculate trust markers with progress tracking
        const userData = {
          lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last week
          createdAt: new Date(profile.created_at || user.createdAt),
        };
        const markersWithProgress = calculateTrustMarkersWithProgress(userData, statsData);
        setTrustMarkers(markersWithProgress);
        setTrustScore(calculateTrustScore(markersWithProgress.filter(m => m.isEarned)));
      } else {
        // Fallback to user data if no profile exists
        setProfileData({
          displayName: user.username || 'Anonymous User',
          username: user.username || 'anonymous',
          bio: 'No bio yet',
          age: 'Not specified',
          location: 'Not specified',
          gender: 'Not specified',
          mood: user.mood || 'happy',
          joinDate: new Date(user.createdAt),
          dateOfBirth: null,
        });
        
        const fallbackStats = {
          messagesSent: 0,
          buddiesCount: 0,
          notesShared: 0,
        };
        
        setUserStats(fallbackStats);
        setAchievements(calculateAchievements(fallbackStats));
        setRecentActivity(generateRecentActivity(fallbackStats));
        
        // Calculate trust markers with progress tracking for fallback
        const userData = {
          lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last week
          createdAt: new Date(user.createdAt),
        };
        const markersWithProgress = calculateTrustMarkersWithProgress(userData, fallbackStats);
        setTrustMarkers(markersWithProgress);
        setTrustScore(calculateTrustScore(markersWithProgress.filter(m => m.isEarned)));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
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



  const handleEditProfile = () => {
    setOriginalProfileData(profileData);
    // Initialize date picker with existing date or default
    if (profileData.dateOfBirth && profileData.dateOfBirth instanceof Date && !isNaN(profileData.dateOfBirth.getTime())) {
      setSelectedDate(profileData.dateOfBirth);
    } else {
      setSelectedDate(new Date(2000, 0, 1));
    }
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
      
      // Always include bio (even if empty, to clear it)
      updateData.bio = profileData.bio || '';
      
      // Only add fields if they have values (to avoid null errors)
      if (profileData.displayName && profileData.displayName !== 'Anonymous User') {
        updateData.username = profileData.displayName;
      }
      if (profileData.username && profileData.username !== 'anonymous') {
        updateData.username = profileData.username;
      }
      
      // Handle date of birth properly
      if (profileData.dateOfBirth && profileData.dateOfBirth instanceof Date && !isNaN(profileData.dateOfBirth.getTime())) {
        updateData.age = profileData.dateOfBirth.toISOString();
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
    if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const age = calculateAge(selectedDate);
      setProfileData(prev => ({ 
        ...prev, 
        age: `${age} years old`, 
        dateOfBirth: selectedDate 
      }));
    }
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

  // Achievement system configuration
  const achievementConfig = {
    firstMessage: {
      id: 'firstMessage',
      title: 'First Message',
      description: 'Send your first message',
      icon: '💬',
      color: '#3b82f6',
      requirement: 1,
      type: 'messagesSent'
    },
    messageMaster: {
      id: 'messageMaster',
      title: 'Message Master',
      description: 'Send 50 messages',
      icon: '🔥',
      color: '#ef4444',
      requirement: 50,
      type: 'messagesSent'
    },
    socialButterfly: {
      id: 'socialButterfly',
      title: 'Social Butterfly',
      description: 'Connect with 10 buddies',
      icon: '🦋',
      color: '#8b5cf6',
      requirement: 10,
      type: 'buddiesCount'
    },
    buddyCollector: {
      id: 'buddyCollector',
      title: 'Buddy Collector',
      description: 'Connect with 5 buddies',
      icon: '👥',
      color: '#10b981',
      requirement: 5,
      type: 'buddiesCount'
    },
    noteSharer: {
      id: 'noteSharer',
      title: 'Note Sharer',
      description: 'Share 10 notes',
      icon: '📝',
      color: '#f59e0b',
      requirement: 10,
      type: 'notesShared'
    },
    earlyBird: {
      id: 'earlyBird',
      title: 'Early Bird',
      description: 'Join in the first week',
      icon: '🐦',
      color: '#06b6d4',
      requirement: 1,
      type: 'joinDate'
    }
  };

  const calculateAchievements = (stats: any) => {
    const unlockedAchievements = [];
    const inProgressAchievements = [];

    Object.values(achievementConfig).forEach((achievement: any) => {
      let progress = 0;
      let isUnlocked = false;

      switch (achievement.type) {
        case 'messagesSent':
          progress = stats.messagesSent;
          isUnlocked = stats.messagesSent >= achievement.requirement;
          break;
        case 'buddiesCount':
          progress = stats.buddiesCount;
          isUnlocked = stats.buddiesCount >= achievement.requirement;
          break;
        case 'notesShared':
          progress = stats.notesShared;
          isUnlocked = stats.notesShared >= achievement.requirement;
          break;
        case 'joinDate':
          // Check if user joined within first week (7 days)
          const daysSinceJoin = Math.floor((new Date().getTime() - profileData.joinDate.getTime()) / (1000 * 60 * 60 * 24));
          progress = daysSinceJoin <= 7 ? 1 : 0;
          isUnlocked = daysSinceJoin <= 7;
          break;
      }

      const achievementData = {
        ...achievement,
        progress: Math.min(progress, achievement.requirement),
        isUnlocked,
        progressPercentage: Math.min((progress / achievement.requirement) * 100, 100)
      };

      if (isUnlocked) {
        unlockedAchievements.push(achievementData);
      } else if (progress > 0) {
        inProgressAchievements.push(achievementData);
      }
    });

    // Sort by progress percentage (highest first)
    unlockedAchievements.sort((a, b) => b.progressPercentage - a.progressPercentage);
    inProgressAchievements.sort((a, b) => b.progressPercentage - a.progressPercentage);

    return [...unlockedAchievements, ...inProgressAchievements].slice(0, 4); // Show top 4 achievements
  };


  const handleShareProfile = () => {
    Alert.alert(
      'Share Profile',
      'Profile sharing feature will be integrated here. This will allow you to share your profile with others.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacySettings = () => {
    setShowPrivacyModal(true);
  };

  const handlePrivacySettingChange = (setting: string, value: any) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Interest Tokens handlers
  const handleInterestTokenToggle = (tokenId: string) => {
    setInterestTokens(prev => 
      prev.map(token => 
        token.id === tokenId 
          ? { ...token, selected: !token.selected }
          : token
      )
    );
  };

  const getSelectedInterestTokens = () => {
    return interestTokens.filter(token => token.selected);
  };

  const handleInterestModalSave = () => {
    setShowInterestModal(false);
    // Here you would save the interest tokens to the backend
    Alert.alert('Interests Updated', 'Your interest tokens have been saved!');
  };

  // Conversation State handlers
  const handleConversationStateChange = (stateId: string) => {
    const newState = conversationStates.find(state => state.id === stateId);
    if (newState) {
      setConversationState(prev => ({
        ...prev,
        conversationMode: stateId,
        availability: newState.availability,
        lastUpdated: new Date(),
      }));
    }
  };

  const getCurrentConversationState = () => {
    return conversationStates.find(state => state.id === conversationState.conversationMode) || conversationStates[0];
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'high': return 'Highly Available';
      case 'medium': return 'Moderately Available';
      case 'low': return 'Limited Availability';
      default: return 'Unknown';
    }
  };

  // Enhanced Trust Score Calculation
  const calculateTrustScore = (markers: any[]) => {
    return markers.reduce((total, marker) => total + marker.points, 0);
  };

  // Enhanced Trust Markers calculation with progress tracking
  const calculateTrustMarkersWithProgress = (userData: any, stats: any) => {
    const earnedMarkers = [];
    const now = new Date();
    
    // Activity Markers with Progress
    if (userData.lastActiveAt) {
      const lastActive = new Date(userData.lastActiveAt);
      const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActive <= 7) {
        earnedMarkers.push({
          ...trustMarkerConfig.active7Days,
          progress: Math.max(0, 7 - daysSinceActive),
          isEarned: true
        });
      } else {
        earnedMarkers.push({
          ...trustMarkerConfig.active7Days,
          progress: 0,
          isEarned: false
        });
      }
      
      if (daysSinceActive <= 30) {
        earnedMarkers.push({
          ...trustMarkerConfig.active30Days,
          progress: Math.max(0, 30 - daysSinceActive),
          isEarned: true
        });
      } else {
        earnedMarkers.push({
          ...trustMarkerConfig.active30Days,
          progress: 0,
          isEarned: false
        });
      }
      
      if (daysSinceActive <= 3) {
        earnedMarkers.push({
          ...trustMarkerConfig.consistentUser,
          progress: Math.max(0, 3 - daysSinceActive),
          isEarned: true
        });
      } else {
        earnedMarkers.push({
          ...trustMarkerConfig.consistentUser,
          progress: 0,
          isEarned: false
        });
      }
    }
    
    // Communication Markers with Progress
    const responseRate = stats.messagesReceived > 0 ? stats.messagesSent / stats.messagesReceived : 0;
    
    earnedMarkers.push({
      ...trustMarkerConfig.goodListener,
      progress: Math.min(1, responseRate),
      isEarned: responseRate >= 0.7
    });
    
    earnedMarkers.push({
      ...trustMarkerConfig.respectfulChatter,
      progress: Math.min(10, stats.messagesSent),
      isEarned: stats.messagesSent >= 10
    });
    
    earnedMarkers.push({
      ...trustMarkerConfig.engagedBuddy,
      progress: Math.min(3, stats.buddiesCount),
      isEarned: stats.buddiesCount >= 3
    });
    
    // Verification Markers with Progress
    earnedMarkers.push({
      ...trustMarkerConfig.profileComplete,
      progress: profileData.bio && profileData.bio !== 'No bio yet' ? 1 : 0,
      isEarned: profileData.bio && profileData.bio !== 'No bio yet'
    });
    
    const selectedInterests = getSelectedInterestTokens();
    earnedMarkers.push({
      ...trustMarkerConfig.interestTokensSet,
      progress: Math.min(3, selectedInterests.length),
      isEarned: selectedInterests.length >= 3
    });
    
    
    // Community Markers
    if (userData.createdAt) {
      const joinDate = new Date(userData.createdAt);
      const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
      earnedMarkers.push({
        ...trustMarkerConfig.earlyAdopter,
        progress: daysSinceJoin <= 30 ? 1 : 0,
        isEarned: daysSinceJoin <= 30
      });
    }
    
    earnedMarkers.push({
      ...trustMarkerConfig.trustedMember,
      progress: (stats.buddiesCount >= 5 && stats.messagesSent >= 20) ? 1 : 0,
      isEarned: stats.buddiesCount >= 5 && stats.messagesSent >= 20
    });
    
    return earnedMarkers;
  };

  const getTrustMarkersByCategory = (markers: any[]) => {
    const categories = {
      activity: markers.filter(m => m.category === 'activity'),
      communication: markers.filter(m => m.category === 'communication'),
      verification: markers.filter(m => m.category === 'verification'),
      community: markers.filter(m => m.category === 'community')
    };
    return categories;
  };

  const getPrivacyStatusText = () => {
    const { profileVisibility, showOnlineStatus, allowMessages } = privacySettings;
    
    if (profileVisibility === 'private') {
      return 'Private Profile';
    } else if (profileVisibility === 'friends') {
      return 'Friends Only';
    } else {
      return 'Public Profile';
    }
  };

  const getPrivacyStatusColor = () => {
    const { profileVisibility } = privacySettings;
    
    switch (profileVisibility) {
      case 'private':
        return theme.colors.error;
      case 'friends':
        return theme.colors.warning;
      case 'public':
        return theme.colors.success;
      default:
        return theme.colors.onSurface;
    }
  };

  // Activity Timeline configuration and generation
  const generateRecentActivity = (stats: any) => {
    const activities = [];
    const now = new Date();
    
    // Realistic buddy names pool
    const buddyNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Blake'];
    const moodEmojis = ['😊', '😄', '😌', '🤔', '😎', '🥳', '😴', '🤗', '😍', '🙂'];
    const moodNames = ['happy', 'excited', 'calm', 'thoughtful', 'cool', 'celebrating', 'sleepy', 'loving', 'romantic', 'content'];
    
    // Generate activities based on user stats with realistic content
    if (stats.messagesSent > 0) {
      const messageCount = Math.min(stats.messagesSent, 3);
      for (let i = 0; i < messageCount; i++) {
        const buddyName = buddyNames[i % buddyNames.length];
        const messageTypes = [
          { desc: 'Shared a funny meme', timeOffset: 1 + i * 2 },
          { desc: 'Sent a voice message', timeOffset: 3 + i * 4 },
          { desc: 'Shared a photo', timeOffset: 6 + i * 6 },
          { desc: 'Asked about weekend plans', timeOffset: 12 + i * 8 },
          { desc: 'Sent a quick hello', timeOffset: 18 + i * 12 }
        ];
        const messageType = messageTypes[i % messageTypes.length];
        
        activities.push({
          id: `message_${i + 1}`,
          type: 'message',
          title: `Sent message to ${buddyName}`,
          description: messageType.desc,
          icon: '💬',
          color: theme.colors.info,
          timestamp: new Date(now.getTime() - messageType.timeOffset * 60 * 60 * 1000),
          action: 'message'
        });
      }
    }

    if (stats.buddiesCount > 0) {
      const buddyCount = Math.min(stats.buddiesCount, 2);
      for (let i = 0; i < buddyCount; i++) {
        const buddyName = buddyNames[(i + 3) % buddyNames.length];
        const connectionTypes = [
          { desc: 'Found through mutual friends', timeOffset: 1 + i * 2 },
          { desc: 'Connected via shared interests', timeOffset: 2 + i * 3 },
          { desc: 'Met at a local event', timeOffset: 4 + i * 5 }
        ];
        const connectionType = connectionTypes[i % connectionTypes.length];
        
        activities.push({
          id: `buddy_${i + 1}`,
          type: 'buddy',
          title: `Added ${buddyName} as buddy`,
          description: connectionType.desc,
          icon: '👥',
          color: theme.colors.success,
          timestamp: new Date(now.getTime() - connectionType.timeOffset * 24 * 60 * 60 * 1000),
          action: 'buddy'
        });
      }
    }

    if (stats.notesShared > 0) {
      const noteCount = Math.min(stats.notesShared, 2);
      for (let i = 0; i < noteCount; i++) {
        const moodIndex = i % moodEmojis.length;
        const moodEmoji = moodEmojis[moodIndex];
        const moodName = moodNames[moodIndex];
        
        const noteTypes = [
          { desc: 'Updated your mood status', timeOffset: 1 + i * 2 },
          { desc: 'Shared a personal note', timeOffset: 2 + i * 3 },
          { desc: 'Posted a daily reflection', timeOffset: 3 + i * 4 },
          { desc: 'Shared a motivational quote', timeOffset: 5 + i * 6 }
        ];
        const noteType = noteTypes[i % noteTypes.length];
        
        activities.push({
          id: `note_${i + 1}`,
          type: 'note',
          title: noteType.desc.includes('mood') ? `Updated mood to ${moodName}` : 'Shared a personal note',
          description: noteType.desc,
          icon: noteType.desc.includes('mood') ? moodEmoji : '📝',
          color: theme.colors.warning,
          timestamp: new Date(now.getTime() - noteType.timeOffset * 24 * 60 * 60 * 1000),
          action: 'note'
        });
      }
    }

    // Add profile-related activities
    if (profileData.bio !== 'No bio yet') {
      activities.push({
        id: 'profile_bio',
        type: 'profile',
        title: 'Updated your bio',
        description: 'Added personal information to your profile',
        icon: '✏️',
        color: theme.colors.primary,
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        action: 'profile'
      });
    }

    // Add achievement-related activities
    if (achievements.length > 0) {
      const recentAchievement = achievements[0];
      if (recentAchievement && recentAchievement.isUnlocked) {
        activities.push({
          id: 'achievement_unlock',
          type: 'achievement',
          title: `Unlocked "${recentAchievement.title}"`,
          description: 'Congratulations on your new achievement!',
          icon: '🏆',
          color: theme.colors.warning,
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          action: 'achievement'
        });
      }
    }

    // Sort by timestamp (most recent first) and limit to 6 items
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 6);
  };

  const formatActivityTime = (timestamp: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const handleActivityPress = (activity: any) => {
    switch (activity.action) {
      case 'message':
        Alert.alert(
          'Message Activity', 
          `${activity.title}\n\n${activity.description}\n\nThis would open the conversation with ${activity.title.split(' ')[3]}.`,
          [{ text: 'OK' }]
        );
        break;
      case 'buddy':
        Alert.alert(
          'Buddy Activity', 
          `${activity.title}\n\n${activity.description}\n\nThis would open ${activity.title.split(' ')[1]}'s profile.`,
          [{ text: 'OK' }]
        );
        break;
      case 'mood':
        setShowMoodModal(true);
        break;
      case 'note':
        Alert.alert(
          'Note Activity', 
          `${activity.title}\n\n${activity.description}\n\nThis would show the full note content.`,
          [{ text: 'OK' }]
        );
        break;
      case 'profile':
        Alert.alert(
          'Profile Update', 
          `${activity.title}\n\n${activity.description}\n\nThis would open the edit profile screen.`,
          [{ text: 'OK' }]
        );
        break;
      case 'achievement':
        Alert.alert(
          'Achievement Unlocked!', 
          `${activity.title}\n\n${activity.description}\n\nThis would show achievement details.`,
          [{ text: 'OK' }]
        );
        break;
      default:
        Alert.alert('Activity', `View details for: ${activity.title}`);
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

        {/* Enhanced Profile Info Section */}
        <Animated.View 
          style={[
            styles.profileSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.profileContent}>
            {/* Enhanced Avatar */}
          <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
            <Text style={styles.avatarText}>
              {profileData.displayName.charAt(0).toUpperCase()}
            </Text>
              </LinearGradient>
              {/* Online Status Indicator */}
              <View style={styles.onlineIndicator} />
          </View>
            
            {/* Enhanced Text Content */}
          <Text style={styles.displayName}>{profileData.displayName}</Text>
            <Text style={styles.username}>@{profileData.username}</Text>
            
            {/* Enhanced Mood Button */}
          <TouchableOpacity 
            style={styles.moodButton}
            onPress={() => setShowMoodModal(true)}
              activeOpacity={0.8}
          >
              <View style={styles.moodButtonContent}>
            <Text style={styles.moodEmoji}>
              {getMoodConfig(profileData.mood).emoji}
            </Text>
            <Text style={styles.moodText}>
              {getMoodConfig(profileData.mood).description}
            </Text>
                <Icon name="chevron-down" size={16} color={theme.colors.onSurface} />
              </View>
          </TouchableOpacity>
            
            {/* Profile Completion Indicator */}
            <View style={styles.completionContainer}>
              <View style={styles.completionHeader}>
                <Icon name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={styles.completionText}>Profile Complete</Text>
              </View>
              <View style={styles.completionBar}>
                <View style={[styles.completionProgress, { width: '85%' }]} />
              </View>
              <Text style={styles.completionPercentage}>85%</Text>
            </View>

            {/* Privacy Status Indicator */}
            <TouchableOpacity 
              style={styles.privacyStatusContainer}
              onPress={handlePrivacySettings}
              activeOpacity={0.7}
            >
              <View style={styles.privacyStatusHeader}>
                <Icon name="shield-outline" size={16} color={getPrivacyStatusColor()} />
                <Text style={[styles.privacyStatusText, { color: getPrivacyStatusColor() }]}>
                  {getPrivacyStatusText()}
                </Text>
                <Icon name="chevron-forward" size={14} color={theme.colors.onSurfaceVariant} />
              </View>
              <Text style={styles.privacyStatusDescription}>
                Tap to manage your privacy settings
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Achievements Section */}
        {achievements.length > 0 && (
        <Animated.View 
          style={[
              styles.achievementsSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
            <View style={styles.achievementsHeader}>
              <Icon name="trophy-outline" size={20} color={theme.colors.warning} />
              <Text style={styles.achievementsTitle}>Recent Achievements</Text>
            </View>
            
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement, index) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <View style={[
                    styles.achievementIconContainer,
                    { backgroundColor: achievement.isUnlocked ? achievement.color + '15' : theme.colors.surfaceVariant }
                  ]}>
                    <Text style={[
                      styles.achievementIcon,
                      { opacity: achievement.isUnlocked ? 1 : 0.5 }
                    ]}>
                      {achievement.icon}
          </Text>
                    {achievement.isUnlocked && (
                      <View style={styles.achievementBadge}>
                        <Icon name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.achievementContent}>
                    <Text style={[
                      styles.achievementTitle,
                      { color: achievement.isUnlocked ? theme.colors.onSurface : theme.colors.onSurfaceVariant }
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    
                    {!achievement.isUnlocked && (
                      <View style={styles.achievementProgress}>
                        <View style={styles.achievementProgressBar}>
                          <View style={[
                            styles.achievementProgressFill,
                            { 
                              width: `${achievement.progressPercentage}%`,
                              backgroundColor: achievement.color
                            }
                          ]} />
                        </View>
                        <Text style={styles.achievementProgressText}>
                          {achievement.progress}/{achievement.requirement}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.achievementsFooter}>
              <Text style={styles.achievementsFooterText}>
                Keep engaging to unlock more achievements! 🏆
              </Text>
            </View>
        </Animated.View>
        )}

        {/* Interest Tokens Section */}
        <Animated.View 
          style={[
            styles.interestTokensSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.interestTokensHeader}>
            <Icon name="sparkles-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.interestTokensTitle}>My Interests</Text>
            <TouchableOpacity
              style={styles.editInterestsButton}
              onPress={() => setShowInterestModal(true)}
              activeOpacity={0.7}
            >
              <Icon name="create-outline" size={16} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.interestTokensContainer}>
            {getSelectedInterestTokens().map((token) => (
              <View key={token.id} style={styles.interestToken}>
                <Text style={styles.interestTokenEmoji}>{token.emoji}</Text>
                <Text style={styles.interestTokenLabel}>{token.label}</Text>
              </View>
            ))}
          </View>
          
          {getSelectedInterestTokens().length === 0 && (
            <TouchableOpacity
              style={styles.addInterestsButton}
              onPress={() => setShowInterestModal(true)}
              activeOpacity={0.7}
            >
              <Icon name="add-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.addInterestsText}>Add your interests</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Conversation State Section */}
        <Animated.View 
          style={[
            styles.conversationStateSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.conversationStateHeader}>
            <Icon name="chatbubbles-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.conversationStateTitle}>Conversation Mode</Text>
            <TouchableOpacity
              style={styles.editConversationStateButton}
              onPress={() => setShowConversationModal(true)}
              activeOpacity={0.7}
            >
              <Icon name="create-outline" size={16} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.conversationStateContent}>
            <View style={styles.currentStateContainer}>
              <View style={[
                styles.stateEmojiContainer,
                { backgroundColor: getCurrentConversationState().color + '20' }
              ]}>
                <Text style={styles.stateEmoji}>{getCurrentConversationState().emoji}</Text>
              </View>
              <View style={styles.stateInfoContainer}>
                <Text style={styles.stateLabel}>{getCurrentConversationState().label}</Text>
                <Text style={styles.stateDescription}>{getCurrentConversationState().description}</Text>
                <View style={styles.availabilityContainer}>
                  <View style={[
                    styles.availabilityIndicator,
                    { backgroundColor: getAvailabilityColor(conversationState.availability) }
                  ]} />
                  <Text style={[
                    styles.availabilityText,
                    { color: getAvailabilityColor(conversationState.availability) }
                  ]}>
                    {getAvailabilityText(conversationState.availability)}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.changeStateButton}
              onPress={() => setShowConversationModal(true)}
              activeOpacity={0.7}
            >
              <Icon name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.changeStateText}>Change Mode</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Trust Markers Section */}
        <Animated.View 
          style={[
            styles.trustMarkersSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.trustMarkersHeader}>
            <Icon name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.trustMarkersTitle}>Trust Markers</Text>
            <View style={styles.trustScoreContainer}>
              <Text style={styles.trustScoreText}>{trustScore}</Text>
              <Text style={styles.trustScoreLabel}>Trust Score</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllTrustMarkersButton}
              onPress={() => setShowTrustMarkersModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllTrustMarkersText}>View All</Text>
              <Icon name="chevron-forward" size={14} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.trustMarkersContainer}>
            {trustMarkers.filter(m => m.isEarned).slice(0, 6).map((marker) => (
              <View key={marker.id} style={styles.trustMarker}>
                <View style={[
                  styles.trustMarkerIconContainer,
                  { backgroundColor: marker.color + '20' }
                ]}>
                  <Text style={styles.trustMarkerIcon}>{marker.icon}</Text>
                </View>
                <Text style={styles.trustMarkerTitle}>{marker.title}</Text>
                <Text style={styles.trustMarkerPoints}>+{marker.points}</Text>
              </View>
            ))}
          </View>
          
          {/* Progress Indicators for Unearned Markers */}
          {trustMarkers.filter(m => !m.isEarned).length > 0 && (
            <View style={styles.progressMarkersContainer}>
              <Text style={styles.progressMarkersTitle}>In Progress</Text>
              <View style={styles.progressMarkersList}>
                {trustMarkers.filter(m => !m.isEarned).slice(0, 3).map((marker) => (
                  <View key={marker.id} style={styles.progressMarker}>
                    <View style={styles.progressMarkerIconContainer}>
                      <Text style={styles.progressMarkerIcon}>{marker.icon}</Text>
                    </View>
                    <View style={styles.progressMarkerContent}>
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
            </View>
          )}
          
        </Animated.View>

        {/* Enhanced Statistics Section */}
        <Animated.View 
          style={[
            styles.statsSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.statsHeader}>
            <Icon name="stats-chart-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.statsTitle}>Your Statistics</Text>
          </View>
          
          <View style={styles.statsContainer}>
          <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>💬</Text>
                </View>
            <Text style={styles.statNumber}>{userStats.messagesSent}</Text>
            <Text style={styles.statLabel}>Messages</Text>
                <View style={styles.statTrend}>
                  <Icon name="trending-up" size={12} color={theme.colors.success} />
                  <Text style={styles.statTrendText}>+12%</Text>
          </View>
              </View>
            </View>
            
          <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>👥</Text>
                </View>
            <Text style={styles.statNumber}>{userStats.buddiesCount}</Text>
            <Text style={styles.statLabel}>Buddies</Text>
                <View style={styles.statTrend}>
                  <Icon name="trending-up" size={12} color={theme.colors.success} />
                  <Text style={styles.statTrendText}>+3</Text>
          </View>
              </View>
            </View>
            
          <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>📝</Text>
                </View>
            <Text style={styles.statNumber}>{userStats.notesShared}</Text>
            <Text style={styles.statLabel}>Notes</Text>
                <View style={styles.statTrend}>
                  <Icon name="trending-up" size={12} color={theme.colors.success} />
                  <Text style={styles.statTrendText}>+5</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.statsFooter}>
            <Text style={styles.statsFooterText}>
              Keep connecting and sharing to grow your stats! 📈
            </Text>
          </View>
        </Animated.View>


        {/* Activity Timeline Section */}
        {recentActivity.length > 0 && (
          <Animated.View 
            style={[
              styles.activitySection,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.activityHeader}>
              <Icon name="time-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.activityTitle}>Recent Activity</Text>
            </View>
            
            <View style={styles.activityList}>
              {recentActivity.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index === recentActivity.length - 1 && styles.lastActivityItem
                  ]}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityContent}>
                    <View style={[
                      styles.activityIconContainer,
                      { backgroundColor: activity.color + '15' }
                    ]}>
                      <Text style={styles.activityIcon}>{activity.icon}</Text>
                    </View>
                    
                    <View style={styles.activityTextContainer}>
                      <Text style={styles.activityItemTitle}>{activity.title}</Text>
                      <Text style={styles.activityItemDescription}>{activity.description}</Text>
                      <Text style={styles.activityItemTime}>
                        {formatActivityTime(activity.timestamp)}
                      </Text>
                    </View>
                    
                    <Icon 
                      name="chevron-forward" 
                      size={16} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.activityFooter}>
              <Text style={styles.activityFooterText}>
                Keep engaging to see more activity! 📱
              </Text>
            </View>
          </Animated.View>
        )}

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
          <View style={styles.moodModalContainer}>
            <View style={styles.moodModalHeader}>
              <Icon name="happy-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.moodModalTitle}>How are you feeling?</Text>
              <TouchableOpacity 
                style={styles.moodModalCloseButton}
                onPress={() => setShowMoodModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.moodModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.moodModalDescription}>
                Select your current mood to express how you're feeling right now.
              </Text>
              
              <View style={styles.moodGrid}>
                {Object.entries(moodConfig).map(([moodType, config]) => (
                <TouchableOpacity
                    key={moodType}
                  style={[
                    styles.moodOption,
                      profileData.mood === moodType && styles.selectedMoodOption
                  ]}
                  onPress={() => {
                      setProfileData(prev => ({ ...prev, mood: moodType }));
                    setShowMoodModal(false);
                      Alert.alert(
                        'Mood Updated',
                        `You're now feeling ${config.description.toLowerCase()}!`
                      );
                  }}
                    activeOpacity={0.7}
                >
                  <Text style={styles.moodOptionEmoji}>{config.emoji}</Text>
                    <Text style={[
                      styles.moodOptionText,
                      profileData.mood === moodType && styles.selectedMoodOptionText
                    ]}>
                      {config.description}
                    </Text>
                </TouchableOpacity>
              ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Conversation State Modal */}
      <Modal
        visible={showConversationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConversationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.enhancedMoodModalContainer}>
            <View style={styles.enhancedMoodModalHeader}>
              <Icon name="chatbubbles-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.enhancedMoodModalTitle}>Set Your Conversation Mode</Text>
              <TouchableOpacity 
                style={styles.enhancedMoodModalCloseButton}
                onPress={() => setShowConversationModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.enhancedMoodModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.enhancedMoodModalDescription}>
                Choose how you'd like to engage in conversations right now. This helps others understand your current state and availability.
              </Text>
              
              <View style={styles.conversationStatesGrid}>
                {conversationStates.map((state) => (
                  <TouchableOpacity
                    key={state.id}
                    style={[
                      styles.conversationStateOption,
                      conversationState.conversationMode === state.id && styles.conversationStateOptionSelected
                    ]}
                    onPress={() => handleConversationStateChange(state.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.conversationStateEmojiContainer,
                      { backgroundColor: state.color + '20' }
                    ]}>
                      <Text style={styles.conversationStateEmoji}>{state.emoji}</Text>
                    </View>
                    <Text style={[
                      styles.conversationStateLabel,
                      conversationState.conversationMode === state.id && styles.conversationStateLabelSelected
                    ]}>
                      {state.label}
                    </Text>
                    <Text style={styles.conversationStateDescription}>
                      {state.description}
                    </Text>
                    <View style={styles.conversationStateAvailability}>
                      <View style={[
                        styles.conversationStateAvailabilityDot,
                        { backgroundColor: getAvailabilityColor(state.availability) }
                      ]} />
                      <Text style={[
                        styles.conversationStateAvailabilityText,
                        { color: getAvailabilityColor(state.availability) }
                      ]}>
                        {getAvailabilityText(state.availability)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.enhancedMoodModalFooter}>
              <TouchableOpacity
                style={styles.enhancedMoodModalSaveButton}
                onPress={() => {
                  setShowConversationModal(false);
                  Alert.alert(
                    'Conversation Mode Updated',
                    `You're now in "${getCurrentConversationState().label}" mode!`
                  );
                }}
              >
                <Text style={styles.enhancedMoodModalSaveText}>Set Mode</Text>
              </TouchableOpacity>
            </View>
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

      {/* Privacy Settings Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.privacyModalContainer}>
            <View style={styles.privacyModalHeader}>
              <Icon name="shield-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.privacyModalTitle}>Privacy Settings</Text>
              <TouchableOpacity
                style={styles.privacyModalCloseButton}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.privacyModalContent} showsVerticalScrollIndicator={false}>
              {/* Profile Visibility */}
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>Profile Visibility</Text>
                <Text style={styles.privacySectionDescription}>
                  Control who can see your profile information
                </Text>
                
                <View style={styles.privacyOptions}>
                  {[
                    { value: 'public', label: 'Public', description: 'Everyone can see your profile' },
                    { value: 'friends', label: 'Friends Only', description: 'Only your buddies can see your profile' },
                    { value: 'private', label: 'Private', description: 'Only you can see your profile' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.privacyOption,
                        privacySettings.profileVisibility === option.value && styles.privacyOptionSelected
                      ]}
                      onPress={() => handlePrivacySettingChange('profileVisibility', option.value)}
                    >
                      <View style={styles.privacyOptionContent}>
                        <Text style={[
                          styles.privacyOptionLabel,
                          privacySettings.profileVisibility === option.value && styles.privacyOptionLabelSelected
                        ]}>
                          {option.label}
                        </Text>
                        <Text style={styles.privacyOptionDescription}>
                          {option.description}
                        </Text>
                      </View>
                      <View style={[
                        styles.privacyRadioButton,
                        privacySettings.profileVisibility === option.value && styles.privacyRadioButtonSelected
                      ]}>
                        {privacySettings.profileVisibility === option.value && (
                          <View style={styles.privacyRadioButtonInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Activity & Status */}
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>Activity & Status</Text>
                
                {[
                  { key: 'showOnlineStatus', label: 'Show Online Status', description: 'Let others see when you\'re online' },
                  { key: 'showActivityFeed', label: 'Show Activity Feed', description: 'Display your recent activities' },
                  { key: 'showMoodStatus', label: 'Show Mood Status', description: 'Display your current mood' },
                  { key: 'showLastSeen', label: 'Show Last Seen', description: 'Display when you were last active' }
                ].map((setting) => (
                  <View key={setting.key} style={styles.privacyToggleContainer}>
                    <View style={styles.privacyToggleContent}>
                      <Text style={styles.privacyToggleLabel}>{setting.label}</Text>
                      <Text style={styles.privacyToggleDescription}>{setting.description}</Text>
                    </View>
                    <Switch
                      value={privacySettings[setting.key as keyof typeof privacySettings] as boolean}
                      onValueChange={(value) => handlePrivacySettingChange(setting.key, value)}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                      thumbColor={privacySettings[setting.key as keyof typeof privacySettings] ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </View>
                ))}
              </View>

              {/* Communication */}
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>Communication</Text>
                
                <View style={styles.privacyToggleContainer}>
                  <View style={styles.privacyToggleContent}>
                    <Text style={styles.privacyToggleLabel}>Allow Friend Requests</Text>
                    <Text style={styles.privacyToggleDescription}>Let others send you friend requests</Text>
                  </View>
                  <Switch
                    value={privacySettings.allowFriendRequests}
                    onValueChange={(value) => handlePrivacySettingChange('allowFriendRequests', value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                    thumbColor={privacySettings.allowFriendRequests ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                </View>

                <View style={styles.privacyToggleContainer}>
                  <View style={styles.privacyToggleContent}>
                    <Text style={styles.privacyToggleLabel}>Share Location</Text>
                    <Text style={styles.privacyToggleDescription}>Include location in your profile</Text>
                  </View>
                  <Switch
                    value={privacySettings.shareLocation}
                    onValueChange={(value) => handlePrivacySettingChange('shareLocation', value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                    thumbColor={privacySettings.shareLocation ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.privacyModalFooter}>
              <TouchableOpacity
                style={styles.privacyModalSaveButton}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Text style={styles.privacyModalSaveText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interest Tokens Modal */}
      <Modal
        visible={showInterestModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInterestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.interestModalContainer}>
            <View style={styles.interestModalHeader}>
              <Icon name="sparkles-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.interestModalTitle}>Choose Your Interests</Text>
              <TouchableOpacity
                style={styles.interestModalCloseButton}
                onPress={() => setShowInterestModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.interestModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.interestModalDescription}>
                Select your interests to help others connect with you. These will be visible on your profile.
              </Text>
              
              <View style={styles.interestTokensGrid}>
                {interestTokens.map((token) => (
                  <TouchableOpacity
                    key={token.id}
                    style={[
                      styles.interestTokenOption,
                      token.selected && styles.interestTokenOptionSelected
                    ]}
                    onPress={() => handleInterestTokenToggle(token.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.interestTokenOptionEmoji}>{token.emoji}</Text>
                    <Text style={[
                      styles.interestTokenOptionLabel,
                      token.selected && styles.interestTokenOptionLabelSelected
                    ]}>
                      {token.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.interestModalFooter}>
              <TouchableOpacity
                style={styles.interestModalSaveButton}
                onPress={handleInterestModalSave}
              >
                <Text style={styles.interestModalSaveText}>Save Interests</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trust Markers Modal */}
      <Modal
        visible={showTrustMarkersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTrustMarkersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.trustMarkersModalContainer}>
            <View style={styles.trustMarkersModalHeader}>
              <Icon name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.trustMarkersModalTitle}>Your Trust Markers</Text>
              <TouchableOpacity
                style={styles.trustMarkersModalCloseButton}
                onPress={() => setShowTrustMarkersModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.trustMarkersModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.trustMarkersModalDescription}>
                Trust markers help others understand your reliability and engagement level. Earn more by being active and respectful!
              </Text>
              
              {(() => {
                const categories = getTrustMarkersByCategory(trustMarkers);
                return Object.entries(categories).map(([categoryName, markers]) => (
                  markers.length > 0 && (
                    <View key={categoryName} style={styles.trustMarkersCategory}>
                      <Text style={styles.trustMarkersCategoryTitle}>
                        {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Markers
                      </Text>
                      <View style={styles.trustMarkersCategoryGrid}>
                        {markers.map((marker) => (
                          <View key={marker.id} style={styles.trustMarkerModalItem}>
                            <View style={[
                              styles.trustMarkerModalIconContainer,
                              { backgroundColor: marker.color + '20' }
                            ]}>
                              <Text style={styles.trustMarkerModalIcon}>{marker.icon}</Text>
                            </View>
                            <Text style={styles.trustMarkerModalTitle}>{marker.title}</Text>
                            <Text style={styles.trustMarkerModalDescription}>{marker.description}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )
                ));
              })()}
            </ScrollView>

            <View style={styles.trustMarkersModalFooter}>
              <TouchableOpacity
                style={styles.trustMarkersModalCloseButton}
                onPress={() => setShowTrustMarkersModal(false)}
              >
                <Text style={styles.trustMarkersModalCloseText}>Close</Text>
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
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  profileContent: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.success,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  displayName: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  username: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  moodButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
    ...theme.shadows.sm,
  },
  moodButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  moodText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  completionContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completionText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  completionBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  completionProgress: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: borderRadius.full,
  },
  completionPercentage: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  achievementsSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  achievementsTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  achievementsGrid: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    ...theme.typography.titleSmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  achievementDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  achievementProgress: {
    marginTop: spacing.xs,
  },
  achievementProgressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  achievementProgressText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  achievementsFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  achievementsFooterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activitySection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  activityList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  activityItem: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lastActivityItem: {
    marginBottom: 0,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityItemTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  activityItemDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  activityItemTime: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  activityFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  activityFooterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bioSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bioTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  bioContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  bioText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  addBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    alignSelf: 'flex-start',
  },
  addBioText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  statsSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statsTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  statsFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statsFooterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  statCardContent: {
    alignItems: 'center',
    padding: spacing.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...theme.shadows.sm,
  },
  statIcon: {
    fontSize: 20,
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
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTrendText: {
    ...theme.typography.bodySmall,
    color: theme.colors.success,
    fontWeight: '600',
    marginLeft: spacing.xs,
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
  // Mood Modal Styles
  moodModalContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  moodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  moodModalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  moodModalCloseButton: {
    padding: spacing.xs,
  },
  moodModalContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  moodModalDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  moodGrid: {
    gap: spacing.md,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
  },
  selectedMoodOption: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  moodOptionEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  moodOptionText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    flex: 1,
  },
  selectedMoodOptionText: {
    color: theme.colors.primary,
    fontWeight: '600',
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
  // Privacy Status Styles
  privacyStatusContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  privacyStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  privacyStatusText: {
    ...theme.typography.titleSmall,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  privacyStatusDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.lg,
  },
  // Privacy Modal Styles
  privacyModalContainer: {
    backgroundColor: theme.colors.surface,
    margin: spacing.lg,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
    flex: 1,
    ...theme.shadows.lg,
  },
  privacyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  privacyModalTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  privacyModalCloseButton: {
    padding: spacing.sm,
  },
  privacyModalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  privacySection: {
    marginVertical: spacing.lg,
  },
  privacySectionTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  privacySectionDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  privacyOptions: {
    gap: spacing.sm,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  privacyOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionLabel: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  privacyOptionLabelSelected: {
    color: theme.colors.primary,
  },
  privacyOptionDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  privacyRadioButton: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyRadioButtonSelected: {
    borderColor: theme.colors.primary,
  },
  privacyRadioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  privacyToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  privacyToggleContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  privacyToggleLabel: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  privacyToggleDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  privacyModalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  privacyModalSaveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  privacyModalSaveText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },

  // Interest Tokens Styles
  interestTokensSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  interestTokensHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  interestTokensTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  editInterestsButton: {
    padding: spacing.xs,
  },
  interestTokensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  interestToken: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  interestTokenEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  interestTokenLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.onPrimaryContainer,
    fontWeight: '500',
  },
  addInterestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderStyle: 'dashed',
  },
  addInterestsText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },

  // Interest Tokens Modal Styles
  interestModalContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  interestModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  interestModalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  interestModalCloseButton: {
    padding: spacing.xs,
  },
  interestModalContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  interestModalDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  interestTokensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  interestTokenOption: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    minWidth: 80,
  },
  interestTokenOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  interestTokenOptionEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  interestTokenOptionLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
    fontWeight: '500',
  },
  interestTokenOptionLabelSelected: {
    color: theme.colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  interestModalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  interestModalSaveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  interestModalSaveText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },

  // Conversation State Styles
  conversationStateSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  conversationStateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  conversationStateTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  editConversationStateButton: {
    padding: spacing.xs,
  },
  conversationStateContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  currentStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stateEmojiContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stateEmoji: {
    fontSize: 28,
  },
  stateInfoContainer: {
    flex: 1,
  },
  stateLabel: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  stateDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  availabilityText: {
    ...theme.typography.bodySmall,
    fontWeight: '500',
  },
  changeStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  changeStateText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },

  // Enhanced Mood Modal Styles
  enhancedMoodModalContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  enhancedMoodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  enhancedMoodModalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  enhancedMoodModalCloseButton: {
    padding: spacing.xs,
  },
  enhancedMoodModalContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  enhancedMoodModalDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  conversationStatesGrid: {
    gap: spacing.md,
  },
  conversationStateOption: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.sm,
  },
  conversationStateOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  conversationStateEmojiContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  conversationStateEmoji: {
    fontSize: 24,
  },
  conversationStateLabel: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  conversationStateLabelSelected: {
    color: theme.colors.onPrimaryContainer,
  },
  conversationStateDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  conversationStateAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationStateAvailabilityDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  conversationStateAvailabilityText: {
    ...theme.typography.bodySmall,
    fontWeight: '500',
  },
  enhancedMoodModalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  enhancedMoodModalSaveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  enhancedMoodModalSaveText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },

  // Trust Markers Styles
  trustMarkersSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  trustMarkersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  trustMarkersTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  trustScoreContainer: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  trustScoreText: {
    ...theme.typography.titleLarge,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  trustScoreLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  viewAllTrustMarkersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  viewAllTrustMarkersText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  trustMarkersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  trustMarker: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    minWidth: 80,
  },
  trustMarkerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  trustMarkerIcon: {
    fontSize: 20,
  },
  trustMarkerTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
    fontWeight: '500',
  },
  trustMarkerPoints: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  quickPlayButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  progressMarkersContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressMarkersTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  progressMarkersList: {
    gap: spacing.sm,
  },
  progressMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  progressMarkerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  progressMarkerIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  progressMarkerContent: {
    flex: 1,
  },
  progressMarkerTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.outline,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressMarkerText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  voiceVerificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  voiceVerificationText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: spacing.sm,
    flex: 1,
  },
  playingIndicator: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.success + '20',
    borderRadius: borderRadius.sm,
  },
  moreTrustMarkersButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderStyle: 'dashed',
  },
  moreTrustMarkersText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Trust Markers Modal Styles
  trustMarkersModalContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  trustMarkersModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  trustMarkersModalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  trustMarkersModalCloseButton: {
    padding: spacing.xs,
  },
  trustMarkersModalContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  trustMarkersModalDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  trustMarkersCategory: {
    marginBottom: spacing.lg,
  },
  trustMarkersCategoryTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  trustMarkersCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trustMarkerModalItem: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    minWidth: 100,
    marginBottom: spacing.sm,
  },
  trustMarkerModalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  trustMarkerModalIcon: {
    fontSize: 24,
  },
  trustMarkerModalTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  trustMarkerModalDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  trustMarkersModalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  trustMarkersModalCloseText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Voice Verification Modal Styles
  voiceVerificationModalContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  voiceVerificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  voiceVerificationModalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  voiceVerificationModalCloseButton: {
    padding: spacing.xs,
  },
  voiceVerificationModalContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  voiceVerificationModalDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  existingVoiceContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  existingVoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  existingVoiceTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  voiceSnippetInfo: {
    marginBottom: spacing.md,
  },
  voiceSnippetDuration: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  voiceSnippetDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  voiceSnippetPath: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontFamily: 'monospace',
  },
  voiceSnippetQuality: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  voiceSnippetSize: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  voiceSnippetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    flex: 1,
    justifyContent: 'center',
  },
  playVoiceText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onPrimary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  deleteVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: borderRadius.lg,
    flex: 1,
    justifyContent: 'center',
  },
  deleteVoiceText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onError,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  playbackProgressContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  playbackProgressBar: {
    height: 6,
    backgroundColor: theme.colors.outline,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  playbackProgressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  playbackTimeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  recordingVisualizer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  recordingCircle: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recordingDurationText: {
    ...theme.typography.titleLarge,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  recordingInstructions: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  recordButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  recordButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  recordingTips: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  voiceVerificationModalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  voiceVerificationModalCloseText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen;