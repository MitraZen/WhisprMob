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

type DistanceFilter = '50km' | '100km' | 'beyond';

interface LiveWhisprsScreenProps {
  onNavigate: (screen: string) => void;
}

const LiveWhisprsScreen: React.FC<LiveWhisprsScreenProps> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      
      {/* Header with Back Button */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
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
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>
          Show whisprs within:
        </Text>
        <View style={styles.filterButtons}>
          {(['50km', '100km', 'beyond'] as DistanceFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                {
                  backgroundColor: distanceFilter === filter 
                    ? theme.colors.primary 
                    : theme.colors.surface,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => setDistanceFilter(filter)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: distanceFilter === filter 
                      ? theme.colors.surface 
                      : theme.colors.text,
                  }
                ]}
              >
                {filter === 'beyond' ? 'Beyond 100km' : filter}
              </Text>
            </TouchableOpacity>
          ))}
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
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
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
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LiveWhisprsScreen;
