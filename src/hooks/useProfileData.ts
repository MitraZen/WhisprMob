/**
 * Profile Data Hook
 * Custom hook for managing profile data, state, and business logic
 */

import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/store/AuthContext';
import { QueryCache } from '@/services/enhancedQueryCache';
import UserProfileDataService from '@/services/userProfileDataService';
import { BuddiesService } from '@/services/buddiesService';
import {
  ProfileData,
  UserStats,
  Achievement,
  Activity,
  InterestToken,
  TrustMarker,
  PrivacySettings,
  ConversationState,
} from '@/types/profile.types';
import {
  DEFAULT_PROFILE_DATA,
  DEFAULT_USER_STATS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_CONVERSATION_STATE,
  DEFAULT_INTEREST_TOKENS,
  CONVERSATION_STATES,
} from '@/config/profile.config';
import {
  transformProfileData,
  transformToDatabaseFormat,
  evaluateTrustMarkers,
  calculateTrustScore,
} from '@/utils/profile.utils';

// Hook return type
export interface UseProfileDataReturn {
  // Data
  profileData: ProfileData;
  userStats: UserStats;
  achievements: Achievement[];
  recentActivity: Activity[];
  interestTokens: InterestToken[];
  trustMarkers: TrustMarker[];
  trustScore: number;
  privacySettings: PrivacySettings;
  conversationState: ConversationState;
  
  // Loading states
  isLoading: boolean;
  
  // Modal states
  showMoodModal: boolean;
  showEditProfileModal: boolean;
  showConversationModal: boolean;
  showPrivacyModal: boolean;
  showInterestModal: boolean;
  showTrustMarkersModal: boolean;
  
  // Accordion states
  showAchievementsAccordion: boolean;
  showActivityAccordion: boolean;
  showTrustMarkersAccordion: boolean;
  
  // Animation refs
  achievementsAccordionHeight: Animated.Value;
  activityAccordionHeight: Animated.Value;
  trustMarkersAccordionHeight: Animated.Value;
  
  // Actions
  loadProfileData: () => Promise<void>;
  updateProfileData: (data: Partial<ProfileData>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateConversationState: (state: Partial<ConversationState>) => Promise<void>;
  updateInterestTokens: (tokens: InterestToken[]) => Promise<void>;
  toggleAchievementsAccordion: () => void;
  toggleActivityAccordion: () => void;
  toggleTrustMarkersAccordion: () => void;
  setShowMoodModal: (show: boolean) => void;
  setShowEditProfileModal: (show: boolean) => void;
  setShowConversationModal: (show: boolean) => void;
  setShowPrivacyModal: (show: boolean) => void;
  setShowInterestModal: (show: boolean) => void;
  setShowTrustMarkersModal: (show: boolean) => void;
}

export const useProfileData = (): UseProfileDataReturn => {
  const { user } = useAuth();
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>(DEFAULT_PROFILE_DATA);
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_USER_STATS);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [interestTokens, setInterestTokens] = useState<InterestToken[]>(DEFAULT_INTEREST_TOKENS);
  const [trustMarkers, setTrustMarkers] = useState<TrustMarker[]>([]);
  const [trustScore, setTrustScore] = useState(0);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [conversationState, setConversationState] = useState<ConversationState>(DEFAULT_CONVERSATION_STATE);
  
  // Modal states
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showTrustMarkersModal, setShowTrustMarkersModal] = useState(false);
  
  // Accordion states
  const [showAchievementsAccordion, setShowAchievementsAccordion] = useState(false);
  const [showActivityAccordion, setShowActivityAccordion] = useState(false);
  const [showTrustMarkersAccordion, setShowTrustMarkersAccordion] = useState(false);
  
  // Animation refs
  const achievementsAccordionHeight = useRef(new Animated.Value(0)).current;
  const activityAccordionHeight = useRef(new Animated.Value(0)).current;
  const trustMarkersAccordionHeight = useRef(new Animated.Value(0)).current;
  
  // ============================================================================
  // Data Loading
  // ============================================================================
  
  /**
   * Load profile data from database
   */
  const loadProfileData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // 1. Fetch user profile
      const profile = await BuddiesService.getUserProfile(user.id);
      if (profile) {
        const transformedProfile = transformProfileData(profile);
        setProfileData(transformedProfile);
        
        // Set conversation state from profile
        // Derive availability from conversation_mode if available
        let conversationMode = profile.conversation_mode;
        
        // If not in database, try to load from local storage (fallback)
        if (!conversationMode && user?.id) {
          try {
            const localMode = await AsyncStorage.getItem(`conversation_mode_${user.id}`);
            if (localMode) {
              conversationMode = localMode;
            }
          } catch (storageError) {
            console.error('Error loading conversation mode from local storage:', storageError);
          }
        }
        
        let availability = DEFAULT_CONVERSATION_STATE.availability;
        if (conversationMode) {
          const modeConfig = CONVERSATION_STATES.find(s => s.id === conversationMode);
          if (modeConfig) {
            availability = modeConfig.availability as any;
          }
        }
        
        setConversationState(prev => ({
          ...prev,
          currentMood: profile.mood || prev.currentMood,
          conversationMode: conversationMode || prev.conversationMode,
          availability: availability,
          lastUpdated: new Date(),
        }));
      }
      
      // 2. Fetch user stats
      const stats = await UserProfileDataService.getInstance().getUserStats(user.id);
      setUserStats({
        messagesSent: stats.messagesSent,
        buddiesCount: stats.buddiesCount,
        notesShared: stats.notesShared,
      });
      
      // 2.5. Check and create achievements based on real stats
      await UserProfileDataService.getInstance().checkAndCreateAchievements(user.id, {
        messagesSent: stats.messagesSent,
        buddiesCount: stats.buddiesCount,
        notesShared: stats.notesShared,
        lastActiveAt: profile?.last_seen || new Date().toISOString(),
      });
      
      // 3. Fetch and transform achievements
      const dbAchievements = await UserProfileDataService.getInstance().getRealAchievements(user.id);
      const transformedAchievements: Achievement[] = (dbAchievements || []).map(ach => ({
        id: ach.id,
        title: ach.achievement_name,
        description: ach.achievement_description,
        icon: ach.icon,
        color: '#3b82f6', // Default color
        isUnlocked: true,
        progress: 100,
        requirement: 100,
        progressPercentage: 100,
        points: ach.points,
        unlockedAt: ach.unlocked_at,
      }));
      setAchievements(transformedAchievements);
      
      // 4. Fetch recent activity
      const dbActivity = await UserProfileDataService.getInstance().getRealActivity(user.id);
      const transformedActivity: Activity[] = (dbActivity || []).map(act => ({
        id: act.id,
        type: act.activity_type === 'message_sent' ? 'message' :
              act.activity_type === 'note_shared' ? 'note' :
              act.activity_type === 'buddy_added' ? 'buddy' :
              act.activity_type === 'mood_changed' ? 'mood' :
              act.activity_type === 'profile_updated' ? 'profile' : 'message',
        title: act.activity_description,
        description: act.activity_description,
        icon: act.icon,
        color: act.color,
        timestamp: new Date(act.timestamp),
        action: act.activity_type,
      }));
      setRecentActivity(transformedActivity);
      
      // 5. Evaluate trust markers
      const markers = evaluateTrustMarkers({ 
        profile: profile || {}, 
        stats,
        achievements: transformedAchievements,
      });
      setTrustMarkers(markers);
      setTrustScore(calculateTrustScore(markers));
      
      // 6. Load interest tokens (if stored in profile)
      if (profile?.interests) {
        try {
          const savedInterests = typeof profile.interests === 'string' 
            ? JSON.parse(profile.interests) 
            : profile.interests;
          if (Array.isArray(savedInterests) && savedInterests.length > 0) {
            // Merge saved interests with default tokens to ensure all tokens are available
            const savedTokensMap = new Map(savedInterests.map((t: InterestToken) => [t.id, t]));
            
            // Create merged list: use saved tokens if they exist (preserving selection), otherwise use defaults
            const mergedTokens = DEFAULT_INTEREST_TOKENS.map(defaultToken => {
              const savedToken = savedTokensMap.get(defaultToken.id);
              if (savedToken) {
                // Preserve saved selection but use default category if missing
                return {
                  ...defaultToken,
                  selected: savedToken.selected,
                  category: savedToken.category || defaultToken.category,
                };
              }
              return defaultToken;
            });
            
            setInterestTokens(mergedTokens);
          } else {
            // If no saved interests, use default tokens
            setInterestTokens(DEFAULT_INTEREST_TOKENS);
          }
        } catch (e) {
          console.error('Error parsing interests:', e);
          // On error, use default tokens
          setInterestTokens(DEFAULT_INTEREST_TOKENS);
        }
      } else {
        // If no interests in profile, use default tokens
        setInterestTokens(DEFAULT_INTEREST_TOKENS);
      }
      
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ============================================================================
  // Data Updates
  // ============================================================================
  
  /**
   * Update profile data
   */
  const updateProfileData = async (data: Partial<ProfileData>) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Transform data to database format
      const dbData = transformToDatabaseFormat(data);
      
      // Update in database
      await BuddiesService.updateUserProfile(user.id, dbData);
      
      // Invalidate cache
      QueryCache.invalidateUserProfile(user.id);
      
      // Update local state
      setProfileData(prev => ({ ...prev, ...data }));
      
      // Reload profile data to ensure consistency
      await loadProfileData();
    } catch (error) {
      console.error('Error updating profile data:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Update privacy settings
   */
  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!user?.id) return;
    
    try {
      // TODO: Implement privacy settings update logic
      // Save to database and update local state
      
      setPrivacySettings(prev => ({ ...prev, ...settings }));
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  };
  
  /**
   * Update conversation state
   */
  const updateConversationState = async (state: Partial<ConversationState>) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Prepare data to save to database
      // Only save conversation_mode and mood - availability is derived from conversation_mode
      const dbData: any = {};
      if (state.conversationMode) {
        dbData.conversation_mode = state.conversationMode;
      }
      if (state.currentMood) {
        dbData.mood = state.currentMood;
      }
      
      // Update in database (only if we have data to save)
      if (Object.keys(dbData).length > 0) {
        try {
          await BuddiesService.updateUserProfile(user.id, dbData);
          
          // Invalidate cache
          QueryCache.invalidateUserProfile(user.id);
        } catch (dbError: any) {
          // If column doesn't exist, store locally as fallback
          if (dbError?.message?.includes('conversation_mode') || dbError?.message?.includes('PGRST204')) {
            console.warn('⚠️ conversation_mode column not found in database. Please run the migration: database/add_conversation_mode_column.sql');
            console.warn('⚠️ Conversation mode will be stored locally until migration is applied.');
            
            // Store conversation mode locally as fallback
            if (state.conversationMode && user?.id) {
              try {
                await AsyncStorage.setItem(
                  `conversation_mode_${user.id}`,
                  state.conversationMode
                );
              } catch (storageError) {
                console.error('Error storing conversation mode locally:', storageError);
              }
            }
          } else {
            throw dbError; // Re-throw if it's a different error
          }
        }
      }
      
      // Update local state regardless of database update result
      // Derive availability from conversation mode if not explicitly provided
      let updatedState = { ...state };
      if (state.conversationMode && !state.availability) {
        const modeConfig = CONVERSATION_STATES.find(s => s.id === state.conversationMode);
        if (modeConfig) {
          updatedState.availability = modeConfig.availability as any;
        }
      }
      
      setConversationState(prev => ({
        ...prev,
        ...updatedState,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error updating conversation state:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Update interest tokens
   */
  const updateInterestTokens = async (tokens: InterestToken[]) => {
    if (!user?.id) return;
    
    try {
      // TODO: Implement interest tokens update logic
      // Save to database and update local state
      
      setInterestTokens(tokens);
      
      // Re-evaluate trust markers that depend on interest tokens
      // const markers = evaluateTrustMarkers({ interestTokens: tokens });
      // setTrustMarkers(markers);
      // setTrustScore(calculateTrustScore(markers));
    } catch (error) {
      console.error('Error updating interest tokens:', error);
      throw error;
    }
  };
  
  // ============================================================================
  // Accordion Toggles
  // ============================================================================
  
  /**
   * Toggle achievements accordion
   */
  const toggleAchievementsAccordion = () => {
    const toValue = showAchievementsAccordion ? 0 : 1;
    setShowAchievementsAccordion(!showAchievementsAccordion);
    
    Animated.timing(achievementsAccordionHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  /**
   * Toggle activity accordion
   */
  const toggleActivityAccordion = () => {
    const toValue = showActivityAccordion ? 0 : 1;
    setShowActivityAccordion(!showActivityAccordion);
    
    Animated.timing(activityAccordionHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  /**
   * Toggle trust markers accordion
   */
  const toggleTrustMarkersAccordion = () => {
    const toValue = showTrustMarkersAccordion ? 0 : 1;
    setShowTrustMarkersAccordion(!showTrustMarkersAccordion);
    
    Animated.timing(trustMarkersAccordionHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  // ============================================================================
  // Effects
  // ============================================================================
  
  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);
  
  // ============================================================================
  // Return
  // ============================================================================
  
  return {
    // Data
    profileData,
    userStats,
    achievements,
    recentActivity,
    interestTokens,
    trustMarkers,
    trustScore,
    privacySettings,
    conversationState,
    
    // Loading states
    isLoading,
    
    // Modal states
    showMoodModal,
    showEditProfileModal,
    showConversationModal,
    showPrivacyModal,
    showInterestModal,
    showTrustMarkersModal,
    
    // Accordion states
    showAchievementsAccordion,
    showActivityAccordion,
    showTrustMarkersAccordion,
    
    // Animation refs
    achievementsAccordionHeight,
    activityAccordionHeight,
    trustMarkersAccordionHeight,
    
    // Actions
    loadProfileData,
    updateProfileData,
    updatePrivacySettings,
    updateConversationState,
    updateInterestTokens,
    toggleAchievementsAccordion,
    toggleActivityAccordion,
    toggleTrustMarkersAccordion,
    setShowMoodModal,
    setShowEditProfileModal,
    setShowConversationModal,
    setShowPrivacyModal,
    setShowInterestModal,
    setShowTrustMarkersModal,
  };
};

