import { supabase } from '@/config/supabase';
import Geolocation from '@react-native-community/geolocation';
import CryptoJS from 'crypto-js';

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
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 0,
          };
          this.currentLocation = location;
          console.log('📍 Current location:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ Location error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Create geohash bucket for privacy-preserving location sharing
   */
  private createGeoBucket(location: LocationData): string {
    // Fuzz location by ~100m for privacy
    const fuzzedLat = Math.round(location.latitude * 1000) / 1000;
    const fuzzedLng = Math.round(location.longitude * 1000) / 1000;
    
    // Create 5-character geohash
    const geohash = this.encodeGeohash(fuzzedLat, fuzzedLng, 5);
    
    // Hash for additional privacy using crypto-js
    return CryptoJS.SHA256(geohash).toString();
  }

  /**
   * Simple geohash encoding
   */
  private encodeGeohash(lat: number, lng: number, precision: number): string {
    const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let isEven = true;
    let bit = 0;
    let ch = 0;
    let geohash = '';

    let latMin = -90;
    let latMax = 90;
    let lngMin = -180;
    let lngMax = 180;

    while (geohash.length < precision) {
      if (isEven) {
        const lngMid = (lngMin + lngMax) / 2;
        if (lng >= lngMid) {
          ch |= (1 << (4 - bit));
          lngMin = lngMid;
        } else {
          lngMax = lngMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if (lat >= latMid) {
          ch |= (1 << (4 - bit));
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }

      isEven = !isEven;

      if (bit < 4) {
        bit++;
      } else {
        geohash += base32[ch];
        bit = 0;
        ch = 0;
      }
    }

    return geohash;
  }

  /**
   * Update user's location in the database
   */
  async updateUserLocation(userId: string): Promise<boolean> {
    try {
      const location = await this.getCurrentLocation();
      const geoBucket = this.createGeoBucket(location);

      console.log('🔄 Updating user location:', { userId, geoBucket });

      const { error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: userId,
          geo_bucket: geoBucket,
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
   */
  async getNearbyUsers(userId: string): Promise<NearbyUser[]> {
    try {
      if (!this.currentLocation) {
        await this.getCurrentLocation();
      }

      if (!this.currentLocation) {
        throw new Error('Unable to get current location');
      }

      // Create multiple geo buckets for broader search
      const geoBuckets = this.createNearbyGeoBuckets(this.currentLocation);
      
      console.log('🔍 Fetching nearby users with geo buckets:', geoBuckets);

      const { data, error } = await supabase.rpc('get_nearby_users', {
        target_geo_buckets: geoBuckets,
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      console.log('📊 Raw RPC response:', data);

      // Process and filter results
      const nearbyUsers: NearbyUser[] = (data || [])
        .filter((user: any) => user.user_id !== userId) // Exclude current user
        .map((user: any, index: number) => ({
          id: user.user_id,
          anonymous_id: `U${index + 1}`,
          last_active: user.last_active,
          is_online: user.is_online,
        }));

      console.log('👥 Processed nearby users:', nearbyUsers);
      return nearbyUsers;
    } catch (error) {
      console.error('❌ Get nearby users error:', error);
      return [];
    }
  }

  /**
   * Create multiple geo buckets for broader nearby search
   */
  private createNearbyGeoBuckets(location: LocationData): string[] {
    const buckets: string[] = [];
    
    // Create buckets for current location and nearby areas
    const offsets = [
      { lat: 0, lng: 0 },      // Current location
      { lat: 0.001, lng: 0 },  // North
      { lat: -0.001, lng: 0 }, // South
      { lat: 0, lng: 0.001 },  // East
      { lat: 0, lng: -0.001 }, // West
      { lat: 0.001, lng: 0.001 },   // Northeast
      { lat: 0.001, lng: -0.001 },  // Northwest
      { lat: -0.001, lng: 0.001 },  // Southeast
      { lat: -0.001, lng: -0.001 }, // Southwest
    ];

    offsets.forEach(offset => {
      const bucketLocation: LocationData = {
        latitude: location.latitude + offset.lat,
        longitude: location.longitude + offset.lng,
        accuracy: location.accuracy,
      };
      buckets.push(this.createGeoBucket(bucketLocation));
    });

    return buckets;
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
