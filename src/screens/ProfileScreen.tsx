/**
 * Profile Screen (Refactored)
 * Main screen component that orchestrates all profile-related components
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { spacing } from '@/utils/themes';
import { useAuth } from '@/store/AuthContext';
import { ProfileScreenProps } from '@/types/profile.types';
import { useProfileData } from '@/hooks/useProfileData';
import { BuddiesService } from '@/services/buddiesService';

// Components
import { ScreenHeader } from '@/components/Profile/ScreenHeader';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { ProfileOptions } from '@/components/Profile/ProfileOptions';
import { AchievementsSection } from '@/components/Profile/AchievementsSection';
import { InterestTokensSection } from '@/components/Profile/InterestTokensSection';
import { ConversationStateSection } from '@/components/Profile/ConversationStateSection';
import { TrustMarkersSection } from '@/components/Profile/TrustMarkersSection';
import { StatsSection } from '@/components/Profile/StatsSection';
import { ActivitySection } from '@/components/Profile/ActivitySection';
import { DeleteAccountSection } from '@/components/Profile/DeleteAccountSection';

// Modals
import { MoodModal } from '@/components/Profile/Modals/MoodModal';
import { EditProfileModal } from '@/components/Profile/Modals/EditProfileModal';
import { ConversationModal } from '@/components/Profile/Modals/ConversationModal';
import { PrivacyModal } from '@/components/Profile/Modals/PrivacyModal';
import { InterestModal } from '@/components/Profile/Modals/InterestModal';
import { TrustMarkersModal } from '@/components/Profile/Modals/TrustMarkersModal';

// Navigation
import { NavigationMenu } from '@/components/NavigationMenu';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate, user }) => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  
  // Use custom hook for all profile data and logic
  const profileData = useProfileData();

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Profile options configuration
  const profileOptions = [
    {
      id: 'edit',
      title: 'Edit Profile',
      subtitle: 'Update your bio, age, location, and gender',
      icon: 'create-outline',
      onPress: () => profileData.setShowEditProfileModal(true),
      color: '#7c3aed'
    }
  ];

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      await BuddiesService.deleteUserAccount(user.id);
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error; // Re-throw to let DeleteAccountSection handle the alert
    }
  };

  // Handle mood change
  const handleMoodChange = async (mood: string) => {
    await profileData.updateProfileData({ mood });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View 
          style={[
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <ScreenHeader
            onBack={() => onNavigate('settingsHub')}
            title="Profile"
            theme={theme}
          />
        </Animated.View>

        {/* Profile Header */}
        <ProfileHeader
          profileData={profileData.profileData}
          onMoodPress={() => profileData.setShowMoodModal(true)}
          onPrivacyPress={() => profileData.setShowPrivacyModal(true)}
          privacySettings={profileData.privacySettings}
          theme={theme}
        />

        {/* Profile Options */}
        <ProfileOptions
          options={profileOptions}
          theme={theme}
        />

        {/* Conversation State Section */}
        <ConversationStateSection
          conversationState={profileData.conversationState}
          onPress={() => profileData.setShowConversationModal(true)}
          theme={theme}
        />

        {/* Stats Section */}
        <StatsSection
          userStats={profileData.userStats}
          theme={theme}
        />

        {/* Interest Tokens Section */}
        <InterestTokensSection
          interestTokens={profileData.interestTokens}
          onPress={() => profileData.setShowInterestModal(true)}
          theme={theme}
        />

        {/* Achievements Section */}
        <AchievementsSection
          achievements={profileData.achievements}
          isExpanded={profileData.showAchievementsAccordion}
          onToggle={profileData.toggleAchievementsAccordion}
          accordionHeight={profileData.achievementsAccordionHeight}
          theme={theme}
        />

        {/* Trust Markers Section */}
        <TrustMarkersSection
          trustMarkers={profileData.trustMarkers}
          trustScore={profileData.trustScore}
          isExpanded={profileData.showTrustMarkersAccordion}
          onToggle={profileData.toggleTrustMarkersAccordion}
          accordionHeight={profileData.trustMarkersAccordionHeight}
          onViewAll={() => profileData.setShowTrustMarkersModal(true)}
          theme={theme}
        />

        {/* Activity Section */}
        <ActivitySection
          recentActivity={profileData.recentActivity}
          isExpanded={profileData.showActivityAccordion}
          onToggle={profileData.toggleActivityAccordion}
          accordionHeight={profileData.activityAccordionHeight}
          onMoodPress={() => profileData.setShowMoodModal(true)}
          onEditProfilePress={() => profileData.setShowEditProfileModal(true)}
          theme={theme}
        />

        {/* Delete Account Section */}
        <DeleteAccountSection
          onDelete={handleDeleteAccount}
          isLoading={profileData.isLoading}
          theme={theme}
        />
      </ScrollView>

      {/* Modals */}
      <MoodModal
        visible={profileData.showMoodModal}
        onClose={() => profileData.setShowMoodModal(false)}
        currentMood={profileData.profileData.mood}
        onMoodSelect={handleMoodChange}
        theme={theme}
      />

      <EditProfileModal
        visible={profileData.showEditProfileModal}
        onClose={() => profileData.setShowEditProfileModal(false)}
        profileData={profileData.profileData}
        onSave={profileData.updateProfileData}
        onCancel={() => {}}
        theme={theme}
      />

      <ConversationModal
        visible={profileData.showConversationModal}
        onClose={() => profileData.setShowConversationModal(false)}
        conversationState={profileData.conversationState}
        onStateChange={profileData.updateConversationState}
        theme={theme}
      />

      <PrivacyModal
        visible={profileData.showPrivacyModal}
        onClose={() => profileData.setShowPrivacyModal(false)}
        privacySettings={profileData.privacySettings}
        onSettingsChange={profileData.updatePrivacySettings}
        theme={theme}
      />

      <InterestModal
        visible={profileData.showInterestModal}
        onClose={() => profileData.setShowInterestModal(false)}
        interestTokens={profileData.interestTokens}
        onTokensChange={profileData.updateInterestTokens}
        theme={theme}
      />

      <TrustMarkersModal
        visible={profileData.showTrustMarkersModal}
        onClose={() => profileData.setShowTrustMarkersModal(false)}
        trustMarkers={profileData.trustMarkers}
        trustScore={profileData.trustScore}
        theme={theme}
      />

      {/* Navigation Menu */}
      <NavigationMenu currentScreen="profile" onNavigate={onNavigate} />
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
});

export default ProfileScreen;
