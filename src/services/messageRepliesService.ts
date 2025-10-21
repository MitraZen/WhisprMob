import { supabase } from '@/config/supabase';

export interface MessageReply {
  id: string;
  original_message_id: string;
  reply_message_id: string;
  created_at: string;
}

export interface ReplyInfo {
  reply_id: string;
  original_message_id: string;
  reply_message_id: string;
  created_at: string;
  original_content: string;
  original_sender_id: string;
  original_created_at: string;
  reply_content: string;
  reply_sender_id: string;
  reply_created_at: string;
}

export class MessageRepliesService {
  /**
   * Create a reply relationship between two messages
   */
  async createReply(originalMessageId: string, replyMessageId: string): Promise<MessageReply> {
    const { data, error } = await supabase
      .from('message_replies')
      .insert({
        original_message_id: originalMessageId,
        reply_message_id: replyMessageId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get reply information for a specific message
   */
  async getReplyForMessage(messageId: string): Promise<ReplyInfo | null> {
    const { data, error } = await supabase
      .from('message_replies_view')
      .select('*')
      .eq('reply_message_id', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - message is not a reply
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Get all replies to a specific message
   */
  async getRepliesToMessage(messageId: string): Promise<ReplyInfo[]> {
    const { data, error } = await supabase
      .from('message_replies_view')
      .select('*')
      .eq('original_message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get reply information for multiple messages at once
   */
  async getRepliesForMessages(messageIds: string[]): Promise<Record<string, ReplyInfo>> {
    if (!messageIds.length) return {};

    const { data, error } = await supabase
      .from('message_replies_view')
      .select('*')
      .or(`reply_message_id.in.(${messageIds.join(',')}),original_message_id.in.(${messageIds.join(',')})`);

    if (error) {
      throw error;
    }

    const result: Record<string, ReplyInfo> = {};
    data?.forEach((reply) => {
      // Store reply info for both the reply message and the original message
      result[reply.reply_message_id] = reply;
      result[reply.original_message_id] = reply;
    });

    return result;
  }

  /**
   * Delete a reply relationship
   */
  async deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase
      .from('message_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      throw error;
    }
  }

  /**
   * Delete reply by message ID (useful when deleting a message)
   */
  async deleteReplyByMessageId(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('message_replies')
      .delete()
      .eq('reply_message_id', messageId);

    if (error) {
      throw error;
    }
  }
}

export const messageRepliesService = new MessageRepliesService();


