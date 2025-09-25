import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '@/store/AuthContext';
import { useAdmin } from '@/store/AdminContext';
import { theme, spacing, borderRadius, getMoodConfig } from '@/utils/theme';
import { realtimeService } from '@/services/realtimeService';
import { BuddiesService, WhisprNote } from '@/services/buddiesService';
import { NoteCard } from '@/components/NoteCard';
import { NavigationMenu } from '@/components/NavigationMenu';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
  user?: any;
}

const EmptyState = () => (
  <View style={styles.centeredContainer}>
    <Text style={styles.emptyIcon}>💭</Text>
    <Text style={styles.emptyText}>No new Whisprs</Text>
    <Text style={styles.emptySubtext}>Pull down to check again!</Text>
  </View>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, user: propUser }) => {
  const { user: authUser } = useAuth();
  const { enableAdminMode } = useAdmin();
  const user = propUser || authUser;
  
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState<WhisprNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      console.log('Loading notes for user:', user.id);
      // Temporarily disable real-time service to prevent crashes
      loadNotes();
    }
  }, [user?.id]);

  // Auto-refresh notes every 15 seconds
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadNotes();
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadNotes = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading Whispr notes for user:', user.id);
      
      // Load real notes from database
      const notesData = await BuddiesService.getWhisprNotes(user.id);
      console.log(`Loaded ${notesData.length} real notes from database`);
      
      setNotes(notesData);
      setIsNewUser(notesData.length === 0);
      
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to load notes - using offline mode');
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const handleAction = async (action: 'listen' | 'reject', noteId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      if (action === 'listen') {
        console.log('Listening to note:', noteId);
        await BuddiesService.listenToNote(noteId, user.id);
        Alert.alert('Note Listened! 👂', 'You\'ve listened to this note.');
      } else {
        console.log('Rejecting note:', noteId);
        await BuddiesService.rejectNote(noteId, user.id);
        Alert.alert('Note Rejected', 'This note has been removed from your feed.');
      }
      
      // Remove the note from the list
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      
    } catch (error) {
      console.error(`Error ${action}ing to note:`, error);
      Alert.alert('Error', `Failed to ${action} note. Please try again.`);
    }
  };

  // Admin function to simulate incoming note
  const simulateIncomingNote = async () => {
    if (!user?.id) return;
    
    try {
      const testNote: WhisprNote = {
        id: `test-${Date.now()}`,
        senderId: 'test-user-id',
        content: 'This is a test note from admin! 🧪',
        mood: 'excited',
        status: 'active',
        propagationCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Add the test note to the current notes
      setNotes(prevNotes => [testNote, ...prevNotes]);
      
      Alert.alert('Test Note Added', 'A test note has been added to your feed!');
    } catch (error) {
      console.error('Error simulating note:', error);
      Alert.alert('Error', 'Failed to simulate note.');
    }
  };

  if (!user) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.whisperIcon}>💬</Text>
            <Text style={styles.title}>Whispr</Text>
            <Text style={styles.titleAccent}>Notes</Text>
          </View>
          <Text style={styles.subtitle}>Share your thoughts anonymously with the world</Text>
          <View style={styles.floatingElements}>
            <Text style={styles.floatingIcon1}>✨</Text>
            <Text style={styles.floatingIcon2}>🌟</Text>
            <Text style={styles.floatingIcon3}>💫</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Notes List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={{ marginTop: 50 }}
          />
        ) : notes.length === 0 ? (
          <EmptyState />
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              id={note.id}
              text={note.content}
              tag="🌸 Positive Vibe"
              timeAgo="1m ago"
              onListen={() => handleAction('listen', note.id)}
              onReject={() => handleAction('reject', note.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Gradient Floating Action Button */}
      <TouchableOpacity
        style={styles.fabWrapper}
        onPress={() => onNavigate('compose')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#A78BFA', '#8B5CF6']}
          style={styles.fab}
        >
          <Text style={styles.fabIcon}>✨</Text>
          <Text style={styles.fabText}>Start Whispr-ing</Text>
          <Text style={styles.fabArrow}>→</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Navigation Menu */}
      <NavigationMenu currentScreen="notes" onNavigate={onNavigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.lg,
  },
  headerContent: {
    alignItems: 'center',
    position: 'relative',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  whisperIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleAccent: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    marginLeft: 4,
    opacity: 0.9,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  floatingElements: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  floatingIcon1: {
    fontSize: 20,
    opacity: 0.7,
    transform: [{ rotate: '-15deg' }],
  },
  floatingIcon2: {
    fontSize: 24,
    opacity: 0.8,
    transform: [{ rotate: '10deg' }],
  },
  floatingIcon3: {
    fontSize: 18,
    opacity: 0.6,
    transform: [{ rotate: '-5deg' }],
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 150, // Increased to accommodate FAB above NavigationMenu
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 100, // Position above the NavigationMenu (70px height + 30px margin)
    left: spacing.lg,
    right: spacing.lg,
  },
  fab: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  fabIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    color: '#fff',
  },
  fabText: {
    ...theme.typography.titleMedium,
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  fabArrow: {
    ...theme.typography.titleMedium,
    color: '#fff',
    fontWeight: '600' as const,
  },
});

export default HomeScreen;
