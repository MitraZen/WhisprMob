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

type CountryFilter = 'regional' | 'global';

interface FilterConfig {
  label: string;
  icon: string;
  description: string;
}

const FILTER_CONFIG: Record<CountryFilter, FilterConfig> = {
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
  const styles = createStyles(theme, isDark);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('regional');
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterCounts, setFilterCounts] = useState<{ regional: number | string; global: number | string }>({
    regional: 0,
    global: 0,
  });
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
      // Loading will be cleared by WhisperFeed's onFilterLoadingChange callback
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
      
      {/* Country Filter Header */}
      <View style={[styles.filterContainer, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.05)' }]}>
        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>
          Filter by location:
        </Text>
        <View style={styles.filterButtons}>
          {(['regional', 'global'] as CountryFilter[]).map((filter) => {
            const config = FILTER_CONFIG[filter];
            const isSelected = countryFilter === filter;
            
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
                    {config.label}
                  </Text>
                  <Text style={styles.filterIcon}>
                    {config.icon}
                  </Text>
                  {/* ✅ COUNT BADGE */}
                  <View style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.onPrimary
                        : theme.colors.primaryContainer,
                    }
                  ]}>
                    <Text style={[
                      styles.countBadgeText,
                      {
                        color: isSelected
                          ? theme.colors.primary
                          : theme.colors.onPrimaryContainer,
                      }
                    ]}>
                      {filterCounts[filter]}
                    </Text>
                  </View>
                </View>
                {/* ✅ UI/UX: Preview stat under filter button */}
                <Text style={[
                  styles.filterPreviewText,
                  { color: isSelected ? theme.colors.surface : theme.colors.onSurfaceVariant }
                ]}>
                  {config.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <WhisprFeed 
          onRecordWhispr={handleRecordWhispr}
          countryFilter={countryFilter}
          onFilterLoadingChange={setFilterLoading}
          onCountsUpdate={setFilterCounts}
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
