import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  
  Alert,
} from 'react-native';
import { useAuth } from '@/store/AuthContext';
import { theme, moodConfig, spacing, borderRadius } from '@/utils/theme';
import { User, MoodType } from '@/types';

const ConnectionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [availableConnections] = useState<User[]>([]); // In real app, this would come from API

  const handleConnect = (connection: User) => {
    Alert.alert(
      'Connect Anonymously',
      `Start an anonymous conversation with someone who is feeling ${connection.mood}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => startConversation(connection) },
      ]
    );
  };

  const startConversation = (connection: User) => {
    // In real app, this would create a new chat and navigate to it
    Alert.alert('Success', 'Connection started! Check your messages.');
  };

  const renderConnectionItem = ({ item }: { item: User }) => {
    const moodConfigItem = moodConfig[item.mood] || { emoji: '😊', color: '#fbbf24', description: 'Unknown mood' };
    
    return (
      <View style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={styles.moodIndicator}>
            <Text style={styles.moodEmoji}>{moodConfigItem.emoji}</Text>
          </View>
          <View style={styles.connectionInfo}>
            <Text style={styles.moodName}>
              Feeling {item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}
            </Text>
            <Text style={styles.moodDescription}>
              {moodConfigItem.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.connectionFooter}>
          <Text style={styles.lastSeen}>
            Last seen {formatLastSeen(item.lastSeen)}
          </Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => handleConnect(item)}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={styles.emptyTitle}>No Connections Available</Text>
      <Text style={styles.emptyDescription}>
        Check back later to find others who share your current mood: {user?.mood}
      </Text>
    </View>
  );

  const formatLastSeen = (lastSeen: Date): string => {
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connections</Text>
        <Text style={styles.headerSubtitle}>
          Find others who share your mood
        </Text>
      </View>

      <View style={styles.currentMoodBanner}>
        <Text style={styles.bannerText}>
          You're currently feeling: {user?.mood && moodConfig[user.mood] ? moodConfig[user.mood].emoji : '😊'} {user?.mood || 'Unknown'}
        </Text>
      </View>

      <FlatList
        data={availableConnections}
        keyExtractor={(item) => item.id}
        renderItem={renderConnectionItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={availableConnections.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  currentMoodBanner: {
    backgroundColor: `${theme.colors.primary}10`,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  bannerText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  listContainer: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  connectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moodIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  moodEmoji: {
    fontSize: 24,
  },
  connectionInfo: {
    flex: 1,
  },
  moodName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  moodDescription: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 18,
  },
  connectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSeen: {
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  connectButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  connectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ConnectionsScreen;


