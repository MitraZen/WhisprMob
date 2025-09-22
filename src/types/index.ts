export interface User {
  id: string;
  anonymousId: string;
  mood: MoodType;
  createdAt: Date;
  lastSeen: Date;
  email?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isEncrypted: boolean;
  mood?: MoodType;
}

export interface Chat {
  id: string;
  participants: string[];
  messages: Message[];
  createdAt: Date;
  lastMessage?: Message;
  isActive: boolean;
}

export type MoodType = 
  | 'happy' 
  | 'sad' 
  | 'excited' 
  | 'anxious' 
  | 'calm' 
  | 'angry' 
  | 'curious' 
  | 'lonely' 
  | 'grateful' 
  | 'hopeful';

export interface MoodConfig {
  emoji: string;
  color: string;
  description: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface AppState {
  currentMood: MoodType | null;
  activeChats: Chat[];
  availableConnections: User[];
}


