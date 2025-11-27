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
   * Get nearby text whisprs (location filtering disabled per user request)
   */
  async getNearbyTextWhisprs(limit: number = 20, radiusMeters?: number): Promise<TextWhispr[]> {
    try {
      console.log('📍 Fetching text whisprs (location filtering disabled)...');

      // Fetch all active whisprs without location filtering
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

      if (!data || data.length === 0) {
        console.log('✅ No whisprs found');
        return [];
      }

      // Return all whisprs without location filtering
      const whisprs = data.map(w => ({
        id: w.id,
        content: w.content,
        character_count: w.character_count,
        mood: w.mood,
        is_anonymous: w.is_anonymous,
        created_at: w.created_at,
        expires_at: w.expires_at,
        radius_meters: w.radius_meters
      }));

      console.log('✅ Found', whisprs.length, 'text whisprs');
      return whisprs;
    } catch (error) {
      console.error('❌ Error in getNearbyTextWhisprs:', error);
      throw error;
    }
  }

  /**
   * Get nearby text whisprs filtered by EXCLUSIVE distance range (min to max)
   * This is for filter-based queries where ranges don't overlap
   */
  async getNearbyTextWhisprsExclusive(
    limit: number = 20,
    minMeters: number,
    maxMeters: number
  ): Promise<TextWhispr[]> {
    try {
      console.log(`📍 Fetching whisprs in EXCLUSIVE range: ${minMeters / 1000}km - ${maxMeters === Infinity ? '∞' : maxMeters / 1000 + 'km'}...`);

      // Get current user's location
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

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
        console.warn('⚠️ Could not get user location for exclusive range filtering');
        return []; // Return empty for exclusive ranges if no location
      }

      // Fetch whisprs with user_id
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
        .limit(limit * 3);

      if (error) {
        console.error('❌ Error fetching whisprs:', error);
        throw new Error(`Failed to fetch whisprs: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log('✅ No whisprs found');
        return [];
      }

      // Get creator locations - try user_locations first, then user_profiles
      const creatorIds = [...new Set(data.map(w => w.user_id).filter(Boolean))];
      const locationMap = new Map<string, { lat: number; lon: number }>();

      // Try user_locations first
      const { data: creatorLocations, error: creatorLocError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, geo_bucket')
        .in('user_id', creatorIds);

      if (!creatorLocError && creatorLocations) {
        creatorLocations.forEach(loc => {
          if (loc.latitude && loc.longitude) {
            locationMap.set(loc.user_id, { lat: loc.latitude, lon: loc.longitude });
          } else if (loc.geo_bucket) {
            // Try to decode geohash
            try {
              const GeohashUtil = require('@/utils/geohashUtil').default;
              const decoded = GeohashUtil.decodeGeohash(loc.geo_bucket);
              locationMap.set(loc.user_id, { lat: decoded.latitude, lon: decoded.longitude });
            } catch (error) {
              // Skip if decode fails
            }
          }
        });
      }

      // Fallback to user_profiles for creators without location in user_locations
      const missingCreatorIds = creatorIds.filter(id => !locationMap.has(id));
      if (missingCreatorIds.length > 0) {
        const { data: creatorProfiles } = await supabase
          .from('user_profiles')
          .select('id, latitude, longitude')
          .in('id', missingCreatorIds);

        (creatorProfiles || []).forEach(profile => {
          if (profile.latitude && profile.longitude) {
            locationMap.set(profile.id, { lat: profile.latitude, lon: profile.longitude });
          }
        });
      }

      // Filter by EXCLUSIVE geographic distance range
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
          // Exclude if no location data (for exclusive ranges, we need accurate distance)
          if (distanceMeters === null) {
            return false;
          }

          // ✅ EXCLUSIVE RANGE: Check if within min-max range (inclusive min, exclusive max)
          const withinRange = distanceMeters >= minMeters && 
                             (maxMeters === Infinity || distanceMeters < maxMeters);
          
          // Also respect the whispr's own radius setting
          const whisprRadius = whispr.radius_meters || 1000;
          const respectsWhisprRadius = distanceMeters <= whisprRadius;

          return withinRange && respectsWhisprRadius;
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
        .slice(0, limit);

      console.log(`📍 Filtered from ${data.length} to ${filteredData.length} whisprs in exclusive range`);
      return filteredData;
    } catch (error) {
      console.error('❌ Error in getNearbyTextWhisprsExclusive:', error);
      throw error;
    }
  }

  /**
   * Get count of nearby text whisprs for a given radius (for preview stats)
   * This is optimized to only count, not fetch full data
   */
  async getNearbyWhisprsCount(radiusMeters?: number): Promise<number> {
    try {
      // Get current user's location - try user_locations first, then user_profiles
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return 0;
      }

      let currentUserLat: number | null = null;
      let currentUserLon: number | null = null;

      // Try user_locations table first
      const { data: userLocation, error: locationError } = await supabase
        .from('user_locations')
        .select('latitude, longitude, geo_bucket')
        .eq('user_id', user.id)
        .single();

      if (!locationError && userLocation) {
        if (userLocation.latitude && userLocation.longitude) {
          currentUserLat = userLocation.latitude;
          currentUserLon = userLocation.longitude;
        } else if (userLocation.geo_bucket) {
          // Try to decode geohash
          try {
            const GeohashUtil = require('@/utils/geohashUtil').default;
            const decoded = GeohashUtil.decodeGeohash(userLocation.geo_bucket);
            currentUserLat = decoded.latitude;
            currentUserLon = decoded.longitude;
          } catch (error) {
            // Skip if decode fails
          }
        }
      }

      // Fallback to user_profiles if user_locations doesn't have lat/lng
      if (!currentUserLat || !currentUserLon) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('latitude, longitude')
          .eq('id', user.id)
          .single();

        if (userProfile?.latitude && userProfile?.longitude) {
          currentUserLat = userProfile.latitude;
          currentUserLon = userProfile.longitude;
        }
      }

      if (!currentUserLat || !currentUserLon) {
        // Location filtering disabled - return count of all active whisprs
        const { count, error: countError } = await supabase
          .from('whisprs')
          .select('*', { count: 'exact', head: true })
          .gt('expires_at', new Date().toISOString());
        
        return countError ? 0 : (count || 0);
      }

      // Fetch whisprs with user_id to get creator locations
      const { data, error } = await supabase
        .from('whisprs')
        .select('id, user_id, radius_meters')
        .gt('expires_at', new Date().toISOString())
        .limit(100); // Limit for performance

      if (error || !data || data.length === 0) {
        return 0;
      }

      // If no radius filter, return all whisprs count
      if (!radiusMeters) {
        return data.length;
      }

      // Get creator locations for all whisprs - try user_locations first, then user_profiles
      const creatorIds = [...new Set(data.map(w => w.user_id).filter(Boolean))];
      const locationMap = new Map<string, { lat: number; lon: number }>();

      // Try user_locations first
      const { data: creatorLocations, error: creatorLocError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, geo_bucket')
        .in('user_id', creatorIds);

      if (!creatorLocError && creatorLocations) {
        creatorLocations.forEach(loc => {
          if (loc.latitude && loc.longitude) {
            locationMap.set(loc.user_id, { lat: loc.latitude, lon: loc.longitude });
          } else if (loc.geo_bucket) {
            // Try to decode geohash
            try {
              const GeohashUtil = require('@/utils/geohashUtil').default;
              const decoded = GeohashUtil.decodeGeohash(loc.geo_bucket);
              locationMap.set(loc.user_id, { lat: decoded.latitude, lon: decoded.longitude });
            } catch (error) {
              // Skip if decode fails
            }
          }
        });
      }

      // Fallback to user_profiles for creators without location in user_locations
      const missingCreatorIds = creatorIds.filter(id => !locationMap.has(id));
      if (missingCreatorIds.length > 0) {
        const { data: creatorProfiles } = await supabase
          .from('user_profiles')
          .select('id, latitude, longitude')
          .in('id', missingCreatorIds);

        (creatorProfiles || []).forEach(profile => {
          if (profile.latitude && profile.longitude) {
            locationMap.set(profile.id, { lat: profile.latitude, lon: profile.longitude });
          }
        });
      }

      // Count by actual geographic distance
      let withinRadius = 0;
      let noLocation = 0;
      let outsideRadius = 0;
      let outsideWhisprRadius = 0;

      const count = data.filter(w => {
        const creatorLoc = w.user_id ? locationMap.get(w.user_id) : null;
        if (!creatorLoc || !currentUserLat || !currentUserLon) {
          // Include if no location data (fail open)
          noLocation++;
          return true;
        }

        const distanceMeters = this.calculateDistanceMeters(
          currentUserLat,
          currentUserLon,
          creatorLoc.lat,
          creatorLoc.lon
        );

        // Filter by user's selected radius
        const withinDistance = distanceMeters <= radiusMeters;
        
        // Also respect the whispr's own radius setting
        const whisprRadius = w.radius_meters || 1000;
        const respectsWhisprRadius = distanceMeters <= whisprRadius;

        if (!withinDistance) {
          outsideRadius++;
          return false;
        }
        
        if (!respectsWhisprRadius) {
          outsideWhisprRadius++;
          return false;
        }

        withinRadius++;
        return true;
      }).length;

      console.log(`📍 [getNearbyWhisprsCount] Radius: ${radiusMeters}m (${radiusMeters / 1000}km)`);
      console.log(`   Total checked: ${data.length}, Within radius: ${withinRadius}, No location: ${noLocation}, Outside radius: ${outsideRadius}, Outside whispr radius: ${outsideWhisprRadius}`);
      console.log(`   Final count: ${count}`);
      
      return count;
    } catch (error) {
      console.error('❌ Error in getNearbyWhisprsCount:', error);
      return 0;
    }
  }

  /**
   * Get count of nearby text whisprs for an EXCLUSIVE distance range (min to max)
   * This is for filter counts where ranges don't overlap
   */
  async getNearbyWhisprsCountExclusive(minMeters: number, maxMeters: number): Promise<number> {
    try {
      // Get current user's location from user_locations
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return 0;
      }

      // Get current user's location - try user_locations first, then user_profiles
      let currentUserLat: number | null = null;
      let currentUserLon: number | null = null;

      // Try user_locations table first
      const { data: userLocation, error: locationError } = await supabase
        .from('user_locations')
        .select('latitude, longitude, geo_bucket')
        .eq('user_id', user.id)
        .single();

      if (!locationError && userLocation) {
        if (userLocation.latitude && userLocation.longitude) {
          currentUserLat = userLocation.latitude;
          currentUserLon = userLocation.longitude;
        } else if (userLocation.geo_bucket) {
          // Try to decode geohash if lat/lng not available
          try {
            const GeohashUtil = require('@/utils/geohashUtil').default;
            const decoded = GeohashUtil.decodeGeohash(userLocation.geo_bucket);
            currentUserLat = decoded.latitude;
            currentUserLon = decoded.longitude;
          } catch (error) {
            console.warn('⚠️ Could not decode geo_bucket:', error);
          }
        }
      }

      // Fallback to user_profiles if user_locations doesn't have lat/lng
      if (!currentUserLat || !currentUserLon) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('latitude, longitude')
          .eq('id', user.id)
          .single();

        if (userProfile?.latitude && userProfile?.longitude) {
          currentUserLat = userProfile.latitude;
          currentUserLon = userProfile.longitude;
        }
      }

      if (!currentUserLat || !currentUserLon) {
        // Location filtering disabled - return 0 for exclusive ranges
        return 0;
      }

      // Fetch whisprs with user_id to get creator locations
      const { data, error } = await supabase
        .from('whisprs')
        .select('id, user_id, radius_meters')
        .gt('expires_at', new Date().toISOString())
        .limit(100); // Limit for performance

      if (error || !data || data.length === 0) {
        return 0;
      }

      // Get creator locations for all whisprs - try user_locations first, then user_profiles
      const creatorIds = [...new Set(data.map(w => w.user_id).filter(Boolean))];
      const locationMap = new Map<string, { lat: number; lon: number }>();

      // Try user_locations first
      const { data: creatorLocations, error: creatorLocError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, geo_bucket')
        .in('user_id', creatorIds);

      if (!creatorLocError && creatorLocations) {
        creatorLocations.forEach(loc => {
          if (loc.latitude && loc.longitude) {
            locationMap.set(loc.user_id, { lat: loc.latitude, lon: loc.longitude });
          } else if (loc.geo_bucket) {
            // Try to decode geohash
            try {
              const GeohashUtil = require('@/utils/geohashUtil').default;
              const decoded = GeohashUtil.decodeGeohash(loc.geo_bucket);
              locationMap.set(loc.user_id, { lat: decoded.latitude, lon: decoded.longitude });
            } catch (error) {
              // Skip if decode fails
            }
          }
        });
      }

      // Fallback to user_profiles for creators without location in user_locations
      const missingCreatorIds = creatorIds.filter(id => !locationMap.has(id));
      if (missingCreatorIds.length > 0) {
        const { data: creatorProfiles } = await supabase
          .from('user_profiles')
          .select('id, latitude, longitude')
          .in('id', missingCreatorIds);

        (creatorProfiles || []).forEach(profile => {
          if (profile.latitude && profile.longitude) {
            locationMap.set(profile.id, { lat: profile.latitude, lon: profile.longitude });
          }
        });
      }

      // Count by EXCLUSIVE geographic distance range
      let withinRange = 0;
      let noLocation = 0;
      let outsideRange = 0;
      let outsideWhisprRadius = 0;

      const count = data.filter(w => {
        const creatorLoc = w.user_id ? locationMap.get(w.user_id) : null;
        if (!creatorLoc || !currentUserLat || !currentUserLon) {
          // Exclude if no location data (for exclusive ranges, we need accurate distance)
          noLocation++;
          return false;
        }

        const distanceMeters = this.calculateDistanceMeters(
          currentUserLat,
          currentUserLon,
          creatorLoc.lat,
          creatorLoc.lon
        );

        // ✅ EXCLUSIVE RANGE: Check if within min-max range (inclusive min, exclusive max)
        const withinRange = distanceMeters >= minMeters && (maxMeters === Infinity || distanceMeters < maxMeters);
        
        if (!withinRange) {
          outsideRange++;
          return false;
        }

        // Also respect the whispr's own radius setting
        const whisprRadius = w.radius_meters || 1000;
        const respectsWhisprRadius = distanceMeters <= whisprRadius;

        if (!respectsWhisprRadius) {
          outsideWhisprRadius++;
          return false;
        }

        return true;
      }).length;

      console.log(`📍 [getNearbyWhisprsCountExclusive] Range: ${minMeters / 1000}km - ${maxMeters === Infinity ? '∞' : maxMeters / 1000 + 'km'}`);
      console.log(`   Total checked: ${data.length}, Within range: ${count}, No location: ${noLocation}, Outside range: ${outsideRange}, Outside whispr radius: ${outsideWhisprRadius}`);
      
      return count;
    } catch (error) {
      console.error('❌ Error in getNearbyWhisprsCountExclusive:', error);
      return 0;
    }
  }
}

export default TextWhisperService.getInstance();
