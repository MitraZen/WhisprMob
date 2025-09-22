import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, spacing } from '@/utils/theme';
import { useAdmin } from '@/store/AdminContext';
import { useAuth } from '@/store/AuthContext';

interface DebugOverlayProps {
  onToggleAdmin: () => void;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ onToggleAdmin }) => {
  const { debugMode, showDebugInfo, toggleDebugInfo } = useAdmin();
  const { isAuthenticated, user, isProfileComplete } = useAuth();

  if (!debugMode) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Info</Text>
        <TouchableOpacity onPress={toggleDebugInfo} style={styles.toggleButton}>
          <Text style={styles.toggleText}>{showDebugInfo ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
      
      {showDebugInfo && (
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authentication</Text>
            <Text style={styles.infoText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
            <Text style={styles.infoText}>Profile Complete: {isProfileComplete ? 'Yes' : 'No'}</Text>
            <Text style={styles.infoText}>User ID: {user?.id || 'None'}</Text>
            <Text style={styles.infoText}>Mood: {user?.mood || 'None'}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <TouchableOpacity style={styles.actionButton} onPress={onToggleAdmin}>
              <Text style={styles.actionButtonText}>Open Admin Panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: spacing.sm,
    minWidth: 200,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: '#ccc',
    fontSize: 10,
    marginBottom: 2,
  },
  actionButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default DebugOverlay;
