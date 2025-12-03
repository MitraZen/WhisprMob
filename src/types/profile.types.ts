// types/profile.types.ts

export interface ProfileData {
    displayName: string;
    username: string;
    hasChangedUsername?: boolean; // Track if user has changed username (one-time change allowed)
    bio: string;
    age: string;
    location: string;
    gender: string;
    mood: string;
    joinDate: Date;
    dateOfBirth: Date | null;
  }
  
  export interface UserStats {
    messagesSent: number;
    buddiesCount: number;
    notesShared: number;
  }
  
  export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    isUnlocked: boolean;
    progress: number;
    requirement: number;
    progressPercentage: number;
    points?: number;
    unlockedAt?: string;
  }
  
  export interface Activity {
    id: string;
    type: 'message' | 'buddy' | 'note' | 'profile' | 'achievement' | 'mood';
    title: string;
    description: string;
    icon: string;
    color: string;
    timestamp: Date;
    action: string;
  }
  
  export interface TrustMarker {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    category: 'activity' | 'communication' | 'verification' | 'community';
    requirement: string;
    points: number;
    maxProgress: number;
    progress: number;
    isEarned: boolean;
  }
  
  export interface InterestToken {
    id: string;
    emoji: string;
    label: string;
    selected: boolean;
    category?: string;
  }
  
  export interface ConversationState {
    currentMood: string;
    conversationMode: string;
    availability: string;
    lastUpdated: Date;
  }
  
  export interface ConversationStateOption {
    id: string;
    emoji: string;
    label: string;
    description: string;
    color: string;
    availability: string;
  }
  
  export interface PrivacySettings {
    profileVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    showActivityFeed: boolean;
    shareLocation: boolean;
    showMoodStatus: boolean;
    allowMessages: 'everyone' | 'friends' | 'none';
    showLastSeen: boolean;
  }
  
  export interface ProfileScreenProps {
    onNavigate: (screen: string) => void;
    user: any;
  }
