import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { theme, spacing } from '@/utils/theme';
import { useNearby } from './useNearby';
import { NearbyUser } from './NearbyService';

const { width } = Dimensions.get('window');

interface NearbyScreenProps {
  userId: string;
  onNavigate: (screen: string) => void;
}

const NearbyScreen: React.FC<NearbyScreenProps> = ({ userId, onNavigate }) => {
  const {
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
  } = useNearby(userId);

  const [showWhisperModal, setShowWhisperModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [whisperContent, setWhisperContent] = useState('');

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleUserTap = async (user: NearbyUser) => {
    try {
      // Create a simple whisper note
      const whisperContent = `Hello ${user.anonymous_id}! I found you nearby.`;
      
      const success = await sendWhisperNote(user.id, whisperContent);
      
      if (success) {
        console.log('✅ Whisper sent successfully');
      }
    } catch (error) {
      console.error('❌ Error sending whisper:', error);
    }
  };

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapContent}>
        <Text style={styles.mapTitle}>📍 Location Map</Text>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            {nearbyUsers.length > 0 
              ? `${nearbyUsers.length} user${nearbyUsers.length > 1 ? 's' : ''} nearby`
              : 'No users detected nearby'
            }
          </Text>
          {nearbyUsers.map((user, index) => (
            <View key={user.id} style={styles.userMarker}>
              <Text style={styles.userMarkerText}>{user.anonymous_id}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderControlPanel = () => (
    <View style={styles.controlPanel}>
      <View style={styles.toggleContainer}>
        <View style={styles.toggleItem}>
          <View style={styles.toggleHeader}>
            <Text style={styles.toggleLabel}>Enable Nearby</Text>
            <Switch
              value={isEnabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: '#E5E5E5', true: theme.colors.primary }}
              thumbColor={isEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          <Text style={styles.toggleSubtext}>Let others find you nearby</Text>
        </View>

        <View style={styles.toggleItem}>
          <View style={styles.toggleHeader}>
            <Text style={styles.toggleLabel}>Auto Refresh</Text>
            <Switch
              value={autoRefresh}
              onValueChange={toggleAutoRefresh}
              trackColor={{ false: '#E5E5E5', true: theme.colors.primary }}
              thumbColor={autoRefresh ? '#FFFFFF' : '#FFFFFF'}
              disabled={!isEnabled}
            />
          </View>
          <Text style={styles.toggleSubtext}>Auto updates every 2 min</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={refreshLocation}
          disabled={!isEnabled || isLoading}
        >
          <Text style={styles.actionButtonIcon}>🔄</Text>
          <Text style={styles.actionButtonText}>Refresh Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.findButton]}
          onPress={findNearbyUsers}
          disabled={!isEnabled || isLoading}
        >
          <Text style={styles.actionButtonIcon}>👥</Text>
          <Text style={styles.actionButtonText}>Find Nearby</Text>
        </TouchableOpacity>
      </View>

      {lastUpdated && (
        <Text style={styles.timestamp}>
          Last updated • {formatTime(lastUpdated)}
        </Text>
      )}
    </View>
  );

  const renderNearbyUsers = () => (
    <View style={styles.nearbySection}>
      <Text style={styles.sectionTitle}>Discover Whisprs Nearby</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching for nearby users...</Text>
        </View>
      ) : nearbyUsers.length > 0 ? (
        <View style={styles.usersList}>
          {nearbyUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => handleUserTap(user)}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user.anonymous_id}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.anonymous_id}</Text>
                <Text style={styles.userStatus}>
                  {user.is_online ? '🟢 Online' : '⚪ Recently active'}
                </Text>
              </View>
              <View style={styles.userAction}>
                <Text style={styles.userActionText}>👋</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {isEnabled 
              ? 'No whispers around… yet.'
              : 'Enable nearby to discover users around you'
            }
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Whisprs</Text>
        <Text style={styles.headerSubtitle}>
          Find and connect with users around you
        </Text>
      </View>

      {renderMapView()}
      {renderControlPanel()}
      {renderNearbyUsers()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
  mapContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapContent: {
    padding: spacing.lg,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  userMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  userMarkerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  controlPanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#F6F6FA',
    borderRadius: 12,
    padding: spacing.lg,
  },
  toggleContainer: {
    marginBottom: spacing.lg,
  },
  toggleItem: {
    marginBottom: spacing.md,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  toggleSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.xs,
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  findButton: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    opacity: 0.6,
    textAlign: 'center',
  },
  nearbySection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  usersList: {
    gap: spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  userStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  userAction: {
    padding: spacing.sm,
  },
  userActionText: {
    fontSize: 20,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});

export default NearbyScreen;









