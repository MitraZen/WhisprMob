/**
 * Whispr Note Reply Types
 * Types and interfaces for reply threads feature
 */

import { MoodType } from './index';

export interface WhisprNoteReply {
  id: string;
  note_id: string;
  parent_reply_id: string | null;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  mood?: MoodType | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  // Computed fields
  nestedReplies?: WhisprNoteReply[];
}

export interface CreateReplyData {
  note_id: string;
  parent_reply_id?: string | null;
  content: string;
  is_anonymous?: boolean;
  mood?: MoodType | null;
}

export interface ReplyThread {
  rootReplies: WhisprNoteReply[];
  totalCount: number;
}

