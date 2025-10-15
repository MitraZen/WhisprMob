# SignIn Failed | Network Request Failed - Troubleshooting Guide

## Overview
This guide helps diagnose and fix the "SignIn failed | Network request Failed" error that occurs on connected devices.

## Quick Diagnosis Steps

### 1. Use the Built-in Auth Debugger
1. Open the app and navigate to **Settings**
2. Tap on **"Auth Debugger"** 
3. Tap **"Run Auth Tests"** to perform comprehensive network and authentication tests
4. Review the test results to identify the specific issue

### 2. Test Sign In Flow
1. In the Auth Debugger, tap **"Test Sign In"**
2. Enter your email and password (separated by comma)
3. Review the detailed logs to see exactly where the sign-in process fails

## Common Causes and Solutions

### 1. Network Connectivity Issues

**Symptoms:**
- "Network request failed" error
- Tests 1-3 in Auth Debugger fail

**Solutions:**
- Check device internet connection
- Try switching between WiFi and mobile data
- Restart the device
- Check if corporate firewall is blocking Supabase URLs

**Test:** Run Auth Debugger Test 1 (Basic Supabase Connection)

### 2. Supabase Configuration Issues

**Symptoms:**
- Tests 2-3 fail but Test 1 passes
- "Profile fetch failed" errors

**Solutions:**
- Verify Supabase URL and API key in `src/config/env.ts`
- Check Supabase project status in dashboard
- Ensure RLS policies allow anonymous access

**Test:** Run Auth Debugger Test 2 (Auth Settings) and Test 3 (User Profiles)

### 3. Authentication Service Issues

**Symptoms:**
- Test 4 fails (sign in with invalid credentials)
- "No access token returned" errors

**Solutions:**
- Check Supabase Auth settings
- Verify email confirmation is not required
- Check if password grant is enabled
- Review Auth service logs for detailed error messages

**Test:** Run Auth Debugger Test 4 (Sign In Flow)

### 4. Device-Specific Issues

**Symptoms:**
- Works on emulator but not on physical device
- Intermittent failures

**Solutions:**
- Check Android network security configuration
- Verify cleartext traffic is allowed for development
- Check device date/time settings
- Clear app data and cache

## Enhanced Error Handling

The AuthService has been enhanced with detailed logging. Check the console logs for:

```
🔐 AuthService.signIn: Starting sign in process...
🔐 AuthService.signIn: Email: [email]
🔐 AuthService.signIn: Supabase URL: [url]
🌐 Testing network connectivity...
🔐 AuthService.signIn: Network connectivity test passed
🔐 AuthService.signIn: Auth URL: [auth_url]
🔐 AuthService.signIn: Response status: [status]
```

## Network Security Configuration

For Android devices, ensure `android/app/src/main/res/xml/network_security_config.xml` allows cleartext traffic:

```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
    
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

## Supabase Configuration Verification

Check `src/config/env.ts`:

```typescript
export const SUPABASE_CONFIG = {
  url: 'https://axkktejoldizpveydidx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

## Testing Steps

1. **Run Auth Debugger Tests**
   - Navigate to Settings → Auth Debugger
   - Tap "Run Auth Tests"
   - Review all test results

2. **Test Sign In Flow**
   - Use "Test Sign In" button
   - Enter valid credentials
   - Check detailed logs

3. **Check Console Logs**
   - Look for 🔐 and 🌐 prefixed logs
   - Identify where the process fails

4. **Verify Network**
   - Test basic internet connectivity
   - Try different networks (WiFi vs mobile)
   - Check firewall settings

## Advanced Troubleshooting

### Check Supabase Dashboard
1. Go to your Supabase project dashboard
2. Check Authentication → Settings
3. Verify "Enable email confirmations" is OFF for testing
4. Check API → Settings for any restrictions

### Test with curl (if available)
```bash
curl -X POST "https://axkktejoldizpveydidx.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Check Device Logs
```bash
# Android
adb logcat | grep -i "whispr\|supabase\|auth"

# iOS
# Use Xcode console or device logs
```

## Prevention

1. **Always test on physical devices** during development
2. **Use the Auth Debugger** before reporting issues
3. **Check network connectivity** first
4. **Verify Supabase configuration** regularly
5. **Monitor console logs** for detailed error information

## Support

If issues persist after following this guide:

1. Run the Auth Debugger and save the test results
2. Check console logs for detailed error messages
3. Verify Supabase project status
4. Test with different networks and devices
5. Provide specific error messages and test results when seeking help

## Files Modified

- `src/components/AuthDebugger.tsx` - New debugging component
- `src/services/authService.ts` - Enhanced error handling and logging
- `src/screens/SettingsScreen.tsx` - Added Auth Debugger option
- `src/navigation/AppNavigator.tsx` - Added Auth Debugger navigation




