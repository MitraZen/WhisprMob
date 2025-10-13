import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import NearbyService, { NearbyUser } from './NearbyService';

interface UseNearbyReturn {
  nearbyUsers: NearbyUser[];
  isLoading: boolean;
  isEnabled: boolean;
  autoRefresh: boolean;
  lastUpdated: Date | null;
  error: string | null;
  refreshLocation: () => Promise<void>;
  findNearbyUsers: () => Promise<void>;
  toggleEnabled: () => void;
  toggleAutoRefresh: () => void;
  sendWhisperNote: (userId: string, content: string) => Promise<boolean>;
}

export const useNearby = (userId: string): UseNearbyReturn => {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nearbyService = NearbyService.getInstance();

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !isEnabled) return;

    const interval = setInterval(() => {
      findNearbyUsers();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, isEnabled]);

  const refreshLocation = useCallback(async () => {
    if (!isEnabled) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Refreshing location...');
      const success = await nearbyService.updateUserLocation(userId);
      
      if (success) {
        setLastUpdated(new Date());
        console.log('✅ Location refreshed successfully');
      } else {
        throw new Error('Failed to update location');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh location';
      setError(errorMessage);
      console.error('❌ Refresh location error:', err);
      
      Alert.alert(
        'Location Error',
        'Unable to refresh your location. Please check your location permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, isEnabled, nearbyService]);

  const findNearbyUsers = useCallback(async () => {
    if (!isEnabled) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Finding nearby users...');
      const users = await nearbyService.getNearbyUsers(userId);
      
      console.log('🎯 useNearby: Received users from service:', users);
      setNearbyUsers(users);
      setLastUpdated(new Date());
      
      console.log(`Found ${users.length} nearby users`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find nearby users';
      setError(errorMessage);
      console.error('❌ Find nearby users error:', err);
      
      Alert.alert(
        'Search Error',
        'Unable to find nearby users. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, isEnabled, nearbyService]);

  const toggleEnabled = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    
    if (newEnabled) {
      // When enabling, refresh location and find users
      refreshLocation().then(() => {
        findNearbyUsers();
      });
    } else {
      // When disabling, clear data
      setNearbyUsers([]);
      setLastUpdated(null);
      setError(null);
    }
  }, [isEnabled, refreshLocation, findNearbyUsers]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  const sendWhisperNote = useCallback(async (
    receiverId: string,
    content: string
  ): Promise<boolean> => {
    try {
      console.log('📝 Sending whisper note to:', receiverId);
      
      const success = await nearbyService.sendWhisperNote(
        userId,
        receiverId,
        content,
        'happy'
      );

      if (success) {
        Alert.alert(
          'Whisper Sent!',
          'Your whisper has been sent. The user can find it in their Whispr Notes section.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to send whisper. Please try again.');
      }

      return success;
    } catch (err) {
      console.error('❌ Send whisper note error:', err);
      Alert.alert('Error', 'Failed to send whisper. Please try again.');
      return false;
    }
  }, [userId, nearbyService]);

  return {
    nearbyUsers,
    isLoading,
    isEnabled,
    autoRefresh,
    lastUpdated,
    error,
    refreshLocation,
    findNearbyUsers,
    toggleEnabled,
    toggleAutoRefresh,
    sendWhisperNote,
  };
};






