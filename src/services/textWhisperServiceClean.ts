import { supabase } from '@/config/supabase';

export interface TextWhispr {
  id: string;
  content: string;
  character_count: number;
  mood: string;
  is_anonymous: boolean;
  created_at: string;
  expires_at: string;
  radius_meters: number;
}

class TextWhisperService {
  private static instance: TextWhisperService;

  static getInstance(): TextWhisperService {
    if (!TextWhisperService.instance) {
      TextWhisperService.instance = new TextWhisperService();
    }
    return TextWhisperService.instance;
  }

  /**
   * Validate whispr content
   */
  validateContent(content: string): { isValid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: 'Content cannot be empty' };
    }

    if (content.length > 280) {
      return { isValid: false, error: 'Content cannot exceed 280 characters' };
    }

    return { isValid: true };
  }

  /**
   * Create a new text whispr
   */
  async createTextWhispr(data: {
    content: string;
    mood: string;
    is_anonymous?: boolean;
    radius_meters?: number;
    userId?: string;
  }): Promise<TextWhispr> {
    try {
      console.log('📝 Creating text whispr:', data);

      // Get current user - use passed userId or get from auth
      let userId = data.userId;
      if (!userId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('User not authenticated');
        }
        userId = user.id;
      }

      // Validate content
      if (!data.content || data.content.trim().length === 0) {
        throw new Error('Content cannot be empty');
      }

      if (data.content.length > 280) {
        throw new Error('Content cannot exceed 280 characters');
      }

      const trimmedContent = data.content.trim();
      const characterCount = trimmedContent.length;

      // Use the simplified function with 10-minute expiry
      const { data: whisprData, error } = await supabase.rpc('create_text_whispr_simplified', {
        p_content: trimmedContent,
        p_mood: data.mood,
        p_user_id: userId,
        p_is_anonymous: data.is_anonymous || false,
        p_radius_meters: data.radius_meters || 1000
      });

      if (error) {
        console.log('⚠️ Could not create whispr:', error);
        throw new Error(`Failed to create whispr: ${error.message}`);
      }

      console.log('✅ Text whispr created successfully');
      return whisprData;
    } catch (error) {
      console.error('❌ Error in createTextWhispr:', error);
      throw error;
    }
  }

  /**
   * Get nearby text whisprs
   */
  async getNearbyTextWhisprs(limit: number = 20, radiusMeters?: number): Promise<TextWhispr[]> {
    try {
      console.log('📍 Fetching nearby text whisprs...');
      if (radiusMeters) {
        console.log(`📍 Filtering by radius: ${radiusMeters}m`);
      }

      const { data, error } = await supabase
        .from('whisprs')
        .select(`
          id,
          content,
          character_count,
          mood,
          is_anonymous,
          created_at,
          expires_at,
          radius_meters
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching whisprs:', error);
        throw new Error(`Failed to fetch whisprs: ${error.message}`);
      }

      // Filter by radius if specified
      let filteredData = data || [];
      if (radiusMeters && data) {
        filteredData = data.filter(whispr => {
          const whisprRadius = whispr.radius_meters || 1000;
          return whisprRadius <= radiusMeters;
        });
        console.log(`📍 Filtered from ${data.length} to ${filteredData.length} whisprs`);
      }

      console.log('✅ Found', filteredData.length, 'nearby text whisprs');
      return filteredData;
    } catch (error) {
      console.error('❌ Error in getNearbyTextWhisprs:', error);
      throw error;
    }
  }
}

export default TextWhisperService.getInstance();
