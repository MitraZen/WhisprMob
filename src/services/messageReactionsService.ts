import { supabase } from '@/config/supabase';

export type Emoji = '❤️' | '😆' | '😮' | '😢' | '🙏';

export interface MessageReactionCount {
  message_id: string;
  emoji: Emoji | string;
  count: number;
}

export class MessageReactionsService {
  private static readonly QUICK_EMOJIS: Emoji[] = ['❤️', '😆', '😮', '😢', '🙏'];

  getQuickEmojis(): Emoji[] {
    return MessageReactionsService.QUICK_EMOJIS;
  }

  async toggleReaction(messageId: string, emoji: Emoji, userId: string): Promise<'added' | 'removed'> {
    // Try to insert; on unique violation remove instead (toggle)
    const insertResp = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, reactor_id: userId, emoji })
      .select('id')
      .single();

    if (!insertResp.error) {
      return 'added';
    }

    const code = (insertResp.error as any)?.code;
    if (code === '23505') {
      // Unique violation -> delete to toggle off
      const delResp = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('reactor_id', userId)
        .eq('emoji', emoji);
      if (delResp.error) throw delResp.error;
      return 'removed';
    }

    throw insertResp.error;
  }

  async getCountsForMessageIds(messageIds: string[]): Promise<Record<string, Record<string, number>>> {
    if (!messageIds.length) return {};

    // Query the aggregated view
    const { data, error } = await supabase
      .from('message_reaction_counts')
      .select('*')
      .in('message_id', messageIds);

    if (error) {
      console.warn('⚠️ Failed to fetch reaction counts:', error);
      return {};
    }

    const result: Record<string, Record<string, number>> = {};
    for (const row of (data as MessageReactionCount[])) {
      if (!result[row.message_id]) result[row.message_id] = {};
      result[row.message_id][row.emoji] = row.count;
    }
    return result;
  }
}

export const messageReactionsService = new MessageReactionsService();

