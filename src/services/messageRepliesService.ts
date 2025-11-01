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
    if (!messageIds || !messageIds.length) return {};

    // Filter out any invalid/empty message IDs
    const validMessageIds = messageIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    if (!validMessageIds.length) return {};

    // Batch queries if array is too large (PostgREST has limits)
    const BATCH_SIZE = 100;
    const result: Record<string, ReplyInfo> = {};

    try {
      // Process in batches to avoid query size limits
      for (let i = 0; i < validMessageIds.length; i += BATCH_SIZE) {
        const batch = validMessageIds.slice(i, i + BATCH_SIZE);
        
        try {
          // Query 1: Get replies where messageIds are reply messages
          const { data: repliesAsReplies, error: error1 } = await supabase
            .from('message_replies_view')
            .select('*')
            .in('reply_message_id', batch);

          if (error1) {
            console.warn(`Error fetching replies as replies (batch ${i / BATCH_SIZE + 1}):`, error1.message || error1);
          }

          // Query 2: Get replies where messageIds are original messages
          const { data: repliesAsOriginals, error: error2 } = await supabase
            .from('message_replies_view')
            .select('*')
            .in('original_message_id', batch);

          if (error2) {
            console.warn(`Error fetching replies as originals (batch ${i / BATCH_SIZE + 1}):`, error2.message || error2);
          }

          // Merge results from both queries for this batch
          const batchReplies = [...(repliesAsReplies || []), ...(repliesAsOriginals || [])];
          
          // Deduplicate by reply_id and add to result
          batchReplies.forEach((reply) => {
            if (reply?.reply_id && !result[reply.reply_id]) {
              // Store reply info for both the reply message and the original message
              if (reply.reply_message_id) {
                result[reply.reply_message_id] = reply;
              }
              if (reply.original_message_id) {
                result[reply.original_message_id] = reply;
              }
            }
          });

          // If both queries failed for this batch, log but continue
          if (error1 && error2) {
            console.warn(`Both queries failed for batch ${i / BATCH_SIZE + 1}, continuing with other batches`);
          }
        } catch (batchError: any) {
          console.warn(`Error processing batch ${i / BATCH_SIZE + 1}:`, batchError?.message || batchError);
          // Continue with next batch
        }
      }

      return result;
    } catch (error: any) {
      console.error('Error in getRepliesForMessages:', error?.message || error);
      // Return whatever we collected so far, or empty object
      return result;
    }
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


