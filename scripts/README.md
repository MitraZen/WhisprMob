# 🛠️ Whispr Mobile App Scripts

This directory contains utility scripts for testing, debugging, and verification of the Whispr Mobile App.

## 📁 Directory Structure

```
scripts/
├── tests/           # Testing scripts for various app components
├── debug/           # Debugging scripts for troubleshooting issues
├── verification/    # Verification scripts for setup validation
└── README.md        # This file
```

---

## 🧪 Tests (`scripts/tests/`)

Testing scripts for different app functionalities:

### Authentication & User Management
- **`test-auth-signup.js`** - Test Supabase authentication signup process
- **`test-forgot-password.js`** - Test password reset functionality
- **`test-forgot-password-real.js`** - Test password reset with real email addresses
- **`test-fresh-email.js`** - Test authentication with fresh email addresses
- **`test-specific-user.js`** - Test functionality for specific user accounts

### Database & Import
- **`test-after-import.js`** - Test database functionality after data import
- **`test-note-fix.js`** - Test note-related functionality and fixes

### Usage
```bash
# Run in browser console or Node.js
node scripts/tests/test-auth-signup.js

# Or copy-paste into browser console for direct testing
```

---

## 🐛 Debug (`scripts/debug/`)

Debugging scripts for troubleshooting production issues:

### Error Investigation
- **`debug-500-error.js`** - Deep debugging for 500 server errors
- **`final-password-reset-diagnosis.js`** - Comprehensive password reset issue diagnosis

### Features
- ✅ **Detailed logging** with step-by-step analysis
- ✅ **API endpoint testing** with response validation
- ✅ **Error categorization** and suggested fixes
- ✅ **Network connectivity** verification

### Usage
```bash
# Run in browser console for immediate debugging
# Copy script content and paste in browser dev tools

# Or run with Node.js (if configured)
node scripts/debug/debug-500-error.js
```

---

## ✅ Verification (`scripts/verification/`)

Scripts for verifying system setup and configuration:

### Setup Validation
- **`verify-smtp-setup.js`** - Verify SMTP configuration and email functionality

### Features
- ✅ **SMTP configuration** validation
- ✅ **Email service** connectivity testing
- ✅ **Auth settings** verification
- ✅ **Step-by-step** setup validation

### Usage
```bash
# Verify SMTP setup
node scripts/verification/verify-smtp-setup.js

# Or run in browser console for immediate results
```

---

## 🔧 Configuration Files (Root Directory)

Essential configuration files remain in the project root:

### Build & Development
- **`index.js`** - React Native app entry point
- **`babel.config.js`** - Babel transpilation configuration
- **`metro.config.js`** - Metro bundler configuration
- **`jest.config.js`** - Jest testing framework configuration
- **`jest.setup.js`** - Jest setup and initialization

### Code Quality
- **`.eslintrc.js`** - ESLint code linting rules
- **`.prettierrc.js`** - Prettier code formatting rules

---

## 🚀 Usage Guidelines

### For Testing
1. **Choose appropriate test script** from `tests/` folder
2. **Update credentials** if needed (use test accounts only)
3. **Run in browser console** or Node.js environment
4. **Review output** for pass/fail results

### For Debugging
1. **Identify the issue** you're investigating
2. **Select relevant debug script** from `debug/` folder
3. **Run script** and analyze detailed output
4. **Follow suggested fixes** from script results

### For Verification
1. **Run verification scripts** after setup changes
2. **Check all validation steps** pass
3. **Address any failed validations** before proceeding
4. **Re-run scripts** to confirm fixes

---

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

- **Never commit** API keys or credentials to version control
- **Use test accounts** only for testing scripts
- **Avoid production data** in test scripts
- **Review scripts** before running in production environment
- **Update credentials** regularly for security

---

## 📝 Script Development

### Adding New Scripts

1. **Choose appropriate category** (tests/debug/verification)
2. **Follow naming convention**: `action-description.js`
3. **Include comprehensive logging** for debugging
4. **Add error handling** for robust execution
5. **Update this README** with script description

### Best Practices

- ✅ **Clear, descriptive names** for functions and variables
- ✅ **Comprehensive error handling** with try-catch blocks
- ✅ **Detailed console logging** for debugging
- ✅ **Modular functions** for reusability
- ✅ **Comments explaining** complex logic

### Example Script Structure

```javascript
// Script purpose and description
const CONFIG = {
  SUPABASE_URL: 'your-url',
  SUPABASE_ANON_KEY: 'your-key'
};

async function mainFunction() {
  console.log('🔍 Starting [Script Name]');
  
  try {
    // Main logic here
    console.log('✅ Success: Operation completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
mainFunction();
```

---

## 🆘 Troubleshooting

### Common Issues

1. **CORS errors** - Run scripts in browser console instead of Node.js
2. **Authentication failures** - Check API keys and credentials
3. **Network timeouts** - Verify internet connection and API endpoints
4. **Permission errors** - Ensure proper API permissions in Supabase

### Getting Help

- Check **[Troubleshooting Documentation](../docs/troubleshooting/)** first
- Review **script output logs** for specific error messages
- Verify **API credentials** and **network connectivity**
- Consult **[Database Documentation](../docs/database/)** for database issues

---

*Last updated: 2025-01-24*

