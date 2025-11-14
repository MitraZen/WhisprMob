/**
 * Profile Screen Configuration
 * All constants, configurations, and static data for the Profile feature
 */

import { ConversationStateOption, InterestToken } from '@/types/profile.types';

// Re-export types for config usage
export interface TrustMarkerConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'activity' | 'communication' | 'verification' | 'community';
  requirement: string;
  points: number;
  maxProgress: number;
}

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  type: 'messagesSent' | 'buddiesCount' | 'notesShared' | 'joinDate';
  threshold: number;
  points: number;
}

// ============================================================================
// Trust Markers Configuration
// ============================================================================

export const TRUST_MARKER_CONFIG: Record<string, TrustMarkerConfig> = {
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

// ============================================================================
// Conversation States Configuration
// ============================================================================

export const CONVERSATION_STATES: ConversationStateOption[] = [
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
    id: 'focused',
    emoji: '🎯',
    label: 'Focused',
    description: 'Looking for specific topics',
    color: '#f59e0b',
    availability: 'medium'
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
    id: 'away',
    emoji: '😴',
    label: 'Away',
    description: 'Not available for chat',
    color: '#6b7280',
    availability: 'none'
  }
];

// ============================================================================
// Achievements Configuration
// ============================================================================

export const ACHIEVEMENT_CONFIG: AchievementConfig[] = [
  // TODO: Add achievement configurations here
  // Example structure:
  // {
  //   id: 'firstMessage',
  //   title: 'First Message',
  //   description: 'Send your first message',
  //   icon: '💬',
  //   color: '#3b82f6',
  //   type: 'messagesSent',
  //   threshold: 1,
  //   points: 10
  // }
];

// ============================================================================
// Interest Tokens Default Configuration
// ============================================================================

export const DEFAULT_INTEREST_TOKENS: InterestToken[] = [
  // 🎯 Lifestyle & Vibes
  { id: 'movies', emoji: '🎬', label: 'Movies', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'series', emoji: '📺', label: 'Series', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'selfcare', emoji: '✨', label: 'Self-Care', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'nightlife', emoji: '🌙', label: 'Nightlife', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'shopping', emoji: '🛍️', label: 'Shopping', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'fashion', emoji: '👗', label: 'Fashion', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'makeup', emoji: '💄', label: 'Makeup', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'pets', emoji: '🐾', label: 'Pets', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'cycling', emoji: '🚴', label: 'Cycling', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'running', emoji: '🏃', label: 'Running', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'yoga', emoji: '🧘‍♀️', label: 'Yoga', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'cooking', emoji: '🍳', label: 'Cooking', selected: false, category: 'Lifestyle & Vibes' },
  { id: 'baking', emoji: '🧁', label: 'Baking', selected: false, category: 'Lifestyle & Vibes' },
  
  // 🎵 Music & Audio
  { id: 'music', emoji: '🎵', label: 'Music', selected: true, category: 'Music & Audio' },
  { id: 'podcasts', emoji: '🎧', label: 'Podcasts', selected: false, category: 'Music & Audio' },
  { id: 'singing', emoji: '🎤', label: 'Singing', selected: false, category: 'Music & Audio' },
  { id: 'instrumental', emoji: '🎹', label: 'Instrumental', selected: false, category: 'Music & Audio' },
  { id: 'dance', emoji: '💃', label: 'Dance', selected: false, category: 'Music & Audio' },
  
  // 🌍 Social & Modern Interests
  { id: 'memes', emoji: '🤣', label: 'Memes', selected: false, category: 'Social & Modern Interests' },
  { id: 'vlogging', emoji: '📹', label: 'Vlogging', selected: false, category: 'Social & Modern Interests' },
  { id: 'content_creation', emoji: '🎥', label: 'Content Creation', selected: false, category: 'Social & Modern Interests' },
  { id: 'socialmedia', emoji: '📱', label: 'Social Media', selected: false, category: 'Social & Modern Interests' },
  { id: 'stocks', emoji: '📈', label: 'Stocks', selected: false, category: 'Social & Modern Interests' },
  { id: 'startups', emoji: '🚀', label: 'Startups', selected: false, category: 'Social & Modern Interests' },
  { id: 'crypto', emoji: '🪙', label: 'Crypto', selected: false, category: 'Social & Modern Interests' },
  { id: 'ai', emoji: '🤖', label: 'AI', selected: false, category: 'Social & Modern Interests' },
  { id: 'coding', emoji: '👨‍💻', label: 'Coding', selected: false, category: 'Social & Modern Interests' },
  
  // 🍀 Nature & Outdoors
  { id: 'nature', emoji: '🌿', label: 'Nature', selected: true, category: 'Nature & Outdoors' },
  { id: 'beach', emoji: '🏖️', label: 'Beach', selected: false, category: 'Nature & Outdoors' },
  { id: 'mountains', emoji: '⛰️', label: 'Mountains', selected: false, category: 'Nature & Outdoors' },
  { id: 'gardening', emoji: '🌱', label: 'Gardening', selected: false, category: 'Nature & Outdoors' },
  { id: 'astronomy', emoji: '🌌', label: 'Astronomy', selected: false, category: 'Nature & Outdoors' },
  { id: 'animals', emoji: '🦊', label: 'Animals', selected: false, category: 'Nature & Outdoors' },
  
  // 🍽️ Food & Drinks
  { id: 'food', emoji: '🍕', label: 'Food', selected: true, category: 'Food & Drinks' },
  { id: 'coffee', emoji: '☕', label: 'Coffee', selected: false, category: 'Food & Drinks' },
  { id: 'tea', emoji: '🍵', label: 'Tea', selected: false, category: 'Food & Drinks' },
  { id: 'beer', emoji: '🍺', label: 'Beer', selected: false, category: 'Food & Drinks' },
  { id: 'wine', emoji: '🍷', label: 'Wine', selected: false, category: 'Food & Drinks' },
  { id: 'desserts', emoji: '🍰', label: 'Desserts', selected: false, category: 'Food & Drinks' },
  { id: 'street_food', emoji: '🍢', label: 'Street Food', selected: false, category: 'Food & Drinks' },
  
  // 🎮 Games & Hobbies
  { id: 'gaming', emoji: '🎮', label: 'Gaming', selected: false, category: 'Games & Hobbies' },
  { id: 'chess', emoji: '♟️', label: 'Chess', selected: false, category: 'Games & Hobbies' },
  { id: 'boardgames', emoji: '🎲', label: 'Board Games', selected: false, category: 'Games & Hobbies' },
  { id: 'puzzles', emoji: '🧩', label: 'Puzzles', selected: false, category: 'Games & Hobbies' },
  { id: 'collectibles', emoji: '🃏', label: 'Collectibles', selected: false, category: 'Games & Hobbies' },
  { id: 'anime', emoji: '🧿', label: 'Anime', selected: false, category: 'Games & Hobbies' },
  { id: 'comics', emoji: '📚', label: 'Comics', selected: false, category: 'Games & Hobbies' },
  
  // 🚗 Travel & Culture
  { id: 'travel', emoji: '🌍', label: 'Travel', selected: false, category: 'Travel & Culture' },
  { id: 'roadtrips', emoji: '🚗', label: 'Road Trips', selected: false, category: 'Travel & Culture' },
  { id: 'culture', emoji: '🎎', label: 'Culture', selected: false, category: 'Travel & Culture' },
  { id: 'festivals', emoji: '🎉', label: 'Festivals', selected: false, category: 'Travel & Culture' },
  { id: 'heritage', emoji: '🏛️', label: 'Heritage', selected: false, category: 'Travel & Culture' },
  
  // 📚 Mind & Growth
  { id: 'books', emoji: '📚', label: 'Books', selected: true, category: 'Mind & Growth' },
  { id: 'journaling', emoji: '📓', label: 'Journaling', selected: false, category: 'Mind & Growth' },
  { id: 'productivity', emoji: '⚡', label: 'Productivity', selected: false, category: 'Mind & Growth' },
  { id: 'learning', emoji: '🧠', label: 'Learning', selected: false, category: 'Mind & Growth' },
  { id: 'psychology', emoji: '🧬', label: 'Psychology', selected: false, category: 'Mind & Growth' },
  { id: 'philosophy', emoji: '📖', label: 'Philosophy', selected: false, category: 'Mind & Growth' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation', selected: false, category: 'Mind & Growth' },
  
  // 🎁 Cute & Aesthetic Interests
  { id: 'art', emoji: '🎨', label: 'Art', selected: false, category: 'Cute & Aesthetic Interests' },
  { id: 'photography', emoji: '📸', label: 'Photography', selected: false, category: 'Cute & Aesthetic Interests' },
  { id: 'minimalism', emoji: '🤍', label: 'Minimalism', selected: false, category: 'Cute & Aesthetic Interests' },
  { id: 'aesthetic', emoji: '🌈', label: 'Aesthetic', selected: false, category: 'Cute & Aesthetic Interests' },
  { id: 'cottagecore', emoji: '🌼', label: 'Cottagecore', selected: false, category: 'Cute & Aesthetic Interests' },
  { id: 'kpop', emoji: '🎶', label: 'K-Pop', selected: false, category: 'Cute & Aesthetic Interests' },
  { id: 'petsitting', emoji: '🐶', label: 'Pet Sitting', selected: false, category: 'Cute & Aesthetic Interests' },
  
  // 💪 Fitness & Health
  { id: 'fitness', emoji: '💪', label: 'Fitness', selected: false, category: 'Fitness & Health' },
  { id: 'tech', emoji: '💻', label: 'Tech', selected: false, category: 'Tech & Innovation' },
];

// ============================================================================
// Privacy Options Configuration
// ============================================================================

export const PRIVACY_VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Everyone can see your profile' },
  { value: 'friends', label: 'Friends Only', description: 'Only your buddies can see your profile' },
  { value: 'private', label: 'Private', description: 'Only you can see your profile' }
] as const;

export const MESSAGE_ALLOWANCE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', description: 'Anyone can message you' },
  { value: 'friends', label: 'Friends Only', description: 'Only your buddies can message you' },
  { value: 'none', label: 'None', description: 'No one can message you' }
] as const;

// ============================================================================
// Gender Options
// ============================================================================

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
] as const;

// ============================================================================
// Animation Constants
// ============================================================================

export const ACCORDION_ANIMATION_DURATION = 300;
export const FADE_ANIMATION_DURATION = 300;
export const SLIDE_ANIMATION_DURATION = 300;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PROFILE_DATA = {
  displayName: 'Anonymous User',
  username: 'anonymous',
  bio: 'No bio yet',
  age: 'Not specified',
  location: 'Not specified',
  gender: 'Not specified',
  mood: 'happy',
  joinDate: new Date(),
  dateOfBirth: null as Date | null,
};

export const DEFAULT_USER_STATS = {
  messagesSent: 0,
  buddiesCount: 0,
  notesShared: 0,
};

export const DEFAULT_PRIVACY_SETTINGS = {
  profileVisibility: 'public' as const,
  showOnlineStatus: true,
  allowFriendRequests: true,
  showActivityFeed: true,
  shareLocation: false,
  showMoodStatus: true,
  allowMessages: 'everyone' as const,
  showLastSeen: true,
};

export const DEFAULT_CONVERSATION_STATE = {
  currentMood: 'happy',
  conversationMode: 'open' as const,
  availability: 'high' as const,
  lastUpdated: new Date(),
};

