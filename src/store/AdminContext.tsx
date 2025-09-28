import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';

interface NotificationDebugInfo {
  platform: string;
  notificationModuleAvailable: boolean;
  realtimeConnectionStatus: string;
  pollingStatus: boolean;
  lastNotificationTime: string | null;
}

interface NotificationTestResult {
  success: boolean;
  message: string;
  timestamp: number;
  details?: any;
}

interface AdminState {
  isAdminMode: boolean;
  isAdminAuthenticated: boolean;
  debugMode: boolean;
  showDebugInfo: boolean;
  databaseStats: any;
  userStats: any;
  messageStats: any;
  isLoading: boolean;
  error: string | null;
  // Notification debugging properties
  notificationDebugInfo: any;
  notificationTestResults: any[];
  isNotificationDebugging: boolean;
}

interface AdminContextType extends AdminState {
  enableAdminMode: () => void;
  disableAdminMode: () => void;
  authenticateAdmin: (password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  toggleDebugMode: () => void;
  toggleDebugInfo: () => void;
  refreshStats: () => Promise<void>;
  clearError: () => void;
  // Debug actions
  testDatabaseConnection: () => Promise<boolean>;
  clearAllData: () => Promise<void>;
  resetUserData: (userId: string) => Promise<void>;
  sendTestMessage: (userId: string, message: string) => Promise<void>;
  simulateUserActivity: (userId: string) => Promise<void>;
  clearFakeNotes: () => Promise<void>;
  // Notification debugging actions
  refreshNotificationDebugInfo: () => Promise<void>;
  testAllNotifications: () => Promise<void>;
  sendTestNotificationToUser: (userId: string, type: 'message' | 'note' | 'general') => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  startNotificationDebugging: () => void;
  stopNotificationDebugging: () => void;
  clearNotificationDebugHistory: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

type AdminAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ENABLE_ADMIN_MODE' }
  | { type: 'DISABLE_ADMIN_MODE' }
  | { type: 'AUTHENTICATE_ADMIN' }
  | { type: 'LOGOUT_ADMIN' }
  | { type: 'TOGGLE_DEBUG_MODE' }
  | { type: 'TOGGLE_DEBUG_INFO' }
  | { type: 'SET_DATABASE_STATS'; payload: any }
  | { type: 'SET_USER_STATS'; payload: any }
  | { type: 'SET_MESSAGE_STATS'; payload: any }
  | { type: 'SET_NOTIFICATION_DEBUG_INFO'; payload: any }
  | { type: 'SET_NOTIFICATION_TEST_RESULTS'; payload: any[] }
  | { type: 'TOGGLE_NOTIFICATION_DEBUGGING' }
  | { type: 'CLEAR_NOTIFICATION_DEBUG_HISTORY' };

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'ENABLE_ADMIN_MODE':
      return { ...state, isAdminMode: true };
    case 'DISABLE_ADMIN_MODE':
      return { ...state, isAdminMode: false, isAdminAuthenticated: false };
    case 'AUTHENTICATE_ADMIN':
      return { ...state, isAdminAuthenticated: true, error: null };
    case 'LOGOUT_ADMIN':
      return { ...state, isAdminAuthenticated: false };
    case 'TOGGLE_DEBUG_MODE':
      return { ...state, debugMode: !state.debugMode };
    case 'TOGGLE_DEBUG_INFO':
      return { ...state, showDebugInfo: !state.showDebugInfo };
    case 'SET_DATABASE_STATS':
      return { ...state, databaseStats: action.payload };
    case 'SET_USER_STATS':
      return { ...state, userStats: action.payload };
    case 'SET_MESSAGE_STATS':
      return { ...state, messageStats: action.payload };
    case 'SET_NOTIFICATION_DEBUG_INFO':
      return { ...state, notificationDebugInfo: action.payload };
    case 'SET_NOTIFICATION_TEST_RESULTS':
      return { ...state, notificationTestResults: action.payload };
    case 'TOGGLE_NOTIFICATION_DEBUGGING':
      return { ...state, isNotificationDebugging: !state.isNotificationDebugging };
    case 'CLEAR_NOTIFICATION_DEBUG_HISTORY':
      return { ...state, notificationTestResults: [] };
    default:
      return state;
  }
};

const initialState: AdminState = {
  isAdminMode: false,
  isAdminAuthenticated: false,
  debugMode: false,
  showDebugInfo: false,
  databaseStats: null,
  userStats: null,
  messageStats: null,
  isLoading: false,
  error: null,
  notificationDebugInfo: null,
  notificationTestResults: [],
  isNotificationDebugging: false,
};

// Admin password - in production, this should be more secure
const ADMIN_PASSWORD = 'whispr_admin_2024';

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  const enableAdminMode = () => {
    dispatch({ type: 'ENABLE_ADMIN_MODE' });
  };

  const disableAdminMode = () => {
    dispatch({ type: 'DISABLE_ADMIN_MODE' });
  };

  const authenticateAdmin = async (password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      if (password === ADMIN_PASSWORD) {
        dispatch({ type: 'AUTHENTICATE_ADMIN' });
        await refreshStats();
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Invalid admin password' });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Authentication failed' });
      return false;
    }
  };

  const logoutAdmin = () => {
    dispatch({ type: 'LOGOUT_ADMIN' });
  };

  const toggleDebugMode = () => {
    dispatch({ type: 'TOGGLE_DEBUG_MODE' });
  };

  const toggleDebugInfo = () => {
    dispatch({ type: 'TOGGLE_DEBUG_INFO' });
  };

  const refreshStats = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Get database stats
      const dbStats = await FlexibleDatabaseService.getDatabaseStats();
      dispatch({ type: 'SET_DATABASE_STATS', payload: dbStats });
      
      // Get user stats
      const userStats = await FlexibleDatabaseService.getUserStats();
      dispatch({ type: 'SET_USER_STATS', payload: userStats });
      
      // Get message stats
      const messageStats = await FlexibleDatabaseService.getMessageStats();
      dispatch({ type: 'SET_MESSAGE_STATS', payload: messageStats });
      
    } catch (error) {
      console.error('Error refreshing stats:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh statistics' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Debug actions
  const testDatabaseConnection = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await FlexibleDatabaseService.testConnection();
      if (!result) {
        dispatch({ type: 'SET_ERROR', payload: 'Database connection failed' });
      }
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Database test failed' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearAllData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await FlexibleDatabaseService.clearAllData();
      await refreshStats();
      Alert.alert('Success', 'All data cleared successfully');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resetUserData = async (userId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await FlexibleDatabaseService.resetUserData(userId);
      await refreshStats();
      Alert.alert('Success', 'User data reset successfully');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to reset user data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendTestMessage = async (userId: string, message: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await FlexibleDatabaseService.sendTestMessage(userId, message);
      Alert.alert('Success', 'Test message sent successfully');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send test message' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const simulateUserActivity = async (userId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await FlexibleDatabaseService.simulateUserActivity(userId);
      Alert.alert('Success', 'User activity simulated successfully');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to simulate user activity' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearFakeNotes = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const deletedCount = await FlexibleDatabaseService.clearFakeNotes();
      await refreshStats();
      Alert.alert('Success', `Cleared ${deletedCount} fake notes from the database`);
    } catch (error) {
      console.error('Error clearing fake notes:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear fake notes' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Notification debugging methods
  const refreshNotificationDebugInfo = async () => {
    try {
      // Mock implementation - replace with actual notification service calls
      const debugInfo = {
        platform: 'React Native',
        notificationModuleAvailable: true,
        realtimeConnectionStatus: 'Connected',
        pollingStatus: true,
        lastNotificationTime: new Date().toISOString(),
      };
      dispatch({ type: 'SET_NOTIFICATION_DEBUG_INFO', payload: debugInfo });
    } catch (error) {
      console.error('Error refreshing notification debug info:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh notification debug info' });
    }
  };

  const testAllNotifications = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Mock test results - replace with actual notification tests
      const testResult = {
        success: true,
        message: 'All notification tests passed',
        timestamp: Date.now(),
        details: { testsRun: 5, passed: 5, failed: 0 }
      };
      
      dispatch({ type: 'SET_NOTIFICATION_TEST_RESULTS', payload: [...state.notificationTestResults, testResult] });
    } catch (error) {
      const testResult = {
        success: false,
        message: 'Notification tests failed',
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
      dispatch({ type: 'SET_NOTIFICATION_TEST_RESULTS', payload: [...state.notificationTestResults, testResult] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendTestNotificationToUser = async (userId: string, type: 'message' | 'note' | 'general') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Mock implementation - replace with actual notification sending
      const testResult = {
        success: true,
        message: `Test ${type} notification sent to user ${userId}`,
        timestamp: Date.now(),
        details: { userId, type }
      };
      
      dispatch({ type: 'SET_NOTIFICATION_TEST_RESULTS', payload: [...state.notificationTestResults, testResult] });
      Alert.alert('Success', `Test ${type} notification sent to user ${userId}`);
    } catch (error) {
      const testResult = {
        success: false,
        message: `Failed to send test ${type} notification to user ${userId}`,
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
      dispatch({ type: 'SET_NOTIFICATION_TEST_RESULTS', payload: [...state.notificationTestResults, testResult] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearAllNotifications = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Mock implementation - replace with actual notification clearing
      Alert.alert('Success', 'All notifications cleared');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear notifications' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const startNotificationDebugging = () => {
    dispatch({ type: 'TOGGLE_NOTIFICATION_DEBUGGING' });
  };

  const stopNotificationDebugging = () => {
    dispatch({ type: 'TOGGLE_NOTIFICATION_DEBUGGING' });
  };

  const clearNotificationDebugHistory = () => {
    dispatch({ type: 'CLEAR_NOTIFICATION_DEBUG_HISTORY' });
  };

  const value: AdminContextType = {
    ...state,
    enableAdminMode,
    disableAdminMode,
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
    refreshNotificationDebugInfo,
    testAllNotifications,
    sendTestNotificationToUser,
    clearAllNotifications,
    startNotificationDebugging,
    stopNotificationDebugging,
    clearNotificationDebugHistory,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
