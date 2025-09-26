import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme, spacing } from '@/utils/theme';
import { useAdmin } from '@/store/AdminContext';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const {
    isAdminMode,
    isAdminAuthenticated,
    debugMode,
    showDebugInfo,
    databaseStats,
    userStats,
    messageStats,
    isLoading,
    error,
    enableAdminMode,
    authenticateAdmin,
    logoutAdmin,
    toggleDebugMode,
    toggleDebugInfo,
    refreshStats,
    clearError,
    testDatabaseConnection,
    clearAllData,
    resetUserData,
    sendTestMessage,
    simulateUserActivity,
    clearFakeNotes,
  } = useAdmin();

  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from Admin!');
  const [buddyList, setBuddyList] = useState<any[]>([]);
  const [selectedBuddyId, setSelectedBuddyId] = useState('');

  useEffect(() => {
    if (isAdminMode && !isAdminAuthenticated) {
      setShowPasswordModal(true);
    }
  }, [isAdminMode, isAdminAuthenticated]);

  // Load buddy list when admin is authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadBuddyList();
    }
  }, [isAdminAuthenticated]);

  const loadBuddyList = async () => {
    try {
      const { FlexibleDatabaseService } = await import('@/services/flexibleDatabase');
      const buddies = await FlexibleDatabaseService.request('GET', 'buddies?select=id,user_id,name,initials');
      setBuddyList(buddies);
    } catch (error) {
      console.error('Error loading buddy list:', error);
    }
  };

  const handleAdminLogin = async () => {
    const success = await authenticateAdmin(adminPassword);
    if (success) {
      setShowPasswordModal(false);
      setAdminPassword('');
    }
  };

  const handleTestDatabase = async () => {
    const success = await testDatabaseConnection();
    Alert.alert(
      'Database Test',
      success ? 'Database connection successful!' : 'Database connection failed!'
    );
  };

  const handleRefreshStats = async () => {
    await refreshStats();
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all user data, messages, and connections. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAllData },
      ]
    );
  };

  const handleResetUser = () => {
    if (!selectedUserId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }
    Alert.alert(
      'Reset User Data',
      `This will reset all data for user ${selectedUserId}. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetUserData(selectedUserId) },
      ]
    );
  };

  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSendTestMessage = () => {
    if (!selectedUserId.trim() || !testMessage.trim()) {
      Alert.alert('Error', 'Please enter both user ID and message');
      return;
    }
    
    if (!isValidUUID(selectedUserId)) {
      Alert.alert('Error', 'Please enter a valid UUID for User ID.');
      return;
    }
    
    sendTestMessage(selectedUserId, testMessage);
  };

  const handleClearFakeNotes = () => {
    Alert.alert(
      'Clear Fake Notes',
      'This will remove all fake/test notes from the database. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Fake Notes', style: 'destructive', onPress: clearFakeNotes },
      ]
    );
  };

  const handleSimulateActivity = () => {
    if (!selectedUserId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }
    
    if (!isValidUUID(selectedUserId)) {
      Alert.alert('Error', 'Please enter a valid UUID for User ID.');
      return;
    }
    
    simulateUserActivity(selectedUserId);
  };

  if (!isAdminMode) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Access</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.description}>
            Enable admin mode to access debugging tools and system controls.
          </Text>
          <TouchableOpacity style={styles.enableButton} onPress={enableAdminMode}>
            <Text style={styles.enableButtonText}>Enable Admin Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <Modal visible={showPasswordModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Authentication</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter admin password"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  onClose();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleAdminLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Debug Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Controls</Text>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Debug Mode</Text>
            <Switch value={debugMode} onValueChange={toggleDebugMode} />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Show Debug Info</Text>
            <Switch value={showDebugInfo} onValueChange={toggleDebugInfo} />
          </View>
        </View>

        {/* Database Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Controls</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleTestDatabase}>
            <Text style={styles.actionButtonText}>Test Database Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleRefreshStats}>
            <Text style={styles.actionButtonText}>Refresh Statistics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleClearAllData}
          >
            <Text style={styles.actionButtonText}>Clear All Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]} 
            onPress={handleClearFakeNotes}
          >
            <Text style={styles.actionButtonText}>Clear Fake Notes</Text>
          </TouchableOpacity>
        </View>

        {/* User Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Management</Text>
          
          <Text style={styles.inputLabel}>Select User (from Buddy List):</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBuddyId}
              onValueChange={(value) => {
                setSelectedBuddyId(value);
                if (value) {
                  const selectedBuddy = buddyList.find(buddy => buddy.id === value);
                  if (selectedBuddy) {
                    setSelectedUserId(selectedBuddy.user_id);
                  }
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select a buddy..." value="" />
              {buddyList.map((buddy) => (
                <Picker.Item 
                  key={buddy.id} 
                  label={`${buddy.name} (${buddy.initials})`} 
                  value={buddy.id} 
                />
              ))}
            </Picker>
          </View>
          
          <Text style={styles.inputLabel}>Or Enter User ID Manually:</Text>
          <TextInput
            style={styles.input}
            placeholder="User ID (e.g., c26e55f2-b196-...)"
            value={selectedUserId}
            onChangeText={setSelectedUserId}
          />
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleResetUser}
            disabled={!selectedUserId}
          >
            <Text style={styles.actionButtonText}>Reset User Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSimulateActivity}
            disabled={!selectedUserId}
          >
            <Text style={styles.actionButtonText}>Simulate User Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Message Testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message Testing</Text>
          
          <Text style={styles.inputLabel}>Select User (from Buddy List):</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBuddyId}
              onValueChange={(value) => {
                setSelectedBuddyId(value);
                if (value) {
                  const selectedBuddy = buddyList.find(buddy => buddy.id === value);
                  if (selectedBuddy) {
                    setSelectedUserId(selectedBuddy.user_id);
                  }
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select a buddy..." value="" />
              {buddyList.map((buddy) => (
                <Picker.Item 
                  key={buddy.id} 
                  label={`${buddy.name} (${buddy.initials})`} 
                  value={buddy.id} 
                />
              ))}
            </Picker>
          </View>
          
          <Text style={styles.inputLabel}>Or Enter User ID Manually:</Text>
          <TextInput
            style={styles.input}
            placeholder="User ID (e.g., c26e55f2-b196-...)"
            value={selectedUserId}
            onChangeText={setSelectedUserId}
          />
          
          <Text style={styles.inputLabel}>Test Message Content:</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Enter test message content..."
            value={testMessage}
            onChangeText={setTestMessage}
            multiline
            numberOfLines={3}
          />
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSendTestMessage}
            disabled={!selectedUserId || !testMessage.trim()}
          >
            <Text style={styles.actionButtonText}>Send Test Message</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Display */}
        {showDebugInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Statistics</Text>
            
            {databaseStats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Database Stats</Text>
                <Text style={styles.statsText}>Tables: {databaseStats.tables || 'N/A'}</Text>
                <Text style={styles.statsText}>Connections: {databaseStats.connections || 'N/A'}</Text>
                <Text style={styles.statsText}>Status: {databaseStats.status || 'N/A'}</Text>
              </View>
            )}
            
            {userStats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>User Stats</Text>
                <Text style={styles.statsText}>Total Users: {userStats.totalUsers || 0}</Text>
                <Text style={styles.statsText}>Active Users: {userStats.activeUsers || 0}</Text>
                <Text style={styles.statsText}>Online Users: {userStats.onlineUsers || 0}</Text>
              </View>
            )}
            
            {messageStats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Message Stats</Text>
                <Text style={styles.statsText}>Total Messages: {messageStats.totalMessages || 0}</Text>
                <Text style={styles.statsText}>Today's Messages: {messageStats.todayMessages || 0}</Text>
                <Text style={styles.statsText}>Active Chats: {messageStats.activeChats || 0}</Text>
              </View>
            )}
          </View>
        )}

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={logoutAdmin}>
            <Text style={styles.actionButtonText}>Logout Admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  description: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  enableButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  enableButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: spacing.xl,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.onSurface,
    fontSize: 16,
  },
  loginButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  controlLabel: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  logoutButton: {
    backgroundColor: '#6b7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  dismissText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  statsText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  pickerContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: spacing.md,
  },
  picker: {
    height: 50,
    color: theme.colors.onSurface,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default AdminPanel;
