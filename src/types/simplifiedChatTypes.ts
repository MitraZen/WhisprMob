// =====================================================
// SIMPLIFIED TAP TO CHAT - PHASE 1: TYPE DEFINITIONS
// =====================================================
// Updated TypeScript interfaces to match the new database schema

export interface TextWhispr {
  id: string;
  content: string;
  character_count: number;
  mood: string;
  is_anonymous: boolean;
  created_at: string;
  expires_at: string;
  radius_meters: number;
  
  // New fields for simplified chat logic
  chat_room_created: boolean;
  chat_participant_count: number;
  is_chat_full: boolean;
  expiration_reason: 'time' | 'capacity' | 'manual';
}

export interface ChatRoom {
  id: string;
  whispr_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  
  // New fields for simplified chat logic
  expires_when_full: boolean;
  participant_count: number;
  expiration_triggered: boolean;
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  anonymous_name: string;
  joined_at: string;
  last_seen_at: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_user_id: string;
  message_text: string;
  character_count: number;
  created_at: string;
}

// New enum for whispr chat status
export enum WhisprChatStatus {
  AVAILABLE = 'available',
  WAITING_FOR_PARTNER = 'waiting_for_partner',
  CHAT_FULL = 'chat_full',
  EXPIRED_TIME = 'expired_time',
  EXPIRED_CAPACITY = 'expired_capacity',
  NOT_FOUND = 'not_found'
}

// New interface for chat status response
export interface WhisprChatStatusResponse {
  status: WhisprChatStatus;
  canJoin: boolean;
  participantCount: number;
  timeUntilExpiry?: number; // milliseconds
  expirationReason?: 'time' | 'capacity' | 'manual';
}

// Updated interface for creating text whisprs
export interface CreateTextWhisprData {
  content: string;
  mood: string;
  is_anonymous?: boolean;
  radius_meters?: number;
  userId?: string;
}

// New interface for chat room creation with simplified logic
export interface CreateChatRoomData {
  whisprId: string;
  userId: string;
  expiresWhenFull?: boolean;
}

// Updated interface for joining chat rooms
export interface JoinChatRoomData {
  chatRoomId: string;
  userId: string;
}

// New interface for whispr expiration check
export interface WhisprExpirationCheck {
  isExpired: boolean;
  expirationReason?: 'time' | 'capacity' | 'manual';
  timeUntilExpiry?: number; // milliseconds
  canAcceptChat: boolean;
}

// Database function return types
export interface WhisprWithChatStatus extends TextWhispr {
  chat_status: WhisprChatStatus;
  distance_km: number;
}

// New interface for the simplified chat flow
export interface SimplifiedChatFlow {
  whispr: TextWhispr;
  chatStatus: WhisprChatStatus;
  canJoin: boolean;
  participantCount: number;
  timeUntilExpiry?: number;
  expirationReason?: 'time' | 'capacity' | 'manual';
}

