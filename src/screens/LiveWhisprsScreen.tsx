import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import WhisprFeed from '@/components/liveWhispers/WhisperFeed';
import RecordTextWhisper from '@/components/liveWhispers/RecordTextWhisper';
import GradientBackground from '@/components/GradientBackground';

type DistanceFilter = '50km' | '100km' | 'beyond';

interface LiveWhisprsScreenProps {
  onNavigate: (screen: string) => void;
}

const LiveWhisprsScreen: React.FC<LiveWhisprsScreenProps> = ({ onNavigate }) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('50km');

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

  const getDistanceFilterRadius = (filter: DistanceFilter): number => {
    switch (filter) {
      case '50km':
        return 50000; // 50km in meters
      case '100km':
        return 100000; // 100km in meters
      case 'beyond':
        return 1000000; // 1000km in meters (effectively unlimited)
      default:
        return 50000;
    }
  };

  return (
    <GradientBackground variant="default">
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
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
            const getFilterIcon = (filterType: DistanceFilter) => {
              switch (filterType) {
                case '50km':
                  return '📍';
                case '100km':
                  return '🌍';
                case 'beyond':
                  return '🚀';
                default:
                  return '📍';
              }
            };

            const getFilterLabel = (filterType: DistanceFilter) => {
              switch (filterType) {
                case '50km':
                  return 'Local';
                case '100km':
                  return 'Regional';
                case 'beyond':
                  return 'Global';
                default:
                  return 'Local';
              }
            };

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
                onPress={() => setDistanceFilter(filter)}
                activeOpacity={0.7}
              >
                <View style={styles.filterButtonContent}>
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
                    {getFilterLabel(filter)}
                  </Text>
                  <Text style={styles.filterIcon}>
                    {getFilterIcon(filter)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <WhisprFeed 
        onRecordWhispr={handleRecordWhispr}
        distanceRadius={getDistanceFilterRadius(distanceFilter)}
      />

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
    backdropFilter: 'blur(10px)',
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    backdropFilter: 'blur(10px)',
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
    backdropFilter: 'blur(10px)',
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
    paddingVertical: 6,
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
    minHeight: 32,
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
});

export default LiveWhisprsScreen;
