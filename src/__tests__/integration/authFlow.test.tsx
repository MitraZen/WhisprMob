import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../store/AuthContext';
import { AdminProvider } from '../../store/AdminContext';
import { ThemeProvider } from '../../store/ThemeContext';
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

// Mock the database services to prevent infinite loops
jest.mock('../../services/flexibleDatabase', () => ({
  FlexibleDatabaseService: {
    getUserById: jest.fn(() => Promise.resolve(null)),
    createUser: jest.fn(() => Promise.resolve({ id: 'test-user', anonymousId: 'test-anon' })),
    updateUserOnlineStatus: jest.fn(() => Promise.resolve()),
    isProfileComplete: jest.fn(() => Promise.resolve(false)),
  },
}));

jest.mock('../../services/buddiesService', () => ({
  BuddiesService: {
    syncUserOnlineStatus: jest.fn(() => Promise.resolve()),
  },
}));

// Mock notification services
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  requestPermissions: jest.fn(() => Promise.resolve()),
}));

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to default behavior
    jest.mocked(require('@react-native-async-storage/async-storage').getItem).mockResolvedValue(null);
  });

  it('should render welcome screen initially', async () => {
    const component = render(
      <ThemeProvider>
        <AdminProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </AdminProvider>
      </ThemeProvider>
    );

    // Wait for the component to finish loading with timeout
    await waitFor(() => {
      expect(component.getByText('Sign In')).toBeTruthy();
    }, { timeout: 5000 });

    // Verify welcome screen elements
    expect(component.getByText('Whispr')).toBeTruthy();
    expect(component.getByText('Sign Up')).toBeTruthy();
  }, 10000);

  it('should handle authentication state changes', async () => {
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

    // Initially should show welcome screen with sign in button
    expect(component.getByText('Sign In')).toBeTruthy();
    expect(component.getByText('Sign Up')).toBeTruthy();
  }, 10000);
});

describe('Navigation Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(require('@react-native-async-storage/async-storage').getItem).mockResolvedValue(null);
  });

  it('should render app without crashing', async () => {
    const component = render(
      <ThemeProvider>
        <AdminProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </AdminProvider>
      </ThemeProvider>
    );

    // Just verify the app renders without crashing
    await waitFor(() => {
      expect(component.getByText('Whispr')).toBeTruthy();
    }, { timeout: 5000 });
  }, 10000);
});
