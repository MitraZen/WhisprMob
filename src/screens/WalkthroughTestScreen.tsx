import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { useWalkthrough } from '@/store/WalkthroughContext';
import WalkthroughService from '@/services/walkthroughService';

export const WalkthroughTestScreen = () => {
  const { theme } = useTheme();
  const { 
    showWalkthrough, 
    hideWalkthrough, 
    resetAllWalkthroughs,
    isVisible,
    currentWalkthrough,
    isLoading,
    error
  } = useWalkthrough();

  const handleTestWalkthrough = async (walkthroughId: string) => {
    try {
      await showWalkthrough(walkthroughId);
    } catch (err) {
      console.error('Error starting walkthrough:', err);
    }
  };

  const handleResetAll = async () => {
    try {
      await resetAllWalkthroughs();
      console.log('✅ All walkthroughs reset');
    } catch (err) {
      console.error('Error resetting walkthroughs:', err);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const stats = await WalkthroughService.getCompletionStats();
      console.log('📊 Completion stats:', stats);
      
      const mainCompleted = await WalkthroughService.isWalkthroughCompleted('main_app_tour');
      console.log('🎯 Main app tour completed:', mainCompleted);
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Walkthrough Testing</Text>
      
      {/* Status Display */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Current Status:</Text>
        <Text style={styles.statusText}>Visible: {isVisible ? '✅ Yes' : '❌ No'}</Text>
        <Text style={styles.statusText}>Loading: {isLoading ? '⏳ Yes' : '✅ No'}</Text>
        <Text style={styles.statusText}>Current Tour: {currentWalkthrough?.name || 'None'}</Text>
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
      </View>

      {/* Test Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Start Walkthroughs</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleTestWalkthrough('main_app_tour')}
        >
          <Text style={styles.buttonText}>Main App Tour</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleTestWalkthrough('first_message')}
        >
          <Text style={styles.buttonText}>First Message Guide</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => handleTestWalkthrough('buddy_chat')}
        >
          <Text style={styles.buttonText}>Buddy Chat Guide</Text>
        </TouchableOpacity>
      </View>

      {/* Control Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Controls</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.resetButton]}
          onPress={handleResetAll}
        >
          <Text style={styles.buttonText}>Reset All Walkthroughs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.hideButton]}
          onPress={hideWalkthrough}
        >
          <Text style={styles.buttonText}>Hide Current Walkthrough</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.statusButton]}
          onPress={handleCheckStatus}
        >
          <Text style={styles.buttonText}>Check Status (Console)</Text>
        </TouchableOpacity>
      </View>

      {/* Available Walkthroughs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Available Walkthroughs</Text>
        {WalkthroughService.getWalkthroughs().map((walkthrough) => (
          <View key={walkthrough.id} style={styles.walkthroughItem}>
            <Text style={styles.walkthroughName}>{walkthrough.name}</Text>
            <Text style={styles.walkthroughId}>ID: {walkthrough.id}</Text>
            <Text style={styles.walkthroughSteps}>{walkthrough.steps.length} steps</Text>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Testing Instructions</Text>
        <Text style={styles.instructionText}>
          1. Tap "Reset All Walkthroughs" to start fresh{'\n'}
          2. Tap any walkthrough button to test{'\n'}
          3. Check console for detailed logs{'\n'}
          4. Test navigation (Next/Previous/Skip){'\n'}
          5. Verify completion is saved
        </Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.onSurface,
  },
  statusContainer: {
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.onSurface,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: theme.colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 14,
    color: '#FF4444',
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.colors.onSurface,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
  },
  hideButton: {
    backgroundColor: '#FFA726',
  },
  statusButton: {
    backgroundColor: '#66BB6A',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  walkthroughItem: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  walkthroughName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  walkthroughId: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  walkthroughSteps: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.onSurfaceVariant,
  },
});

export default WalkthroughTestScreen;
