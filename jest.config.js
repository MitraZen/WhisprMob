module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@react-native-community|react-native-gifted-chat|react-native-vector-icons|react-native-linear-gradient|react-native-svg|react-native-animatable|react-native-modal|react-native-paper|react-native-elements|react-native-keychain|react-native-crypto-js|react-native-async-storage|react-native-socket.io-client)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
    __TEST__: true,
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  testTimeout: 15000, // Increased timeout for integration tests
  verbose: true, // Show individual test results
};