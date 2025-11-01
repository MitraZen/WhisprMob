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
   * Calculate distance between two coordinates using Haversine formula (returns meters)
   */
  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get nearby text whisprs filtered by actual geographic distance
   */
  async getNearbyTextWhisprs(limit: number = 20, radiusMeters?: number): Promise<TextWhispr[]> {
    try {
      console.log('📍 Fetching nearby text whisprs...');
      if (radiusMeters) {
        console.log(`📍 Filtering by actual distance: ${radiusMeters}m`);
      }

      // Get current user's location from user_locations
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get current user's location
      const { data: userLocation, error: locationError } = await supabase
        .from('user_locations')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .single();

      let currentUserLat: number | null = null;
      let currentUserLon: number | null = null;

      if (!locationError && userLocation) {
        currentUserLat = userLocation.latitude;
        currentUserLon = userLocation.longitude;
        console.log('📍 Current user location:', { lat: currentUserLat, lon: currentUserLon });
      } else {
        console.warn('⚠️ Could not get user location, will show all whisprs');
      }

      // Fetch whisprs with user_id to get creator locations
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
          radius_meters,
          user_id
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit * 3); // Fetch more to account for filtering

      if (error) {
        console.error('❌ Error fetching whisprs:', error);
        throw new Error(`Failed to fetch whisprs: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log('✅ No whisprs found');
        return [];
      }

      // If no location or no radius filter, return all whisprs (respecting whispr's own radius)
      if (!currentUserLat || !currentUserLon || !radiusMeters) {
        console.log('📍 No location or no filter specified, returning all whisprs');
        return data.map(w => ({
          id: w.id,
          content: w.content,
          character_count: w.character_count,
          mood: w.mood,
          is_anonymous: w.is_anonymous,
          created_at: w.created_at,
          expires_at: w.expires_at,
          radius_meters: w.radius_meters
        }));
      }

      // Get creator locations for all whisprs
      const creatorIds = [...new Set(data.map(w => w.user_id).filter(Boolean))];
      const { data: creatorLocations, error: creatorLocError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude')
        .in('user_id', creatorIds);

      if (creatorLocError) {
        console.warn('⚠️ Could not get creator locations:', creatorLocError);
      }

      // Create a map of user_id -> location for quick lookup
      const locationMap = new Map<string, { lat: number; lon: number }>();
      (creatorLocations || []).forEach(loc => {
        if (loc.latitude && loc.longitude) {
          locationMap.set(loc.user_id, { lat: loc.latitude, lon: loc.longitude });
        }
      });

      // Filter by actual geographic distance
      const filteredData = data
        .map(w => {
          const creatorLoc = w.user_id ? locationMap.get(w.user_id) : null;
          let distanceMeters: number | null = null;

          if (creatorLoc && currentUserLat && currentUserLon) {
            distanceMeters = this.calculateDistanceMeters(
              currentUserLat,
              currentUserLon,
              creatorLoc.lat,
              creatorLoc.lon
            );
          }

          return {
            whispr: w,
            distanceMeters
          };
        })
        .filter(({ whispr, distanceMeters }) => {
          // If we don't have location data, don't filter (show it)
          if (distanceMeters === null) {
            return true;
          }

          // Filter by actual distance
          const withinDistance = distanceMeters <= radiusMeters;
          
          // Also respect the whispr's own radius setting
          // A whispr with radius_meters = 50000 should only be visible within 50km
          const whisprRadius = whispr.radius_meters || 1000;
          const respectsWhisprRadius = distanceMeters <= whisprRadius;

          return withinDistance && respectsWhisprRadius;
        })
        .map(({ whispr }) => ({
          id: whispr.id,
          content: whispr.content,
          character_count: whispr.character_count,
          mood: whispr.mood,
          is_anonymous: whispr.is_anonymous,
          created_at: whispr.created_at,
          expires_at: whispr.expires_at,
          radius_meters: whispr.radius_meters
        }))
        .slice(0, limit); // Limit results

      console.log(`📍 Filtered from ${data.length} to ${filteredData.length} whisprs by actual distance`);
      console.log('✅ Found', filteredData.length, 'nearby text whisprs');
      return filteredData;
    } catch (error) {
      console.error('❌ Error in getNearbyTextWhisprs:', error);
      throw error;
    }
  }
}

export default TextWhisperService.getInstance();
