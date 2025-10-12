# 🚀 Whispr Mobile App - Testing Quick Start Guide

## 📋 **Overview**

This guide will help you get started with the comprehensive testing suite for the Whispr mobile app. The testing framework includes unit tests, integration tests, performance tests, and CI/CD automation.

---

## ⚡ **Quick Start**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Run All Tests**
```bash
npm run test:all
```

### **3. Run Specific Test Types**
```bash
# Unit tests only
npm run test

# Integration tests only
npm run test:integration

# Performance tests only
npm run test:performance

# With coverage report
npm run test:coverage
```

---

## 🧪 **Test Structure**

```
src/
├── __tests__/
│   ├── integration/
│   │   └── authFlow.test.tsx
│   └── performance/
│       └── appPerformance.test.ts
├── components/
│   └── __tests__/
│       └── NetworkDebugger.test.tsx
├── screens/
│   └── __tests__/
│       └── SignInScreen.test.tsx
└── services/
    └── __tests__/
        ├── authService.test.ts
        └── buddiesService.test.ts
```

---

## 🔧 **Configuration Files**

### **Jest Configuration** (`jest.config.js`)
- ✅ Fixed `moduleNameMapping` → `moduleNameMapper`
- ✅ Added coverage thresholds (70% minimum)
- ✅ Configured test environment
- ✅ Set up proper module resolution

### **Jest Setup** (`jest.setup.js`)
- ✅ Mocked React Native modules
- ✅ Mocked Supabase client
- ✅ Mocked AsyncStorage
- ✅ Mocked Geolocation and Push Notifications

### **Package.json Scripts**
- ✅ `test` - Run unit tests
- ✅ `test:watch` - Watch mode for development
- ✅ `test:coverage` - Generate coverage report
- ✅ `test:integration` - Run integration tests
- ✅ `test:performance` - Run performance tests
- ✅ `test:all` - Run all test suites

---

## 📊 **Test Coverage Goals**

| Component | Target Coverage |
|-----------|----------------|
| **Services** | 90%+ |
| **Store/Context** | 85%+ |
| **Components** | 75%+ |
| **Overall** | 80%+ |

---

## 🎯 **Test Types**

### **1. Unit Tests**
- **Purpose**: Test individual functions and components in isolation
- **Location**: `src/**/__tests__/*.test.ts`
- **Examples**:
  - `AuthService.signUp()` functionality
  - `BuddiesService.sendWhisprNote()` logic
  - Component rendering and user interactions

### **2. Integration Tests**
- **Purpose**: Test how different parts work together
- **Location**: `src/__tests__/integration/`
- **Examples**:
  - Complete authentication flow
  - Navigation between screens
  - API integration with Supabase

### **3. Performance Tests**
- **Purpose**: Ensure app meets performance requirements
- **Location**: `src/__tests__/performance/`
- **Examples**:
  - API response times (< 3 seconds)
  - Memory usage limits
  - Concurrent operation handling

---

## 🚀 **CI/CD Pipeline**

### **GitHub Actions Workflow** (`.github/workflows/test.yml`)
- ✅ **Unit Tests**: Jest with coverage reporting
- ✅ **Integration Tests**: API and database tests
- ✅ **Performance Tests**: Response time validation
- ✅ **Security Scan**: Dependency vulnerability check
- ✅ **Android Build**: APK generation and upload

### **Automated Triggers**
- Push to `main` or `develop` branches
- Pull requests to `main` branch
- Manual workflow dispatch

---

## 📈 **Running Tests**

### **Development Mode**
```bash
# Watch mode - runs tests on file changes
npm run test:watch

# Run specific test file
npm test -- SignInScreen.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="signup"
```

### **Coverage Analysis**
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### **Debug Mode**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run single test with debug info
npm test -- --testNamePattern="should sign in" --verbose
```

---

## 🔍 **Test Examples**

### **Service Test Example**
```typescript
describe('AuthService', () => {
  it('should create user successfully', async () => {
    const result = await AuthService.signUp('test@example.com', 'password123', 'happy');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
});
```

### **Component Test Example**
```typescript
describe('SignInScreen', () => {
  it('should call login when form is submitted', async () => {
    const { getByPlaceholderText, getByText } = render(<SignInScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
```

### **Performance Test Example**
```typescript
describe('Performance Tests', () => {
  it('should load buddies within acceptable time', async () => {
    const startTime = performance.now();
    await BuddiesService.getBuddies('user-123');
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // 2 seconds max
  });
});
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

**1. Jest Configuration Error**
```bash
# Error: moduleNameMapping is not a valid option
# Fix: Already corrected in jest.config.js
```

**2. Mock Issues**
```bash
# Error: Cannot find module '@supabase/supabase-js'
# Fix: Mocks are configured in jest.setup.js
```

**3. Coverage Issues**
```bash
# Error: Coverage threshold not met
# Fix: Run specific tests to improve coverage
npm run test:coverage -- --testPathPattern="services"
```

### **Debug Commands**
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with debug info
npm test -- --verbose --no-cache

# Check Jest configuration
npm test -- --showConfig
```

---

## 📚 **Next Steps**

### **Phase 1: Foundation** ✅ **COMPLETED**
- Fixed Jest configuration
- Set up test framework
- Created basic test files
- Configured CI/CD pipeline

### **Phase 2: Expansion** 🚧 **NEXT**
- Add more component tests
- Create E2E tests with Detox
- Add database function tests
- Implement test data factories

### **Phase 3: Optimization** 🔮 **FUTURE**
- Parallel test execution
- Test result caching
- Advanced performance monitoring
- Automated test generation

---

## 🎉 **Success Metrics**

- ✅ **Jest Configuration**: Fixed and working
- ✅ **Test Framework**: Fully set up
- ✅ **CI/CD Pipeline**: Automated testing
- ✅ **Coverage Reporting**: Configured
- ✅ **Performance Testing**: Implemented
- 🎯 **Target Coverage**: 80%+ (currently building)

---

## 📞 **Support**

If you encounter any issues with the testing setup:

1. **Check Jest Configuration**: Ensure `jest.config.js` is correct
2. **Verify Dependencies**: Run `npm install` to ensure all packages are installed
3. **Clear Cache**: Run `npm test -- --clearCache` if tests behave unexpectedly
4. **Check Mocks**: Verify mocks in `jest.setup.js` match your dependencies

The testing framework is now ready for development! 🚀
