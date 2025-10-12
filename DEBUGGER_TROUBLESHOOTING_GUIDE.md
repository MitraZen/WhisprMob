# 🔧 Debugger Troubleshooting Guide

## 🚨 **Issue Identified: Console Logging Suppressed**

The debugger appears to not be running because **console logging is being suppressed** in the Jest setup file (`jest.setup.js`).

### **Root Cause**
```javascript
// In jest.setup.js lines 11-15
if (!process.env.DEBUG_TESTS) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}
```

This means all `console.log`, `console.error`, and `console.warn` statements are being mocked during tests, making debugging impossible.

## 🛠️ **Solutions**

### **Solution 1: Enable Debug Mode for Tests**
```bash
# Run tests with debug mode enabled
DEBUG_TESTS=true npm test
DEBUG_TESTS=true npm run test:integration
DEBUG_TESTS=true npm run test:notifications
```

### **Solution 2: Use Debug Environment Variable**
```bash
# Set debug environment variable
set DEBUG_TESTS=true
npm test

# Or on Windows PowerShell
$env:DEBUG_TESTS="true"
npm test
```

### **Solution 3: Modify Jest Setup (Permanent Fix)**
Update `jest.setup.js` to allow debugging:

```javascript
// Replace lines 11-15 with:
if (!process.env.DEBUG_TESTS && !process.env.NODE_ENV === 'development') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}
```

### **Solution 4: Create Debug-Specific Test Scripts**
Add to `package.json`:

```json
{
  "scripts": {
    "test:debug": "DEBUG_TESTS=true npm test",
    "test:integration:debug": "DEBUG_TESTS=true npm run test:integration",
    "test:notifications:debug": "DEBUG_TESTS=true npm run test:notifications"
  }
}
```

## 🔍 **Debugging Tools Available**

### **1. Network Debugger Component**
- **Location**: `src/components/NetworkDebugger.tsx`
- **Access**: Tap "🔧 Network Debug" on welcome screen
- **Features**: 
  - Test Supabase connection
  - Test database tables
  - Real-time network diagnostics

### **2. Admin Debug Panel**
- **Access**: Tap logo 5 times on welcome screen
- **Password**: `whispr_admin_2024`
- **Features**:
  - Notification debugging
  - System status monitoring
  - Test controls

### **3. Console Debugging**
- **Enable**: Use `DEBUG_TESTS=true` environment variable
- **Features**: Full console.log output during tests

## 🧪 **Testing Debug Mode**

### **Test 1: Verify Console Logging**
```bash
# Run with debug enabled
DEBUG_TESTS=true npm test -- --testNamePattern="NotificationService"
```

### **Test 2: Check Network Debugger**
1. Start the app: `npm run android` or `npm run ios`
2. Tap "🔧 Network Debug" on welcome screen
3. Tap "Run Network Tests"
4. Check results

### **Test 3: Admin Debug Panel**
1. Start the app
2. Tap logo 5 times quickly
3. Enter password: `whispr_admin_2024`
4. Use debug controls

## 📱 **Metro Debugger Setup**

### **Start Metro with Debug Options**
```bash
# Start Metro with verbose logging
npx react-native start --verbose --reset-cache

# Start Metro with custom port
npx react-native start --port=8082

# Start Metro with HTTPS
npx react-native start --https
```

### **Enable Metro Debugging**
```bash
# Enable client logs (deprecated but useful)
npx react-native start --client-logs

# Enable custom log reporter
npx react-native start --custom-log-reporter-path=./debug-reporter.js
```

## 🔧 **Advanced Debugging**

### **1. Create Custom Debug Reporter**
Create `debug-reporter.js`:

```javascript
class DebugReporter {
  update(event) {
    if (event.type === 'bundle_build_done') {
      console.log('🔧 Bundle built successfully');
    }
    if (event.type === 'bundle_build_failed') {
      console.error('❌ Bundle build failed:', event.error);
    }
  }
}

module.exports = DebugReporter;
```

### **2. Enable React DevTools**
```bash
# Install React DevTools
npm install --save-dev react-devtools

# Start React DevTools
npx react-devtools
```

### **3. Enable Flipper Debugging**
```bash
# Install Flipper
# Download from: https://fbflipper.com/

# Enable Flipper in Metro
npx react-native start --flipper
```

## 🚀 **Quick Fix Commands**

### **Immediate Debugging**
```bash
# Enable debug mode and run tests
DEBUG_TESTS=true npm test

# Start Metro with debug options
npx react-native start --verbose --reset-cache

# Run specific test with debug
DEBUG_TESTS=true npm test -- --testNamePattern="NotificationService"
```

### **Check Debug Status**
```bash
# Check if debug mode is enabled
echo $DEBUG_TESTS

# Check Metro status
npx react-native start --help
```

## ⚠️ **Common Issues**

### **Issue 1: Console Still Not Showing**
- **Cause**: Environment variable not set correctly
- **Fix**: Use `set DEBUG_TESTS=true` (Windows) or `export DEBUG_TESTS=true` (Linux/Mac)

### **Issue 2: Metro Not Starting**
- **Cause**: Port conflicts or cache issues
- **Fix**: Use `--reset-cache` and `--port=8082`

### **Issue 3: Tests Running But No Output**
- **Cause**: Console mocking still active
- **Fix**: Ensure `DEBUG_TESTS=true` is set before running tests

## 📊 **Debug Output Examples**

### **With Debug Enabled**
```
🔍 DEBUG: MESSAGE SENDING START
📤 Send Message Request: {buddyId: "abc123", content: "Hello", userId: "def456"}
⏱️ DEBUG: RPC call completed in 245ms
📥 DEBUG: RPC Response: {"success": true, "message_id": "msg789"}
✅ DEBUG: Message sent successfully!
```

### **Without Debug (Suppressed)**
```
(No output - console.log is mocked)
```

## 🎯 **Next Steps**

1. **Enable Debug Mode**: Use `DEBUG_TESTS=true npm test`
2. **Test Console Output**: Verify logs are visible
3. **Use Network Debugger**: Test network connectivity
4. **Access Admin Panel**: Use advanced debugging features
5. **Monitor Metro**: Check for bundling issues

The debugger should now work properly with console output visible!
