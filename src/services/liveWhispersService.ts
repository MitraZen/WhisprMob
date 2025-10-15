import { supabase } from '@/config/supabase';
import { MoodType } from '@/types';
import GeohashUtil from '@/utils/geohashUtil';

export interface Whispr {
  id: string;
  file_url: string;
  mood: string;
  listens: number;
  max_listens: number;
  expires_at: string;
  created_at: string;
  distance_km: number;
  is_echo: boolean;
}

export interface WhisprReaction {
  id: string;
  whispr_id: string;
  user_id: string;
  reaction_emoji: string;
  created_at: string;
}

export interface WhisperReply {
  id: string;
  whispr_id: string;
  reply_file_url: string;
  expires_at: string;
  created_at: string;
}

export interface WhisperEcho {
  id: string;
  original_whispr_id: string;
  echo_file_url: string;
  expires_at: string;
  created_at: string;
}

export interface CreateReplyData {
  whispr_id: string;
  reply_file_url: string;
  expires_at: string;
}

export interface CreateEchoData {
  original_whispr_id: string;
  echo_file_url: string;
  expires_at: string;
}

export interface WhisprReply {
  id: string;
  whispr_id: string;
  user_id: string;
  reply_file_url: string;
  expires_at: string;
  created_at: string;
}

export interface WhisprEcho {
  id: string;
  original_whispr_id: string;
  echo_user_id: string;
  echo_file_url: string;
  echo_geohash_lvl2: string;
  echo_geohash_lvl3: string;
  expires_at: string;
  created_at: string;
}

export interface CreateWhisprData {
  file_url: string;
  mood: MoodType;
  geohash_lvl2: string;
  geohash_lvl3: string;
  expires_at: string;
}

export interface CreateReplyData {
  whispr_id: string;
  reply_file_url: string;
  expires_at: string;
}

export interface CreateEchoData {
  original_whispr_id: string;
  echo_file_url: string;
  echo_geohash_lvl2: string;
  echo_geohash_lvl3: string;
  expires_at: string;
}

class LiveWhisprsService {
  private static instance: LiveWhisprsService;
  private realtimeSubscription: any = null;

  static getInstance(): LiveWhisprsService {
    if (!LiveWhisprsService.instance) {
      LiveWhisprsService.instance = new LiveWhisprsService();
    }
    return LiveWhisprsService.instance;
  }

  /**
   * Generate geohash for proximity-based whispr sharing
   */
  generateGeohash(latitude: number, longitude: number, precision: number): string {
    return GeohashUtil.generateGeohash(latitude, longitude, precision);
  }

  /**
   * Set current user's geohash for RLS policies
   */
  async setCurrentGeohash(geohashLvl2: string, geohashLvl3: string): Promise<void> {
    try {
      await supabase.rpc('set_config', {
        setting_name: 'app.current_geohash_lvl2',
        setting_value: geohashLvl2,
        is_local: true
      });
      
      await supabase.rpc('set_config', {
        setting_name: 'app.current_geohash_lvl3',
        setting_value: geohashLvl3,
        is_local: true
      });
    } catch (error) {
      console.error('Error setting geohash:', error);
    }
  }

  /**
   * Upload whispr audio file to Supabase Storage
   */
  async uploadWhisperAudio(file: Blob, userId: string): Promise<string> {
    try {
      const fileName = `${userId}/${Date.now()}_whispr.webm`;
      
      const { data, error } = await supabase.storage
        .from('whisprs')
        .upload(fileName, file, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('whisprs')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading whispr audio:', error);
      throw error;
    }
  }

  /**
   * Create a new whispr
   */
  async createWhispr(data: CreateWhisprData, userId: string): Promise<Whispr> {
    try {
      const { data: whisper, error } = await supabase
        .from('whisprs')
        .insert([{
          user_id: userId, // Use provided user ID for RLS policy
          file_url: data.file_url,
          mood: data.mood,
          geohash_lvl2: data.geohash_lvl2,
          geohash_lvl3: data.geohash_lvl3,
          expires_at: data.expires_at
        }])
        .select()
        .single();

      if (error) throw error;
      return whisper;
    } catch (error) {
      console.error('Error creating whispr:', error);
      throw error;
    }
  }

  /**
   * Get nearby whisprs for the current user
   */
  async getNearbyWhisprs(
    geohashLvl2: string, 
    geohashLvl3: string, 
    limit: number = 50
  ): Promise<Whispr[]> {
    try {
      await this.setCurrentGeohash(geohashLvl2, geohashLvl3);
      
      const { data, error } = await supabase
        .rpc('get_nearby_whisprs', {
          user_geohash_lvl2: geohashLvl2,
          user_geohash_lvl3: geohashLvl3,
          user_lat: 37.7749, // Mock latitude for now
          user_lng: -122.4194 // Mock longitude for now
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching nearby whisprs:', error);
      throw error;
    }
  }

  /**
   * Increment listen count for a whispr
   */
  async incrementWhisprListens(whisprId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('increment_whispr_listens', {
          whispr_uuid: whisprId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing whispr listens:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a whispr
   */
  async addReaction(whisprId: string, emoji: string): Promise<WhisprReaction> {
    try {
      const { data, error } = await supabase
        .from('whisprs_reactions')
        .insert([{
          whispr_id: whisprId,
          reaction_emoji: emoji
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Create a reply to a whisper
   */
  async createReply(data: CreateReplyData): Promise<WhisperReply> {
    try {
      const { data: reply, error } = await supabase
        .from('whisprs_replies')
        .insert([{
          whispr_id: data.whispr_id,
          reply_file_url: data.reply_file_url,
          expires_at: data.expires_at
        }])
        .select()
        .single();

      if (error) throw error;
      return reply;
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  }

  /**
   * Create an echo (rebroadcast) of a whisper
   */
  async createEcho(data: CreateEchoData): Promise<WhisperEcho> {
    try {
      const { data: echo, error } = await supabase
        .from('whisprs_echoes')
        .insert([{
          original_whispr_id: data.original_whispr_id,
          echo_file_url: data.echo_file_url,
          echo_geohash_lvl2: data.echo_geohash_lvl2,
          echo_geohash_lvl3: data.echo_geohash_lvl3,
          expires_at: data.expires_at
        }])
        .select()
        .single();

      if (error) throw error;
      return echo;
    } catch (error) {
      console.error('Error creating echo:', error);
      throw error;
    }
  }

  /**
   * Get reactions for a whisper
   */
  async getWhisperReactions(whisprId: string): Promise<WhisprReaction[]> {
    try {
      const { data, error } = await supabase
        .from('whisprs_reactions')
        .select('*')
        .eq('whispr_id', whisprId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching whisper reactions:', error);
      throw error;
    }
  }

  /**
   * Get replies for a whisper
   */
  async getWhisperReplies(whisprId: string): Promise<WhisperReply[]> {
    try {
      const { data, error } = await supabase
        .from('whisprs_replies')
        .select('*')
        .eq('whispr_id', whisprId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching whisper replies:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time whisper updates with enhanced functionality
   */
  subscribeToWhisprs(
    geohashLvl2: string,
    geohashLvl3: string,
    onNewWhispr: (whispr: Whispr) => void,
    onWhisprUpdate: (whispr: Whispr) => void,
    onNewReaction?: (reaction: WhisprReaction) => void
  ): void {
    try {
      console.log('🔄 Setting up real-time Live Whisprs subscription...');
      
      // Unsubscribe from previous subscription
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
      }

      // Subscribe to whisprs table changes
      this.realtimeSubscription = supabase
        .channel('live-whisprs')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whisprs',
            filter: `or(geohash_lvl2.eq.${geohashLvl2},geohash_lvl3.eq.${geohashLvl3})`
          },
          (payload) => {
            console.log('🆕 Real-time new whispr detected:', payload.new);
            onNewWhispr(payload.new as Whispr);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'whisprs'
          },
          (payload) => {
            console.log('🔄 Real-time whispr update:', payload.new);
            onWhisprUpdate(payload.new as Whispr);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whisprs_reactions'
          },
          (payload) => {
            console.log('❤️ Real-time new reaction:', payload.new);
            if (onNewReaction) {
              onNewReaction(payload.new as WhisprReaction);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Live Whisprs real-time subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Live Whisprs subscription error');
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ Live Whisprs subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('🔌 Live Whisprs subscription closed');
          }
        });

    } catch (error) {
      console.error('❌ Error subscribing to Live Whisprs:', error);
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromWhisprs(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
      console.log('Unsubscribed from live whisprs updates');
    }
  }

  /**
   * Get reactions for a specific whispr
   */
  async getWhisprReactions(whisprId: string): Promise<WhisprReaction[]> {
    try {
      const { data, error } = await supabase
        .from('whisprs_reactions')
        .select('*')
        .eq('whispr_id', whisprId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting whispr reactions:', error);
      throw error;
    }
  }


  /**
   * Clean up expired whisprs (called by CRON job)
   */
  async cleanupExpiredWhisprs(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_whisprs');
      if (error) throw error;
      console.log('Cleaned up expired whisprs');
    } catch (error) {
      console.error('Error cleaning up expired whisprs:', error);
      throw error;
    }
  }
}

export default LiveWhisprsService.getInstance();
