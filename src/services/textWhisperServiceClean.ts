import { supabase } from '@/config/supabase';
import AnonymousChatService from './anonymousChatService';

export interface TextWhispr {
  id: string;
  content: string;
  character_count: number;
  mood: string;
  is_anonymous: boolean;
  created_at: string;
  expires_at: string;
  radius_meters: number;
  user_id?: string; // Optional: for counting by creator country
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
   * Get whisprs filtered by country (Regional = same country, Global = all countries)
   * Simple and reliable country-based filtering
   */
  async getWhisprsByCountry(
    limit: number = 20,
    filter: 'regional' | 'global'
  ): Promise<TextWhispr[]> {
    try {
      console.log(`🌍 Fetching whisprs with ${filter} filter...`);

      // Get current user's country
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      const userCountry = userProfile?.country || null;
      console.log(`🌍 Current user country: ${userCountry || 'Not set'}`);

      // Build query
      let query = supabase
        .from('whisprs')
        .select(`
          id,
          content,
          character_count,
          mood,
          is_anonymous,
          created_at,
          expires_at,
          radius_meters,
          user_id
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Fetch more to allow for filtering

      // For regional filter, we need to join with user_profiles to filter by country
      if (filter === 'regional' && userCountry) {
        // Fetch whisprs with creator country info
        const { data: whisprsData, error: whisprsError } = await query;

        if (whisprsError) {
          console.error('❌ Error fetching whisprs:', whisprsError);
          throw new Error(`Failed to fetch whisprs: ${whisprsError.message}`);
        }

        if (!whisprsData || whisprsData.length === 0) {
          console.log('✅ No active whisprs found');
          return [];
        }

        // Get creator IDs
        const creatorIds = [...new Set(whisprsData.map(w => w.user_id).filter(Boolean))];
        
        // Fetch creator countries
        const { data: creatorProfiles } = await supabase
          .from('user_profiles')
          .select('id, country')
          .in('id', creatorIds);

        const countryMap = new Map<string, string | null>();
        (creatorProfiles || []).forEach(profile => {
          countryMap.set(profile.id, profile.country || null);
        });

        // ✅ DEBUG: Log country mapping for troubleshooting
        console.log(`🌍 User country: "${userCountry}" (normalized: "${userCountry?.trim().toLowerCase()}")`);
        console.log(`🌍 Found ${countryMap.size} creator countries in map`);

        // Filter whisprs by country (case-insensitive comparison)
        const filteredWhisprs = whisprsData
          .filter(w => {
            if (!w.user_id) return false; // Skip anonymous/unknown creators
            const creatorCountry = countryMap.get(w.user_id);
            // ✅ FIX: Case-insensitive comparison and handle null/undefined
            if (!creatorCountry || !userCountry) {
              // Only log if creator country is missing (helps debug missing country data)
              if (!creatorCountry && w.user_id) {
                console.log(`⚠️ Creator ${w.user_id.substring(0, 8)}... has no country set for whispr ${w.id.substring(0, 8)}...`);
              }
              return false;
            }
            const normalizedCreator = creatorCountry.trim().toLowerCase();
            const normalizedUser = userCountry.trim().toLowerCase();
            return normalizedCreator === normalizedUser;
          })
          .slice(0, limit)
          .map(w => ({
            id: w.id,
            content: w.content,
            character_count: w.character_count,
            mood: w.mood,
            is_anonymous: w.is_anonymous,
            created_at: w.created_at,
            expires_at: w.expires_at,
            radius_meters: w.radius_meters,
            user_id: w.user_id // Include user_id for counting
          }));

        // Filter out whisprs with full chat rooms (2 participants)
        const availableWhisprs = await Promise.all(
          filteredWhisprs.map(async (whispr) => {
            const isFull = await AnonymousChatService.isWhisprChatFull(whispr.id);
            return isFull ? null : whispr;
          })
        );

        const finalWhisprs = availableWhisprs.filter((w): w is TextWhispr => w !== null);
        console.log(`🌍 Regional filter: ${whisprsData.length} total → ${filteredWhisprs.length} from ${userCountry} → ${finalWhisprs.length} available (excluded ${filteredWhisprs.length - finalWhisprs.length} full chats)`);
        return finalWhisprs;
      } else {
        // Global filter: show all whisprs
        const { data: whisprsData, error: whisprsError } = await query.limit(limit);

        if (whisprsError) {
          console.error('❌ Error fetching whisprs:', whisprsError);
          throw new Error(`Failed to fetch whisprs: ${whisprsError.message}`);
      }

        if (!whisprsData || whisprsData.length === 0) {
          console.log('✅ No active whisprs found');
        return [];
      }

        const whisprs = whisprsData.map(w => ({
          id: w.id,
          content: w.content,
          character_count: w.character_count,
          mood: w.mood,
          is_anonymous: w.is_anonymous,
          created_at: w.created_at,
          expires_at: w.expires_at,
          radius_meters: w.radius_meters,
          user_id: w.user_id // Include user_id for counting
        }));

        // Filter out whisprs with full chat rooms (2 participants)
        const availableWhisprs = await Promise.all(
          whisprs.map(async (whispr) => {
            const isFull = await AnonymousChatService.isWhisprChatFull(whispr.id);
            return isFull ? null : whispr;
          })
        );

        const finalWhisprs = availableWhisprs.filter((w): w is TextWhispr => w !== null);
        console.log(`🌍 Global filter: ${whisprs.length} whisprs from all countries → ${finalWhisprs.length} available (excluded ${whisprs.length - finalWhisprs.length} full chats)`);
        return finalWhisprs;
      }
    } catch (error) {
      console.error('❌ Error in getWhisprsByCountry:', error);
      throw error;
    }
  }

}

export default TextWhisperService.getInstance();
