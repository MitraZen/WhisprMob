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
import { spacing, borderRadius } from '@/utils/themes';
import WhisprFeed from '@/components/liveWhispers/WhisperFeed';
import RecordTextWhisper from '@/components/liveWhispers/RecordTextWhisper';
import GradientBackground from '@/components/GradientBackground';

type DistanceFilter = '50km' | '100km' | 'beyond';

interface DistanceRange {
  min: number; // in meters
  max: number; // in meters
  label: string;
  icon: string;
  description: string;
}

const DISTANCE_RANGES: Record<DistanceFilter, DistanceRange> = {
  '50km': {
    min: 0,
    max: 50000,
    label: 'Local',
    icon: '📍',
    description: 'Within 50km',
  },
  '100km': {
    min: 50000, // ✅ EXCLUSIVE: Start where 50km ends
    max: 100000,
    label: 'Regional',
    icon: '🌍',
    description: '50-100km away',
  },
  'beyond': {
    min: 100000, // ✅ EXCLUSIVE: Start where 100km ends
    max: Infinity,
    label: 'Global',
    icon: '🚀',
    description: 'Beyond 100km',
  },
};

interface LiveWhisprsScreenProps {
  onNavigate: (screen: string) => void;
}

const LiveWhisprsScreen: React.FC<LiveWhisprsScreenProps> = ({ onNavigate }) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('50km');
  const [filterLoading, setFilterLoading] = useState(false);
  // Counts disabled per user request
  // const [filterCounts, setFilterCounts] = useState<Record<DistanceFilter, number | null>>({
  //   '50km': null,
  //   '100km': null,
  //   'beyond': null,
  // });
  // const [countsLoading, setCountsLoading] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleRecordWhispr = () => {
    setShowRecordModal(true);
  };

  const handleWhisprCreated = (whisprId: string) => {
    console.log('Whispr created:', whisprId);
    setShowRecordModal(false);
  };

  const handleCloseRecordModal = () => {
    setShowRecordModal(false);
  };

  // ✅ PERFORMANCE: Debounce filter changes to avoid excessive re-renders
  const handleFilterChange = useCallback((filter: DistanceFilter) => {
    // Don't do anything if already selected
    if (filter === distanceFilter) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Show loading state immediately for better UX
    setFilterLoading(true);

    // Debounce the actual filter change
    debounceTimerRef.current = setTimeout(() => {
      setDistanceFilter(filter);
      // Loading will be cleared by WhisperFeed's onFilterLoadingChange callback
    }, 300);
  }, [distanceFilter]);

  // DISABLED: Count fetching - counts are not shown per user request
  // useEffect(() => {
  //   const fetchFilterCounts = async () => {
  //     // Count fetching disabled
  //   };
  //   fetchFilterCounts();
  // }, []);

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
  }, [distanceFilter, fadeAnim]);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const getDistanceFilterRadius = (filter: DistanceFilter): { min: number; max: number } => {
    const range = DISTANCE_RANGES[filter];
    return { min: range.min, max: range.max };
  };

  return (
    <GradientBackground variant="default">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* Header with Back Button */}
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.1)' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('buddies')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Live Whisprs
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Distance Filter Header */}
      <View style={[styles.filterContainer, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.05)' }]}>
        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>
          Show whisprs within:
        </Text>
        <View style={styles.filterButtons}>
          {(['50km', '100km', 'beyond'] as DistanceFilter[]).map((filter) => {
            const range = DISTANCE_RANGES[filter];
            const isSelected = distanceFilter === filter;
            
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: isSelected 
                      ? theme.colors.primary 
                      : (isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(255, 255, 255, 0.1)'),
                    borderColor: isSelected 
                      ? theme.colors.primary 
                      : theme.colors.border,
                    shadowColor: isSelected ? theme.colors.primary : 'transparent',
                  }
                ]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.7}
                disabled={filterLoading && !isSelected}
              >
                <View style={styles.filterButtonContent}>
                  {filterLoading && isSelected ? (
                    <ActivityIndicator 
                      size="small" 
                      color={theme.colors.surface} 
                      style={{ marginRight: spacing.xs }}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.filterButtonText,
                      {
                        color: isSelected 
                          ? theme.colors.surface 
                          : theme.colors.text,
                      }
                    ]}
                  >
                    {range.label}
                  </Text>
                  <Text style={styles.filterIcon}>
                    {range.icon}
                  </Text>
                </View>
                {/* ✅ UI/UX: Preview stat under filter button */}
                <Text style={[
                  styles.filterPreviewText,
                  { color: isSelected ? theme.colors.surface : theme.colors.onSurfaceVariant }
                ]}>
                  {range.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Note about future update */}
        <Text style={[styles.filterNote, { color: theme.colors.onSurfaceVariant }]}>
          **Local Whisprs will unlock in a future update
        </Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <WhisprFeed 
          onRecordWhispr={handleRecordWhispr}
          distanceRange={getDistanceFilterRadius(distanceFilter)}
          distanceFilter={distanceFilter}
          onFilterLoadingChange={setFilterLoading}
        />
      </Animated.View>

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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
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
  countBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  countBadgeText: {
    fontSize: 11,
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
});

export default LiveWhisprsScreen;
