import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';


import { theme, spacing, borderRadius } from '@/utils/theme';
import { Chat, Message } from '@/types';
import { formatTimestamp } from '@/utils/helpers';

type RootStackParamList = {
  Chat: { chatId: string };
};



const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const [chats] = useState<Chat[]>([]); // In real app, this would come from state/store

  const renderChatItem = ({ item }: { item: Chat }) => {
    const handleChatPress = () => {
      navigation.navigate('Chat', { chatId: item.id });
    };

    return (
      <TouchableOpacity style={styles.chatItem} onPress={handleChatPress}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.participants.length > 0 ? '👤' : '💬'}
          </Text>
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>
              Anonymous Connection {item.id.slice(-4)}
            </Text>
            <Text style={styles.timestamp}>
              {item.lastMessage ? formatTimestamp(item.lastMessage.timestamp) : ''}
            </Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
        {item.lastMessage && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>1</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptyDescription}>
        Start connecting with others who share your mood to begin anonymous conversations.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          Your anonymous conversations
        </Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  listContainer: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  chatItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 18,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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

export default MessagesScreen;


