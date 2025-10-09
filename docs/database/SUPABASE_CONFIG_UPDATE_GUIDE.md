# 🔧 Complete Configuration Update Guide for Supabase Migration

## 📋 Configuration Files That Need Updates

### **1. Primary Configuration Files** ⭐

#### **`src/config/env.ts`** (MAIN CONFIG)
```typescript
export const SUPABASE_CONFIG = {
  // OLD: https://bkfonnecvqlppivnrgxe.supabase.co
  // NEW: https://whispr-mobile-app-production.supabase.co
  url: 'https://whispr-mobile-app-production.supabase.co',
  
  // OLD: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZm9ubmVjdnFscHBpdm5yZ3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDE0MTUsImV4cCI6MjA3MzAxNzQxNX0.t0f-n4JT9Lb6LBCxSIf6umH4pxWvgFuA62-0IVGejwg
  // NEW: [Get from new Supabase project dashboard]
  anonKey: 'NEW_ANON_KEY_HERE',
  
  // NEW: [Get service role key from new project]
  serviceRoleKey: 'NEW_SERVICE_ROLE_KEY_HERE',
};
```

#### **`src/config/bkp_env copy.ts`** (BACKUP CONFIG)
- Same updates as above
- This appears to be a backup file

### **2. Files with Hardcoded URLs** ⚠️

#### **`src/screens/AuthScreens.tsx`** (Line 32)
```typescript
// OLD:
const response = await fetch(`https://bkfonnecvqlppivnrgxe.supabase.co/rest/v1/user_profiles?username=ilike.${username}`, {

// NEW:
const response = await fetch(`https://whispr-mobile-app-production.supabase.co/rest/v1/user_profiles?username=ilike.${username}`, {
```

### **3. Files That Import Configuration** ✅

These files automatically use the updated config (no changes needed):
- `src/config/supabase.ts` ✅ (imports from env.ts)
- `src/services/authService.ts` ✅
- `src/services/buddiesService.ts` ✅
- `src/services/httpDatabase.ts` ✅
- `src/services/flexibleDatabase.ts` ✅
- `src/services/realtimeService.ts` ✅
- `src/store/AuthContext.tsx` ✅
- `src/navigation/AppNavigator.tsx` ✅

## 🚀 Step-by-Step Update Process

### **Step 1: Get New Supabase Credentials**
1. Go to your **new Supabase project**: `whispr-mobile-app-production.supabase.co`
2. Navigate to **Settings > API**
3. Copy:
   - **Project URL**
   - **anon public key**
   - **service_role secret key** (optional)

### **Step 2: Update Configuration Files**

#### **Update `src/config/env.ts`:**
```typescript
export const SUPABASE_CONFIG = {
  url: 'https://whispr-mobile-app-production.supabase.co',
  anonKey: 'YOUR_NEW_ANON_KEY',
  serviceRoleKey: 'YOUR_NEW_SERVICE_ROLE_KEY',
};
```

#### **Update `src/screens/AuthScreens.tsx` (Line 32):**
```typescript
const response = await fetch(`https://whispr-mobile-app-production.supabase.co/rest/v1/user_profiles?username=ilike.${username}`, {
```

### **Step 3: Test Configuration**
1. **Build and run** your app
2. **Test authentication** (login/signup)
3. **Test database operations** (create buddy, send message)
4. **Check console** for any connection errors

## ⚠️ Important Notes

### **Database Schema Differences**
Your current `src/config/supabase.ts` defines these tables:
- `user_profiles` ✅ (matches your migration)
- `messages` ❌ (you have `buddy_messages`)
- `chats` ❌ (you have `buddies`)
- `moods` ❌ (not in your schema)
- `connections` ❌ (not in your schema)

### **Recommended Actions**
1. **Update table names** in `src/config/supabase.ts` to match your actual schema
2. **Update TypeScript interfaces** to match your actual database structure
3. **Test all database operations** after migration

## 🔍 Verification Checklist

- [ ] `src/config/env.ts` updated with new URL and keys
- [ ] `src/screens/AuthScreens.tsx` hardcoded URL updated
- [ ] App builds without errors
- [ ] Authentication works
- [ ] Database operations work
- [ ] No console errors related to Supabase connection

## 📞 Next Steps After Config Update

1. **Complete remaining database imports**
2. **Test all app functionality**
3. **Update any remaining hardcoded URLs**
4. **Deploy to production**


