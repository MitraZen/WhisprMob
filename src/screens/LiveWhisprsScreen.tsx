import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { useAuth } from '@/store/AuthContext';
import { spacing, borderRadius } from '@/utils/themes';
import WhisperWavesCanvas from '@/components/liveWhispers/WhisperWavesCanvas';
import RecordTextWhisper from '@/components/liveWhispers/RecordTextWhisper';
import AnonymousChatModal from '@/components/liveWhispers/AnonymousChatModal';
import TextWhisperService, { TextWhispr } from '@/services/textWhisperServiceClean';
import { supabase } from '@/config/supabase';
import GradientBackground from '@/components/GradientBackground';

type CountryFilter = 'regional' | 'global';

interface FilterConfig {
  label: string;
  icon: string;
  description: string;
}

const COUNTRY_FILTER_CONFIG: Record<CountryFilter, FilterConfig> = {
  'regional': {
    label: 'Regional',
    icon: '🌍',
    description: 'Same country',
  },
  'global': {
    label: 'Global',
    icon: '🚀',
    description: 'All countries',
  },
};

interface LiveWhisprsScreenProps {
  onNavigate: (screen: string) => void;
}

const LiveWhisprsScreen: React.FC<LiveWhisprsScreenProps> = ({ onNavigate }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(theme, isDark);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('regional');
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterCounts, setFilterCounts] = useState<{ regional: number | string; global: number | string }>({
    regional: 0,
    global: 0,
  });
  const [whisprs, setWhisprs] = useState<TextWhispr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWhisprForChat, setSelectedWhisprForChat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Store user country and filter refs for real-time filtering
  const userCountryRef = useRef<string | null>(null);
  const countryFilterRef = useRef(countryFilter);

  const handleRecordWhispr = () => {
    setShowRecordModal(true);
  };

  const handleWhisprCreated = (whisprId: string) => {
    console.log('Whispr created:', whisprId);
    setShowRecordModal(false);
    // Reload whisprs to show the new one
    loadWhisprs();
  };

  const handleWhisprPress = (whispr: TextWhispr) => {
    console.log('💬 Opening chat for whispr:', whispr.id);
    setSelectedWhisprForChat(whispr.id);
  };

  // Load whisprs from database
  const loadWhisprs = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      console.log(`🌍 Loading whisprs with ${countryFilter} filter...`);
      
      const filteredWhisprs = await TextWhisperService.getWhisprsByCountry(
        100, // limit
        countryFilter
      );
      
      console.log(`🌍 Fetched ${filteredWhisprs.length} whisprs with ${countryFilter} filter`);
      setWhisprs(filteredWhisprs);
      
      // Update counts
      const regionalCount = filteredWhisprs.filter(w => {
        // Count regional whisprs (would need country check, simplified here)
        return true; // Simplified - actual count logic would check creator country
      }).length;
      setFilterCounts({
        regional: regionalCount,
        global: filteredWhisprs.length,
      });
    } catch (error) {
      console.error('Error loading whisprs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load whisprs');
      setWhisprs([]);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  }, [countryFilter, user]);

  // Fetch user country on mount
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) return;
      
      try {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('country')
          .eq('id', user.id)
          .single();
        
        userCountryRef.current = userProfile?.country || null;
        console.log(`🌍 User country: ${userCountryRef.current || 'Not set'}`);
      } catch (error) {
        console.error('Error fetching user country:', error);
      }
    };
    
    fetchUserCountry();
  }, [user]);

  // Update filter refs
  useEffect(() => {
    countryFilterRef.current = countryFilter;
  }, [countryFilter]);

  // Load whisprs on mount and filter change
  useEffect(() => {
    if (user) {
      loadWhisprs();
    }
  }, [loadWhisprs, user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time subscription for whisprs...');
    
    const channel = supabase
      .channel('whisprs-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whisprs'
        },
        async (payload) => {
          console.log('🆕 New whispr created:', payload.new);
          const newWhispr = payload.new as any;

          // Country filtering
          const currentFilter = countryFilterRef.current;
          let shouldInclude = true;

          if (currentFilter === 'regional' && userCountryRef.current && newWhispr.user_id) {
            try {
              const { data: creatorProfile } = await supabase
                .from('user_profiles')
                .select('country')
                .eq('id', newWhispr.user_id)
                .single();

              const creatorCountry = creatorProfile?.country || null;
              shouldInclude = creatorCountry && userCountryRef.current
                ? creatorCountry.trim().toLowerCase() === userCountryRef.current.trim().toLowerCase()
                : false;

              if (!shouldInclude) {
                console.log(`🚫 Filtered out new whispr (creator country: ${creatorCountry}, user country: ${userCountryRef.current})`);
                return;
              }
            } catch (error) {
              console.error('❌ Error checking country for new whispr:', error);
              shouldInclude = false;
            }
          }

          // Convert to TextWhispr format
          const textWhispr: TextWhispr = {
            id: newWhispr.id,
            content: newWhispr.content,
            character_count: newWhispr.character_count,
            mood: newWhispr.mood,
            is_anonymous: newWhispr.is_anonymous,
            created_at: newWhispr.created_at,
            expires_at: newWhispr.expires_at,
            radius_meters: newWhispr.radius_meters,
            user_id: newWhispr.user_id,
          };

          // Check if whispr has full chat room before adding
          const AnonymousChatService = (await import('@/services/anonymousChatService')).default;
          const isFull = await AnonymousChatService.isWhisprChatFull(textWhispr.id);
          
          if (isFull) {
            console.log(`🚫 Filtered out new whispr (chat room full): ${textWhispr.id}`);
            return;
          }

          // Add to beginning of list (newest first)
          setWhisprs(prev => {
            const exists = prev.some(w => w.id === textWhispr.id);
            if (exists) return prev;
            return [textWhispr, ...prev];
          });
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
          console.log('🔄 Whispr updated:', payload.new);
          const updatedWhispr = payload.new as any;

          setWhisprs(prev => {
            const index = prev.findIndex(w => w.id === updatedWhispr.id);
            
            // Remove if expired or if chat room is full (check async)
            const isExpired = new Date(updatedWhispr.expires_at) <= new Date();
            if (isExpired) {
              if (index >= 0) {
                return prev.filter(w => w.id !== updatedWhispr.id);
              }
              return prev;
            }

            if (index === -1) return prev;

            // Update existing
            const textWhispr: TextWhispr = {
              id: updatedWhispr.id,
              content: updatedWhispr.content,
              character_count: updatedWhispr.character_count,
              mood: updatedWhispr.mood,
              is_anonymous: updatedWhispr.is_anonymous,
              created_at: updatedWhispr.created_at,
              expires_at: updatedWhispr.expires_at,
              radius_meters: updatedWhispr.radius_meters,
              user_id: updatedWhispr.user_id,
            };

            const newList = [...prev];
            newList[index] = textWhispr;
            return newList;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'whisprs'
        },
        (payload) => {
          console.log('🗑️ Whispr deleted:', payload.old);
          const deletedId = payload.old.id;
          setWhisprs(prev => prev.filter(w => w.id !== deletedId));
        }
      )
      .subscribe((status) => {
        console.log('📡 Whisprs subscription status:', status);
      });

      // Subscribe to chat room updates to detect when rooms become full or inactive
      const chatRoomChannel = supabase
        .channel('whispr-chat-rooms-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'whispr_chat_rooms'
          },
          async (payload) => {
            const updatedRoom = payload.new as any;
            console.log('🔄 Chat room updated:', updatedRoom);
            
            // If room became inactive, remove the whispr bubble
            if (updatedRoom.is_active === false) {
              setWhisprs(prev => prev.filter(w => w.id !== updatedRoom.whispr_id));
              return;
            }
            
            // Check if room became full (2 participants)
            const AnonymousChatService = (await import('@/services/anonymousChatService')).default;
            const isFull = await AnonymousChatService.isWhisprChatFull(updatedRoom.whispr_id);
            if (isFull) {
              setWhisprs(prev => prev.filter(w => w.id !== updatedRoom.whispr_id));
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Chat rooms subscription status:', status);
        });

    return () => {
      channel.unsubscribe();
      chatRoomChannel.unsubscribe();
    };
  }, [user]);

  const handleCloseRecordModal = () => {
    setShowRecordModal(false);
  };

  // ✅ PERFORMANCE: Debounce filter changes to avoid excessive re-renders
  const handleFilterChange = useCallback((filter: CountryFilter) => {
    // Don't do anything if already selected
    if (filter === countryFilter) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Show loading state immediately for better UX
    setFilterLoading(true);

    // Debounce the actual filter change
    debounceTimerRef.current = setTimeout(() => {
      setCountryFilter(filter);
      // Loading will be cleared by loadWhisprs() in the finally block
    }, 300);
  }, [countryFilter]);

  // ✅ UI/UX: Fade animation when filter changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [countryFilter, fadeAnim]);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }
  };
  }, []);


  return (
    <GradientBackground variant="default">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* Compact Header with Filters */}
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.1)' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('buddies')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Live Whisprs
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Compact Filters */}
      <View style={[styles.filterContainer, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.05)' }]}>
        {/* Country Filter - Compact */}
        <View style={styles.filterButtons}>
          {(['regional', 'global'] as CountryFilter[]).map((filter) => {
            const config = COUNTRY_FILTER_CONFIG[filter];
            const isSelected = countryFilter === filter;
            
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButtonCompact,
                  {
                    backgroundColor: isSelected 
                      ? theme.colors.primary 
                      : (isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(255, 255, 255, 0.1)'),
                    borderColor: isSelected 
                      ? theme.colors.primary 
                      : theme.colors.border,
                  }
                ]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.7}
                disabled={filterLoading && !isSelected}
              >
                {filterLoading && isSelected ? (
                  <ActivityIndicator 
                    size="small" 
                    color={theme.colors.surface} 
                    style={{ marginRight: 4 }}
                  />
                ) : null}
                <Text style={styles.filterIconCompact}>{config.icon}</Text>
                <Text
                  style={[
                    styles.filterButtonTextCompact,
                    {
                      color: isSelected 
                        ? theme.colors.surface 
                        : theme.colors.text,
                    }
                  ]}
                >
                  {config.label}
                </Text>
                <View style={[
                  styles.countBadgeCompact,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.onPrimary
                      : theme.colors.primaryContainer,
                  }
                ]}>
                  <Text style={[
                    styles.countBadgeTextCompact,
                    {
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.onPrimaryContainer,
                    }
                  ]}>
                    {filterCounts[filter]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading whispers...</Text>
          </View>
         ) : (
           <WhisperWavesCanvas
             whisprs={whisprs}
             onWhisprPress={handleWhisprPress}
             currentUserId={user?.id}
           />
         )}
      </Animated.View>

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleRecordWhispr}
        activeOpacity={0.8}
      >
        <View style={styles.createButtonContent}>
          <Icon name="add" size={24} color={theme.colors.onPrimary} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showRecordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseRecordModal}
      >
        <RecordTextWhisper
          onWhisprCreated={handleWhisprCreated}
          onClose={handleCloseRecordModal}
        />
      </Modal>

      {/* Chat Modal */}
      {selectedWhisprForChat && (
        <AnonymousChatModal
          visible={!!selectedWhisprForChat}
          whisprId={selectedWhisprForChat}
          onClose={() => setSelectedWhisprForChat(null)}
        />
      )}
    </GradientBackground>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 0 : 0, // StatusBar height handled by StatusBar component
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 36, // Same width as back button for centering
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  filterButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    minHeight: 48,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterIcon: {
    fontSize: 14,
  },
  filterIconCompact: {
    fontSize: 14,
  },
  filterButtonTextCompact: {
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  countBadgeCompact: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadgeTextCompact: {
    fontSize: 9,
    fontWeight: '700',
  },
  filterNote: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  filterPreviewText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  createButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LiveWhisprsScreen;
