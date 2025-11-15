/**
 * Location Service Utility
 * Handles location detection and reverse geocoding to get country name
 */

import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  country: string;
  countryCode?: string;
  city?: string;
  state?: string;
}

/**
 * Request location permissions (Android)
 */
async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Whispr needs access to your location to set your country.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  }
  // iOS permissions are handled via Info.plist
  return true;
}

/**
 * Get current location coordinates
 */
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  // Request permission first
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Location error:', error);
        reject(new Error(`Failed to get location: ${error.message}`));
      },
      {
        enableHighAccuracy: false, // Use network location for country-level accuracy
        timeout: 15000,
        maximumAge: 300000, // Accept cached location up to 5 minutes old
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get country name
 * Uses BigDataCloud API (free, no API key required)
 */
export async function reverseGeocodeToCountry(
  latitude: number,
  longitude: number
): Promise<LocationInfo> {
  try {
    // Using BigDataCloud reverse geocoding API (free, no API key)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.countryName) {
      throw new Error('Country name not found in response');
    }

    return {
      country: data.countryName,
      countryCode: data.countryCode,
      city: data.city,
      state: data.principalSubdivision,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Get user's country based on current location
 * Main function to use in components
 */
export async function getUserCountry(): Promise<string> {
  try {
    // Get current location
    const location = await getCurrentLocation();
    console.log('📍 Current location:', location);

    // Reverse geocode to get country
    const locationInfo = await reverseGeocodeToCountry(
      location.latitude,
      location.longitude
    );
    console.log('🌍 Location info:', locationInfo);

    return locationInfo.country;
  } catch (error) {
    console.error('❌ Error getting user country:', error);
    throw error;
  }
}

