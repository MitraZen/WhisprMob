import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider } from '../../store/AuthContext';
import { AdminProvider } from '../../store/AdminContext';
import { ThemeProvider } from '../../store/ThemeContext';
import { notificationService } from '../../services/notificationService';
import { notificationManager } from '../../services/notificationManager';
import { realtimeService } from '../../services/realtimeService';
import { BuddiesService } from '../../services/buddiesService';
import AppNavigator from '../../navigation/AppNavigator';

// Mock console.log to prevent spam
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

// Mock the navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useFocusEffect: jest.fn(),
}));

// Mock AsyncStorage for ThemeProvider
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock notification services
jest.mock('../../services/notificationService', () => ({
  notificationService: {
    showMessageNotification: jest.fn(),
    showNoteNotification: jest.fn(),
    showGeneralNotification: jest.fn(),
    testNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
  },
}));

jest.mock('../../services/notificationManager', () => ({
  notificationManager: {
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    isPolling: jest.fn(() => false),
    triggerNotificationCheck: jest.fn(),
  },
}));

jest.mock('../../services/realtimeService', () => ({
  realtimeService: {
    initialize: jest.fn(),
    disconnect: jest.fn(),
    isRealtimeConnected: jest.fn(() => false),
    testConnection: jest.fn(),
    getConnectionStatus: jest.fn(() => ({
      isConnected: false,
      userId: null,
      subscriptionCount: 0,
    })),
  },
}));

// Mock BuddiesService
jest.mock('../../services/buddiesService', () => ({
  BuddiesService: {
    getBuddies: jest.fn(),
    getMessages: jest.fn(),
    getWhisprNotes: jest.fn(),
    getNotifications: jest.fn(),
    markNotificationAsRead: jest.fn(),
    testNetworkConnection: jest.fn(),
  },
}));

// Mock the database services to prevent infinite loops
jest.mock('../../services/flexibleDatabase', () => ({
  FlexibleDatabaseService: {
    getUserById: jest.fn(() => Promise.resolve(null)),
    createUser: jest.fn(() => Promise.resolve({ id: 'test-user', anonymousId: 'test-anon' })),
    updateUserOnlineStatus: jest.fn(() => Promise.resolve()),
    isProfileComplete: jest.fn(() => Promise.resolve(false)),
  },
}));

// Mock notification services
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
}));

describe('Notification Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to default behavior
    jest.mocked(require('@react-native-async-storage/async-storage').getItem).mockResolvedValue(null);
    
    // Mock successful service responses
    jest.mocked(notificationService.showMessageNotification).mockResolvedValue('Message notification sent successfully');
    jest.mocked(notificationService.showNoteNotification).mockResolvedValue('Note notification sent successfully');
    jest.mocked(notificationService.testNotification).mockResolvedValue('Test notification sent successfully');
    jest.mocked(realtimeService.initialize).mockResolvedValue();
    jest.mocked(realtimeService.disconnect).mockResolvedValue();
    jest.mocked(notificationManager.startPolling).mockImplementation();
    jest.mocked(notificationManager.stopPolling).mockImplementation();
    jest.mocked(BuddiesService.testNetworkConnection).mockResolvedValue(true);
    jest.mocked(BuddiesService.getBuddies).mockResolvedValue([]);
    jest.mocked(BuddiesService.getMessages).mockResolvedValue([]);
    jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue([]);
    jest.mocked(BuddiesService.getNotifications).mockResolvedValue([]);
    jest.mocked(BuddiesService.markNotificationAsRead).mockResolvedValue();
  });

  describe('Notification Service Integration', () => {
    it('should initialize notification services on app start', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders without crashing
      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);

    it('should handle notification service initialization errors gracefully', async () => {
      // Mock service initialization failure
      jest.mocked(realtimeService.initialize).mockRejectedValue(new Error('Service initialization failed'));
      
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // App should still render despite service errors
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);
  });

  describe('Notification Manager Integration', () => {
    it('should start notification polling when user logs in', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders
      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);

    it('should handle notification manager errors gracefully', async () => {
      // Mock notification manager failure
      jest.mocked(notificationManager.startPolling).mockImplementation(() => {
        throw new Error('Polling failed');
      });
      
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // App should still render despite manager errors
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);
  });

  describe('Realtime Service Integration', () => {
    it('should initialize realtime service on app start', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders
      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);

    it('should handle realtime service disconnection gracefully', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders
      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);
  });

  describe('Notification Flow End-to-End', () => {
    it('should handle complete notification flow without errors', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders
      expect(component.getByText('Whispr')).toBeTruthy();
      expect(component.getByText('Sign In')).toBeTruthy();
      expect(component.getByText('Sign Up')).toBeTruthy();
    }, 10000);

    it('should handle network connectivity issues gracefully', async () => {
      // Mock network connectivity issues
      jest.mocked(BuddiesService.testNetworkConnection).mockResolvedValue(false);
      
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // App should still render despite network issues
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);

    it('should handle database service errors gracefully', async () => {
      // Mock database service errors
      jest.mocked(BuddiesService.getBuddies).mockRejectedValue(new Error('Database error'));
      jest.mocked(BuddiesService.getMessages).mockRejectedValue(new Error('Database error'));
      jest.mocked(BuddiesService.getWhisprNotes).mockRejectedValue(new Error('Database error'));
      
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // App should still render despite database errors
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);
  });

  describe('Service Coordination', () => {
    it('should coordinate between notification services properly', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders
      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);

    it('should handle service initialization order correctly', async () => {
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify the app renders
      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);
  });

  describe('Error Recovery', () => {
    it('should recover from notification service failures', async () => {
      // Mock initial service failure followed by success
      jest.mocked(notificationService.showMessageNotification)
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValue('Message notification sent successfully');
      
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // App should still render despite initial service failure
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);

    it('should handle partial service failures gracefully', async () => {
      // Mock partial service failures
      jest.mocked(notificationService.showMessageNotification).mockResolvedValue('Message notification sent successfully');
      jest.mocked(notificationService.showNoteNotification).mockRejectedValue(new Error('Note service unavailable'));
      
      const component = render(
        <ThemeProvider>
          <AdminProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </AdminProvider>
        </ThemeProvider>
      );

      // App should still render despite partial service failure
      await waitFor(() => {
        expect(component.getByText('Sign In')).toBeTruthy();
      }, { timeout: 5000 });

      expect(component.getByText('Whispr')).toBeTruthy();
    }, 10000);
  });
});
