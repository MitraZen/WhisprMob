import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { connectionRecoveryService, ConnectionState } from '@/services/connectionRecoveryService';
import { realtimeService } from '@/services/realtimeService';
import { notificationManager } from '@/services/notificationManager';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ConnectionStatusProps {
  onPress?: () => void;
  showDetails?: boolean;
  style?: any;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  onPress, 
  showDetails = false,
  style 
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isInternetReachable: null,
    type: null,
    isRealtimeConnected: false,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    connectionQuality: 'offline',
    retryCount: 0,
    isRetrying: false,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Get initial state
    const initialState = connectionRecoveryService.getConnectionState();
    setConnectionState(initialState);

    // Listen for connection state changes
    const unsubscribe = connectionRecoveryService.onConnectionStateChange((state) => {
      setConnectionState(state);
      
      // Animate pulse for retrying state
      if (state.isRetrying) {
        startPulseAnimation();
      } else {
        stopPulseAnimation();
      }
    });

    // Also listen for React Native events
    const eventListener = DeviceEventEmitter.addListener('connectionStateChanged', (state) => {
      setConnectionState(state);
    });

    return () => {
      unsubscribe();
      eventListener.remove();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const getStatusColor = () => {
    switch (connectionState.connectionQuality) {
      case 'excellent':
        return '#4CAF50'; // Green
      case 'good':
        return '#8BC34A'; // Light green
      case 'poor':
        return '#FF9800'; // Orange
      case 'offline':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getStatusIcon = () => {
    if (connectionState.isRetrying) {
      return 'sync';
    }
    
    switch (connectionState.connectionQuality) {
      case 'excellent':
        return 'wifi';
      case 'good':
        return 'wifi';
      case 'poor':
        return 'wifi-off';
      case 'offline':
        return 'wifi-off';
      default:
        return 'wifi-off';
    }
  };

  const getStatusText = () => {
    if (connectionState.isRetrying) {
      return `Reconnecting... (${connectionState.retryCount})`;
    }
    
    switch (connectionState.connectionQuality) {
      case 'excellent':
        return 'Connected';
      case 'good':
        return 'Connected';
      case 'poor':
        return 'Poor Connection';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (showDetails) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleForceReconnect = async () => {
    try {
      await connectionRecoveryService.forceReconnection();
    } catch (error) {
      console.error('Failed to force reconnection:', error);
    }
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getDetailedInfo = () => {
    const realtimeStatus = realtimeService.getConnectionRecoveryStatus();
    const notificationStatus = notificationManager.getConnectionRecoveryStatus();
    
    return {
      realtime: realtimeStatus,
      notifications: notificationStatus,
    };
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={[
        styles.statusIndicator,
        { 
          backgroundColor: getStatusColor(),
          transform: [{ scale: pulseAnim }]
        }
      ]}>
        <Icon 
          name={getStatusIcon()} 
          size={16} 
          color="white" 
          style={connectionState.isRetrying ? styles.rotatingIcon : undefined}
        />
      </Animated.View>
      
      <View style={styles.textContainer}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        
        {showDetails && (
          <Text style={styles.detailsText}>
            {connectionState.type && `${connectionState.type.toUpperCase()}`}
            {connectionState.isInternetReachable !== null && 
              ` • ${connectionState.isInternetReachable ? 'Internet' : 'No Internet'}`}
          </Text>
        )}
      </View>

      {showDetails && isExpanded && (
        <View style={styles.expandedDetails}>
          <Text style={styles.detailTitle}>Connection Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Type:</Text>
            <Text style={styles.detailValue}>{connectionState.type || 'Unknown'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Internet Reachable:</Text>
            <Text style={styles.detailValue}>
              {connectionState.isInternetReachable === null ? 'Unknown' : 
               connectionState.isInternetReachable ? 'Yes' : 'No'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Realtime Connected:</Text>
            <Text style={styles.detailValue}>
              {connectionState.isRealtimeConnected ? 'Yes' : 'No'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Retry Count:</Text>
            <Text style={styles.detailValue}>{connectionState.retryCount}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Connected:</Text>
            <Text style={styles.detailValue}>
              {formatTimestamp(connectionState.lastConnectedAt)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Disconnected:</Text>
            <Text style={styles.detailValue}>
              {formatTimestamp(connectionState.lastDisconnectedAt)}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.reconnectButton}
            onPress={handleForceReconnect}
            disabled={connectionState.isRetrying}
          >
            <Icon 
              name="refresh" 
              size={16} 
              color={connectionState.isRetrying ? '#9E9E9E' : '#2196F3'} 
            />
            <Text style={[
              styles.reconnectText,
              { color: connectionState.isRetrying ? '#9E9E9E' : '#2196F3' }
            ]}>
              {connectionState.isRetrying ? 'Reconnecting...' : 'Force Reconnect'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    minHeight: 40,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rotatingIcon: {
    transform: [{ rotate: '360deg' }],
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expandedDetails: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reconnectText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ConnectionStatus;

