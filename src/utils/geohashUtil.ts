/**
 * Geohash utility for Live Whispers proximity-based features
 * This is a simplified implementation for demo purposes
 * In production, use a proper geohash library like 'ngeohash'
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface GeohashResult {
  lvl2: string; // ~500km radius
  lvl3: string; // ~100km radius
  lvl4: string; // ~25km radius
  lvl5: string; // ~6km radius
}

class GeohashUtil {
  private static readonly BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  private static readonly LAT_RANGE = [-90, 90];
  private static readonly LNG_RANGE = [-180, 180];

  /**
   * Generate geohash for different precision levels
   */
  static generateGeohash(latitude: number, longitude: number, precision: number): string {
    let latRange = [...this.LAT_RANGE];
    let lngRange = [...this.LNG_RANGE];
    
    let geohash = '';
    let bit = 0;
    let ch = 0;
    let even = true;
    
    while (geohash.length < precision) {
      if (even) {
        const mid = (lngRange[0] + lngRange[1]) / 2;
        if (longitude >= mid) {
          ch |= (1 << (4 - bit));
          lngRange[0] = mid;
        } else {
          lngRange[1] = mid;
        }
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (latitude >= mid) {
          ch |= (1 << (4 - bit));
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }
      
      even = !even;
      bit++;
      
      if (bit === 5) {
        geohash += this.BASE32[ch];
        bit = 0;
        ch = 0;
      }
    }
    
    return geohash;
  }

  /**
   * Generate multiple precision levels for proximity detection
   */
  static generateMultiLevelGeohash(latitude: number, longitude: number): GeohashResult {
    return {
      lvl2: this.generateGeohash(latitude, longitude, 2), // ~500km
      lvl3: this.generateGeohash(latitude, longitude, 3), // ~100km
      lvl4: this.generateGeohash(latitude, longitude, 4), // ~25km
      lvl5: this.generateGeohash(latitude, longitude, 5), // ~6km
    };
  }

  /**
   * Decode geohash back to approximate coordinates
   */
  static decodeGeohash(geohash: string): Location {
    let latRange = [...this.LAT_RANGE];
    let lngRange = [...this.LNG_RANGE];
    
    let even = true;
    
    for (let i = 0; i < geohash.length; i++) {
      const char = geohash[i];
      const index = this.BASE32.indexOf(char);
      
      for (let j = 0; j < 5; j++) {
        const bit = (index >> (4 - j)) & 1;
        
        if (even) {
          const mid = (lngRange[0] + lngRange[1]) / 2;
          if (bit) {
            lngRange[0] = mid;
          } else {
            lngRange[1] = mid;
          }
        } else {
          const mid = (latRange[0] + latRange[1]) / 2;
          if (bit) {
            latRange[0] = mid;
          } else {
            latRange[1] = mid;
          }
        }
        
        even = !even;
      }
    }
    
    return {
      latitude: (latRange[0] + latRange[1]) / 2,
      longitude: (lngRange[0] + lngRange[1]) / 2,
    };
  }

  /**
   * Calculate approximate distance between two geohashes
   */
  static calculateDistance(geohash1: string, geohash2: string): number {
    const loc1 = this.decodeGeohash(geohash1);
    const loc2 = this.decodeGeohash(geohash2);
    
    return this.haversineDistance(loc1, loc2);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static haversineDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLng = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get geohash neighbors for proximity searches
   */
  static getNeighbors(geohash: string): string[] {
    const neighbors: string[] = [];
    const decoded = this.decodeGeohash(geohash);
    const precision = geohash.length;
    
    // Generate 8 surrounding geohashes
    const offsets = [
      { lat: 0, lng: 1 },   // East
      { lat: 1, lng: 1 },   // Northeast
      { lat: 1, lng: 0 },   // North
      { lat: 1, lng: -1 },  // Northwest
      { lat: 0, lng: -1 },  // West
      { lat: -1, lng: -1 }, // Southwest
      { lat: -1, lng: 0 },  // South
      { lat: -1, lng: 1 },  // Southeast
    ];
    
    offsets.forEach(offset => {
      const neighborLat = decoded.latitude + offset.lat * this.getPrecisionStep(precision);
      const neighborLng = decoded.longitude + offset.lng * this.getPrecisionStep(precision);
      
      neighbors.push(this.generateGeohash(neighborLat, neighborLng, precision));
    });
    
    return neighbors;
  }

  /**
   * Get step size for given precision level
   */
  private static getPrecisionStep(precision: number): number {
    const steps = {
      1: 45,
      2: 5.625,
      3: 0.703125,
      4: 0.087890625,
      5: 0.010986328125,
      6: 0.001373291015625,
      7: 0.000171661376953125,
      8: 0.000021457672119140625,
    };
    
    return steps[precision as keyof typeof steps] || 0.000002682209014892578125;
  }

  /**
   * Check if two geohashes are within specified distance
   */
  static isWithinDistance(geohash1: string, geohash2: string, maxDistanceKm: number): boolean {
    return this.calculateDistance(geohash1, geohash2) <= maxDistanceKm;
  }

  /**
   * Get proximity zones for Live Whispers
   */
  static getProximityZones(latitude: number, longitude: number) {
    const geohash = this.generateMultiLevelGeohash(latitude, longitude);
    
    return {
      close: geohash.lvl4,    // ~25km
      medium: geohash.lvl3,   // ~100km
      far: geohash.lvl2,      // ~500km
    };
  }

  /**
   * Mock location for testing (San Francisco area)
   */
  static getMockLocation(): Location {
    return {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
    };
  }

  /**
   * Generate random location within radius of given location
   */
  static generateRandomLocationNearby(center: Location, radiusKm: number): Location {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;
    
    const latOffset = (distance / 111) * Math.cos(angle); // 1 degree ≈ 111km
    const lngOffset = (distance / (111 * Math.cos(this.toRadians(center.latitude)))) * Math.sin(angle);
    
    return {
      latitude: center.latitude + latOffset,
      longitude: center.longitude + lngOffset,
    };
  }
}

export default GeohashUtil;
