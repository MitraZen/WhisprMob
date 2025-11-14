/**
 * Profile Screen Utilities
 * Helper functions for profile-related operations
 */

import { ProfileData, Achievement, UserStats, TrustMarker } from '@/types/profile.types';
import { TRUST_MARKER_CONFIG } from '@/config/profile.config';

// ============================================================================
// Date & Time Utilities
// ============================================================================

/**
 * Format join date to a readable string
 * @param date - The join date
 * @returns Formatted date string
 */
export const formatJoinDate = (date: Date): string => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `Joined ${month} ${year}`;
};

/**
 * Calculate age from date of birth
 * @param dob - Date of birth
 * @returns Age string
 */
export const calculateAge = (dob: Date): string => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return `${age} years old`;
};

/**
 * Format date of birth for display
 * @param dob - Date of birth
 * @returns Formatted date string
 */
export const formatDateOfBirth = (dob: Date | null): string => {
  if (!dob) return 'Not specified';
  return dob.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// ============================================================================
// Gender Utilities
// ============================================================================

/**
 * Format gender string to display format
 * @param gender - Gender value from database
 * @returns Formatted gender string
 */
export const formatGender = (gender: string): string => {
  // TODO: Implement gender formatting logic
  // Example: "prefer_not_to_say" -> "Prefer not to say"
  const genderMap: { [key: string]: string } = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say'
  };
  return genderMap[gender] || gender;
};

/**
 * Get gender display value
 * @param gender - Gender value
 * @returns Display value or "Not specified"
 */
export const getGenderDisplay = (gender: string | null | undefined): string => {
  if (!gender || gender === 'Not specified') {
    return 'Not specified';
  }
  return formatGender(gender);
};

// ============================================================================
// Age Utilities
// ============================================================================

/**
 * Calculate age from date of birth or age value
 * @param age - Age value (number, string, or Date)
 * @returns Age display string
 */
export const calculateAgeDisplay = (age: string | number | Date | null | undefined): string => {
  if (!age) return 'Not specified';
  
  if (age instanceof Date) {
    return calculateAge(age);
  }
  
  if (typeof age === 'number') {
    return `${age} years old`;
  }
  
  if (typeof age === 'string') {
    // Check if it's already formatted
    if (age.includes('years old') || age === 'Not specified') {
      return age;
    }
    
    // Try to parse as number
    const numericAge = parseInt(age, 10);
    if (!isNaN(numericAge)) {
      return `${numericAge} years old`;
    }
    
    // Try to parse as date string
    const dateAge = new Date(age);
    if (!isNaN(dateAge.getTime())) {
      return calculateAge(dateAge);
    }
  }
  
  return age.toString();
};

// ============================================================================
// Trust Markers Utilities
// ============================================================================

/**
 * Calculate trust score from trust markers
 * @param trustMarkers - Array of trust markers
 * @returns Total trust score
 */
export const calculateTrustScore = (trustMarkers: TrustMarker[]): number => {
  // TODO: Implement trust score calculation
  return trustMarkers
    .filter(marker => marker.isEarned)
    .reduce((total, marker) => total + marker.points, 0);
};

/**
 * Evaluate trust markers based on user data
 * @param userData - User profile and activity data
 * @returns Array of evaluated trust markers
 */
export const evaluateTrustMarkers = (userData: any): TrustMarker[] => {
  const markers: TrustMarker[] = [];
  const { profile, stats, achievements } = userData;
  
  Object.values(TRUST_MARKER_CONFIG).forEach((config) => {
    let isEarned = false;
    let progress = 0;
    
    switch (config.requirement) {
      case 'lastActiveWithin7Days':
        if (profile?.last_seen) {
          const lastSeen = new Date(profile.last_seen);
          const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
          progress = Math.max(0, Math.min(7, 7 - daysSince));
          isEarned = daysSince <= 7;
        }
        break;
        
      case 'lastActiveWithin30Days':
        if (profile?.last_seen) {
          const lastSeen = new Date(profile.last_seen);
          const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
          progress = Math.max(0, Math.min(30, 30 - daysSince));
          isEarned = daysSince <= 30;
        }
        break;
        
      case 'profileComplete':
        const hasBio = profile?.bio && profile.bio !== 'No bio yet';
        const hasLocation = profile?.location && profile.location !== 'Not specified';
        const hasGender = profile?.gender && profile.gender !== 'Not specified';
        progress = [hasBio, hasLocation, hasGender].filter(Boolean).length;
        isEarned = progress >= 2;
        break;
        
      case 'hasInterestTokens':
        if (profile?.interests) {
          try {
            const interests = typeof profile.interests === 'string' 
              ? JSON.parse(profile.interests) 
              : profile.interests;
            if (Array.isArray(interests)) {
              const selectedCount = interests.filter((i: any) => i.selected).length;
              progress = Math.min(selectedCount, config.maxProgress);
              isEarned = selectedCount >= 3;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        break;
        
      case 'earlyJoinDate':
        if (profile?.created_at) {
          const joinDate = new Date(profile.created_at);
          const earlyCutoff = new Date('2024-12-31'); // Adjust as needed
          isEarned = joinDate < earlyCutoff;
          progress = isEarned ? 1 : 0;
        }
        break;
        
      default:
        // Default: not earned
        progress = 0;
        isEarned = false;
    }
    
    markers.push({
      ...config,
      isEarned,
      progress: Math.round(progress)
    });
  });
  
  return markers;
};

// ============================================================================
// Achievements Utilities
// ============================================================================

/**
 * Calculate achievements based on user stats
 * @param stats - User statistics
 * @param achievementConfigs - Achievement configurations
 * @returns Array of achievements with progress
 */
export const calculateAchievements = (stats: UserStats, achievementConfigs: any[]): Achievement[] => {
  // TODO: Implement achievement calculation logic
  const achievements: Achievement[] = [];
  
  // TODO: Evaluate each achievement based on stats
  // Check thresholds, calculate progress, determine if unlocked
  
  return achievements;
};

// ============================================================================
// Activity Utilities
// ============================================================================

/**
 * Format activity timestamp
 * @param timestamp - Activity timestamp
 * @returns Formatted time string
 */
export const formatActivityTime = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  return timestamp.toLocaleDateString();
};

/**
 * Get activity icon and color based on type
 * @param activityType - Type of activity
 * @returns Object with icon and color
 */
export const getActivityDisplay = (activityType: string): { icon: string; color: string } => {
  const displayMap: { [key: string]: { icon: string; color: string } } = {
    message: { icon: '💬', color: '#3b82f6' },
    buddy: { icon: '👥', color: '#10b981' },
    note: { icon: '📝', color: '#7c3aed' },
    profile: { icon: '👤', color: '#f59e0b' },
    achievement: { icon: '🏆', color: '#f59e0b' },
    mood: { icon: '😊', color: '#ec4899' },
  };
  
  return displayMap[activityType] || { icon: '📝', color: '#3b82f6' };
};

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate profile data
 * @param data - Profile data to validate
 * @returns Validation result with errors
 */
export const validateProfileData = (data: Partial<ProfileData>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // TODO: Implement validation logic
  // - Check required fields
  // - Validate field formats
  // - Check length limits
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate date of birth
 * @param dob - Date of birth
 * @returns True if valid
 */
export const isValidDateOfBirth = (dob: Date | null): boolean => {
  if (!dob) return true; // Optional field
  
  // TODO: Implement date validation
  // - Check if date is in the past
  // - Check if age is reasonable (e.g., 13-120 years)
  
  return true;
};

// ============================================================================
// Data Transformation Utilities
// ============================================================================

/**
 * Transform database profile data to ProfileData format
 * @param dbData - Data from database
 * @returns Formatted ProfileData
 */
export const transformProfileData = (dbData: any): ProfileData => {
  const dateOfBirth = dbData.date_of_birth 
    ? (dbData.date_of_birth instanceof Date ? dbData.date_of_birth : new Date(dbData.date_of_birth))
    : null;
  
  return {
    displayName: dbData.display_name || dbData.displayName || 'Anonymous User',
    username: dbData.username || 'anonymous',
    bio: dbData.bio || 'No bio yet',
    age: calculateAgeDisplay(dbData.age || dbData.date_of_birth || dateOfBirth),
    location: dbData.location || 'Not specified',
    gender: getGenderDisplay(dbData.gender),
    mood: dbData.mood || 'happy',
    joinDate: dbData.created_at 
      ? (dbData.created_at instanceof Date ? dbData.created_at : new Date(dbData.created_at))
      : new Date(),
    dateOfBirth,
  };
};

/**
 * Transform ProfileData to database format
 * @param profileData - Profile data
 * @returns Database-compatible object
 */
export const transformToDatabaseFormat = (profileData: Partial<ProfileData>): any => {
  const dbData: any = {};
  
  if (profileData.displayName !== undefined) {
    dbData.display_name = profileData.displayName;
  }
  
  if (profileData.bio !== undefined) {
    dbData.bio = profileData.bio;
  }
  
  if (profileData.location !== undefined) {
    dbData.location = profileData.location;
  }
  
  if (profileData.gender !== undefined) {
    // Convert display format back to database format if needed
    const genderMap: { [key: string]: string } = {
      'Male': 'male',
      'Female': 'female',
      'Other': 'other',
      'Prefer not to say': 'prefer_not_to_say',
    };
    dbData.gender = genderMap[profileData.gender] || profileData.gender;
  }
  
  if (profileData.mood !== undefined) {
    dbData.mood = profileData.mood;
  }
  
  if (profileData.dateOfBirth) {
    // Format as YYYY-MM-DD for date type in database
    const year = profileData.dateOfBirth.getFullYear();
    const month = String(profileData.dateOfBirth.getMonth() + 1).padStart(2, '0');
    const day = String(profileData.dateOfBirth.getDate()).padStart(2, '0');
    dbData.date_of_birth = `${year}-${month}-${day}`;
    // Also update age field for backward compatibility (extract number from "X years old")
    const ageStr = calculateAge(profileData.dateOfBirth);
    const ageMatch = ageStr.match(/(\d+)/);
    if (ageMatch) {
      dbData.age = parseInt(ageMatch[1], 10);
    }
  }
  
  return dbData;
};

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Get initials from display name
 * @param displayName - User's display name
 * @returns Initials string
 */
export const getInitials = (displayName: string): string => {
  if (!displayName || displayName.trim().length === 0) return '?';
  
  const parts = displayName.trim().split(' ').filter(part => part.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

