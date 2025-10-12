// Define global variables first
global.__DEV__ = true;
global.__TEST__ = true;

// Mock console.log to prevent spam during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly enabled or in development
if (!process.env.DEBUG_TESTS && process.env.NODE_ENV !== 'development') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  })),
}));

// Mock Geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock Push Notifications
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  requestPermissions: jest.fn(),
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);