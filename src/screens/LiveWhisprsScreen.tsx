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
import WhisprFeed from '@/components/liveWhispers/WhisperFeed';
import RecordTextWhisper from '@/components/liveWhispers/RecordTextWhisper';

type DistanceFilter = '50km' | '100km' | 'beyond';

const LiveWhisprsScreen: React.FC = () => {
  const { theme } = useTheme();
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
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 0 : 0, // StatusBar height handled by StatusBar component
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
