import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { useAuth } from '@/store/AuthContext';
import { supabase } from '@/config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';

interface ActivityItem {
  id: string;
  type: 'message' | 'buddy' | 'note' | 'profile';
  title: string;
  description: string;
  icon: string;
  color: string;
  timestamp: Date;
  action: string;
  metadata?: any;
}

const ActivityScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadActivities = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      let messages: any[] = [];
      let notes: any[] = [];
      let buddies: any[] = [];

      // Try to fetch recent messages
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from('buddy_messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            buddy_id
          `)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          console.error('Messages error details:', JSON.stringify(messagesError, null, 2));
        } else {
          messages = messagesData || [];
        }
      } catch (error) {
        console.error('Exception fetching messages:', error);
      }

      // Try to fetch recent notes
      try {
        const { data: notesData, error: notesError } = await supabase
          .from('whispr_notes')
          .select(`
            id,
            content,
            mood,
            created_at,
            sender_id
          `)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notesError) {
          console.error('Error fetching notes:', notesError);
          console.error('Notes error details:', JSON.stringify(notesError, null, 2));
        } else {
          notes = notesData || [];
        }
      } catch (error) {
        console.error('Exception fetching notes:', error);
      }

      // Try to fetch recent buddy connections
      try {
        const { data: buddiesData, error: buddiesError } = await supabase
          .from('buddies')
          .select(`
            id,
            created_at,
            buddy_user_id,
            user_id
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (buddiesError) {
          console.error('Error fetching buddies:', buddiesError);
          console.error('Buddies error details:', JSON.stringify(buddiesError, null, 2));
        } else {
          buddies = buddiesData || [];
        }
      } catch (error) {
        console.error('Exception fetching buddies:', error);
      }

      // Combine and format activities
      const allActivities: ActivityItem[] = [];

      // Process messages
      if (messages) {
        messages.forEach((message) => {
          allActivities.push({
            id: `message_${message.id}`,
            type: 'message',
            title: `Sent message to buddy`,
            description: message.content?.substring(0, 50) + (message.content?.length > 50 ? '...' : ''),
            icon: '📤',
            color: theme.colors.info,
            timestamp: new Date(message.created_at),
            action: 'message',
            metadata: { messageId: message.id, buddyId: message.buddy_id }
          });
        });
      }

      // Process notes
      if (notes) {
        notes.forEach((note) => {
          const moodEmojis: { [key: string]: string } = {
            'happy': '😊',
            'excited': '😄',
            'calm': '😌',
            'thoughtful': '🤔',
            'cool': '😎',
            'celebrating': '🥳',
            'sleepy': '😴',
            'loving': '🤗',
            'romantic': '😍',
            'content': '🙂'
          };

          allActivities.push({
            id: `note_${note.id}`,
            type: 'note',
            title: `Shared a ${note.mood || 'personal'} note`,
            description: note.content?.substring(0, 50) + (note.content?.length > 50 ? '...' : ''),
            icon: moodEmojis[note.mood || 'content'] || '📝',
            color: theme.colors.warning,
            timestamp: new Date(note.created_at),
            action: 'note',
            metadata: { noteId: note.id }
          });
        });
      }

      // Process buddy connections
      if (buddies) {
        buddies.forEach((buddy) => {
          allActivities.push({
            id: `buddy_${buddy.id}`,
            type: 'buddy',
            title: `Added new buddy`,
            description: 'New buddy connection established',
            icon: '👥',
            color: theme.colors.success,
            timestamp: new Date(buddy.created_at),
            action: 'buddy',
            metadata: { buddyId: buddy.id, buddyUserId: buddy.buddy_user_id }
          });
        });
      }

      // Sort by timestamp (most recent first)
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setActivities(allActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      Alert.alert('Error', 'Failed to load activities. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [user?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadActivities();
  };

  const handleActivityPress = (activity: ActivityItem) => {
    switch (activity.action) {
      case 'message':
        Alert.alert(
          'Message Activity',
          `${activity.title}\n\n${activity.description}\n\nThis would open the conversation.`,
          [{ text: 'OK' }]
        );
        break;
      case 'buddy':
        Alert.alert(
          'Buddy Activity',
          `${activity.title}\n\n${activity.description}\n\nThis would open the buddy's profile.`,
          [{ text: 'OK' }]
        );
        break;
      case 'note':
        Alert.alert(
          'Note Activity',
          `${activity.title}\n\n${activity.description}\n\nThis would open the note details.`,
          [{ text: 'OK' }]
        );
        break;
      default:
        Alert.alert('Activity', activity.title, [{ text: 'OK' }]);
    }
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const renderActivityItem = (activity: ActivityItem, index: number) => (
    <TouchableOpacity
      key={activity.id}
      style={[
        styles.activityItem,
        { backgroundColor: theme.colors.surface },
        index === activities.length - 1 && styles.lastActivityItem
      ]}
      onPress={() => handleActivityPress(activity)}
      activeOpacity={0.7}
    >
      <View style={styles.activityContent}>
        <View style={[
          styles.activityIconContainer,
          { backgroundColor: activity.color + '15' }
        ]}>
          <Text style={styles.activityIcon}>{activity.icon}</Text>
        </View>
        
        <View style={styles.activityTextContainer}>
          <Text style={[styles.activityItemTitle, { color: theme.colors.onSurface }]}>
            {activity.title}
          </Text>
          <Text style={[styles.activityItemDescription, { color: theme.colors.onSurfaceVariant }]}>
            {activity.description}
          </Text>
          <Text style={[styles.activityItemTime, { color: theme.colors.onSurfaceVariant }]}>
            {formatTimeAgo(activity.timestamp)}
          </Text>
        </View>
        
        <Icon 
          name="chevron-forward" 
          size={16} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
            Recent Activity
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading activities...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
          Recent Activity
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          {activities.length} activities
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              No Recent Activity
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.onSurfaceVariant }]}>
              Start chatting with buddies and sharing notes to see your activity here!
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {activities.map((activity, index) => renderActivityItem(activity, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44, // Add padding for status bar
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  activityList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  activityItem: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lastActivityItem: {
    marginBottom: 0,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityItemDescription: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  activityItemTime: {
    fontSize: 12,
  },
});

export default ActivityScreen;
