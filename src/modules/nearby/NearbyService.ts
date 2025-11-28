import { supabase } from '@/config/supabase';
import Geolocation from '@react-native-community/geolocation';
import GeohashUtil from '@/utils/geohashUtil';

export interface NearbyUser {
  id: string;
  anonymous_id: string;
  last_active: string;
  is_online: boolean;
  distance?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

class NearbyService {
  private static instance: NearbyService;
  private currentLocation: LocationData | null = null;

  static getInstance(): NearbyService {
    if (!NearbyService.instance) {
      NearbyService.instance = new NearbyService();
    }
    return NearbyService.instance;
  }

  /**
   * Get current location with permission handling
   * Uses network location first (faster), then falls back to GPS if needed
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      // Try with network location first (faster, less battery)
      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 0,
          };
          this.currentLocation = location;
          console.log('📍 Current location (network):', location);
          resolve(location);
        },
        (error) => {
          console.warn('⚠️ Network location failed, trying high accuracy GPS...', error.message);
          // Fallback to high accuracy GPS with longer timeout
          Geolocation.getCurrentPosition(
            (position) => {
              const location: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy || 0,
              };
              this.currentLocation = location;
              console.log('📍 Current location (GPS):', location);
              resolve(location);
            },
            (gpsError) => {
              console.error('❌ Location error (both network and GPS failed):', gpsError);
              reject(gpsError);
            },
            {
              enableHighAccuracy: true,
              timeout: 30000, // ✅ INCREASED: 30 seconds for GPS
              maximumAge: 60000, // Accept cached location up to 1 minute
            }
          );
        },
        {
          enableHighAccuracy: false, // ✅ NETWORK FIRST: Faster, less battery
          timeout: 20000, // ✅ INCREASED: 20 seconds for network location
          maximumAge: 300000, // Accept cached location up to 5 minutes
        }
      );
    });
  }

  /**
   * Generate geohash levels for location filtering
   * - lvl2: ~500km radius (for broad filtering)
   * - lvl3: ~100km radius (for regional filtering)
   */
  private generateGeohashLevels(location: LocationData): { lvl2: string; lvl3: string } {
    return {
      lvl2: GeohashUtil.generateGeohash(location.latitude, location.longitude, 2),
      lvl3: GeohashUtil.generateGeohash(location.latitude, location.longitude, 3),
    };
  }

  /**
   * Update user's location in the database
   * Stores: exact lat/lng (for calculations) + geohash lvl2/lvl3 (for filtering)
   */
  async updateUserLocation(userId: string): Promise<boolean> {
    try {
      const location = await this.getCurrentLocation();
      const geohashes = this.generateGeohashLevels(location);

      console.log('🔄 Updating user location:', { 
        userId, 
        lat: location.latitude, 
        lng: location.longitude,
        geohash_lvl2: geohashes.lvl2,
        geohash_lvl3: geohashes.lvl3
      });

      const { error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: userId,
          geohash_lvl2: geohashes.lvl2,
          geohash_lvl3: geohashes.lvl3,
          last_active: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Location update error:', error);
        return false;
      }

      console.log('✅ User location updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Location update failed:', error);
      return false;
    }
  }

  /**
   * Get nearby users based on current location
   * Uses geohash lvl2/lvl3 for efficient filtering
   */
  async getNearbyUsers(userId: string): Promise<NearbyUser[]> {
    try {
      if (!this.currentLocation) {
        await this.getCurrentLocation();
      }

      if (!this.currentLocation) {
        throw new Error('Unable to get current location');
      }

      // Get geohash levels for filtering
      const geohashes = this.getNearbyGeohashes(this.currentLocation);
      
      console.log('🔍 Fetching nearby users with geohashes:', geohashes);

      // Query users with matching geohash lvl2 or lvl3
      const { data, error } = await supabase
        .from('user_locations')
        .select('user_id, last_active, geohash_lvl2, geohash_lvl3')
        .or(`geohash_lvl2.eq.${geohashes.lvl2},geohash_lvl3.eq.${geohashes.lvl3}`)
        .neq('user_id', userId)
        .limit(50);

      if (error) {
        console.error('❌ Query error:', error);
        throw error;
      }

      console.log('📊 Raw query response:', data);

      // Get online status for users
      const userIds = (data || []).map((loc: any) => loc.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, is_online')
        .in('id', userIds);

      const onlineMap = new Map((profiles || []).map((p: any) => [p.id, p.is_online]));

      // Process and filter results
      const nearbyUsers: NearbyUser[] = (data || [])
        .map((loc: any, index: number) => ({
          id: loc.user_id,
          anonymous_id: `U${index + 1}`,
          last_active: loc.last_active,
          is_online: onlineMap.get(loc.user_id) || false,
        }));

      console.log('👥 Processed nearby users:', nearbyUsers);
      return nearbyUsers;
    } catch (error) {
      console.error('❌ Get nearby users error:', error);
      return [];
    }
  }

  /**
   * Get geohash levels for nearby search
   * Returns current geohash lvl2 and lvl3
   */
  private getNearbyGeohashes(location: LocationData): { lvl2: string; lvl3: string } {
    return this.generateGeohashLevels(location);
  }

  /**
   * Send a whisper note to a nearby user
   */
  async sendWhisperNote(
    senderId: string,
    receiverId: string,
    content: string,
    mood: string = 'happy'
  ): Promise<boolean> {
    try {
      console.log('📝 Sending whisper note:', { senderId, receiverId, content, mood });

      const { error } = await supabase
        .from('whispr_notes')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content: content,
          mood: mood,
          status: 'sent',
          is_active: true,
        });

      if (error) {
        console.error('❌ Whisper note error:', error);
        return false;
      }

      console.log('✅ Whisper note sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Send whisper note failed:', error);
      return false;
    }
  }

  /**
   * Get current location (cached)
   */
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }
}

export default NearbyService;
