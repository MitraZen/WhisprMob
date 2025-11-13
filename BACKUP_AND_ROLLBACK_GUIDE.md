# 🔄 Backup & Rollback Guide
## Pre-Implementation Safety Plan

**⚠️ CRITICAL: Complete all backups BEFORE starting local database implementation**

---

## 📋 **Backup Checklist**

### **✅ Phase 1: Git Backup (MANDATORY)**

#### **1.1 Create Backup Branch**
```bash
# Ensure you're on main/master branch with all changes committed
git status  # Verify no uncommitted changes

# Create a backup branch from current state
git checkout -b backup/pre-local-database-implementation

# Push backup branch to remote
git push origin backup/pre-local-database-implementation

# Tag this version for easy reference
git tag -a v1.0.0-pre-local-db -m "Stable version before local database implementation"
git push origin v1.0.0-pre-local-db

# Return to main branch
git checkout main
```

**Why**: This creates a permanent snapshot you can always return to.

---

#### **1.2 Create Feature Branch for Implementation**
```bash
# Create feature branch for local database work
git checkout -b feature/local-database-implementation

# Push feature branch
git push origin feature/local-database-implementation
```

**Why**: All local database work happens in isolation, easy to abandon if needed.

---

### **✅ Phase 2: Code Backup (MANDATORY)**

#### **2.1 Full Project Backup**

**Option A: Git Archive (Recommended)**
```bash
# Create a complete archive of current codebase
git archive --format=zip --output=../whispr-backup-$(date +%Y%m%d-%H%M%S).zip HEAD

# This creates a zip file with all code (excluding node_modules)
# Store this in a safe location (external drive, cloud storage)
```

**Option B: Manual Copy**
```bash
# Copy entire project directory
# Windows PowerShell:
Copy-Item -Path "C:\Projects\Whispr_Mobile_App_Dev" -Destination "C:\Projects\Whispr_Mobile_App_Dev_BACKUP_$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Recurse

# Exclude node_modules to save space (can reinstall)
# Exclude build folders
```

**Files to Backup:**
- ✅ All source code (`src/`)
- ✅ Configuration files (`package.json`, `app.json`, etc.)
- ✅ Database schema files (`database/`, `*.sql`)
- ✅ Documentation (`docs/`, `*.md`)
- ✅ Environment files (`.env`, config files)
- ✅ Build scripts (`build-*.ps1`, `build-*.sh`)
- ⚠️ **Exclude**: `node_modules/` (can reinstall)
- ⚠️ **Exclude**: `build/`, `dist/` (can rebuild)
- ⚠️ **Exclude**: `.git/` (already in Git backup)

---

### **✅ Phase 3: Database Backup (CRITICAL)**

#### **3.1 Supabase Database Backup**

**Option A: Supabase Dashboard (Easiest)**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Click **Backup** or **Export**
4. Download full database backup
5. Store in safe location

**Option B: SQL Export (Manual)**
```sql
-- Run in Supabase SQL Editor
-- Export all critical tables

-- 1. Export user_profiles
COPY (SELECT * FROM user_profiles) TO STDOUT WITH CSV HEADER;
-- Save as: user_profiles_backup_YYYYMMDD.csv

-- 2. Export buddies
COPY (SELECT * FROM buddies) TO STDOUT WITH CSV HEADER;
-- Save as: buddies_backup_YYYYMMDD.csv

-- 3. Export buddy_messages
COPY (SELECT * FROM buddy_messages) TO STDOUT WITH CSV HEADER;
-- Save as: buddy_messages_backup_YYYYMMDD.csv

-- 4. Export whispr_notes
COPY (SELECT * FROM whispr_notes) TO STDOUT WITH CSV HEADER;
-- Save as: whispr_notes_backup_YYYYMMDD.csv

-- 5. Export blocked_users
COPY (SELECT * FROM blocked_users) TO STDOUT WITH CSV HEADER;
-- Save as: blocked_users_backup_YYYYMMDD.csv

-- 6. Export user_fcm_tokens
COPY (SELECT * FROM user_fcm_tokens) TO STDOUT WITH CSV HEADER;
-- Save as: user_fcm_tokens_backup_YYYYMMDD.csv

-- 7. Export user_preferences
COPY (SELECT * FROM user_preferences) TO STDOUT WITH CSV HEADER;
-- Save as: user_preferences_backup_YYYYMMDD.csv
```

**Option C: pg_dump (Advanced)**
```bash
# If you have direct database access
pg_dump -h your-supabase-host -U postgres -d postgres > supabase_backup_$(date +%Y%m%d).sql
```

**Store Location**: 
- External drive
- Cloud storage (Google Drive, Dropbox, OneDrive)
- Multiple locations (redundancy)

---

#### **3.2 Database Schema Backup**
```bash
# Export current database schema
# In Supabase SQL Editor, run:

-- Export all table definitions
SELECT 
    'CREATE TABLE ' || table_name || ' (' || 
    string_agg(column_name || ' ' || data_type, ', ') || 
    ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name;

-- Export all functions
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Export all triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Save all outputs to: database_schema_backup_YYYYMMDD.sql
```

---

### **✅ Phase 4: Configuration Backup**

#### **4.1 Environment Variables**
```bash
# Backup all environment files
# Windows PowerShell:
Copy-Item .env* ../backup/env-backup-$(Get-Date -Format 'yyyyMMdd')/

# Or manually copy:
# - .env
# - .env.local
# - .env.production
# - config/env.ts
```

#### **4.2 Build Configuration**
```bash
# Backup build scripts and configs
# - package.json
# - app.json
# - android/app/build.gradle
# - ios/Podfile
# - babel.config.js
# - metro.config.js
# - tsconfig.json
```

#### **4.3 Supabase Configuration**
```bash
# Backup Supabase config
# - src/config/supabase.ts
# - Supabase project URL and keys (store securely)
# - Any Supabase Edge Functions
```

---

### **✅ Phase 5: App Binary Backup**

#### **5.1 APK/IPA Files**
```bash
# If you have production builds, backup them:
# - android/app/build/outputs/apk/release/app-release.apk
# - ios/build/Build/Products/Release-iphoneos/Whispr.app

# Store in: ../backup/app-binaries-YYYYMMDD/
```

#### **5.2 Keystore Files (CRITICAL)**
```bash
# Android signing keys (NEVER lose these!)
# - android/app/my-release-key.keystore
# - keystore.properties

# Store in MULTIPLE secure locations:
# - Encrypted cloud storage
# - External encrypted drive
# - Password manager
```

---

## 🔄 **Rollback Strategy**

### **Scenario 1: Rollback Before Deployment**

**If issues found during development:**

```bash
# 1. Abandon feature branch
git checkout main
git branch -D feature/local-database-implementation
git push origin --delete feature/local-database-implementation

# 2. Continue from main branch
# All your original code is intact
```

**Time to rollback**: < 1 minute

---

### **Scenario 2: Rollback After Merge (Before Release)**

**If issues found after merging to main:**

```bash
# 1. Revert the merge commit
git checkout main
git revert -m 1 <merge-commit-hash>

# 2. Push reverted code
git push origin main

# 3. Tag the reverted version
git tag -a v1.0.1-rollback -m "Rollback from local database implementation"
git push origin v1.0.1-rollback
```

**Time to rollback**: < 5 minutes

---

### **Scenario 3: Rollback After Release (Using Feature Flag)**

**If issues found in production:**

```typescript
// 1. Disable feature flag immediately
// In config/migrationConfig.ts
export const USE_LOCAL_DATABASE = false; // Disable instantly

// 2. Deploy hotfix (CodePush or app update)
// App automatically falls back to Supabase-only mode

// 3. No database changes needed
// Local database remains intact, just unused
```

**Time to rollback**: < 5 minutes (with CodePush)

---

### **Scenario 4: Complete Rollback (Nuclear Option)**

**If everything fails and you need to restore completely:**

#### **Step 1: Restore Code**
```bash
# Option A: Checkout backup branch
git checkout backup/pre-local-database-implementation
git checkout -b main-restored
git push origin main-restored --force

# Option B: Restore from tag
git checkout v1.0.0-pre-local-db
git checkout -b main-restored
git push origin main-restored --force

# Option C: Restore from archive
# Extract the zip backup you created
# Replace entire project directory
```

#### **Step 2: Restore Database (If Needed)**
```sql
-- In Supabase SQL Editor
-- Only if database schema was changed

-- 1. Drop new tables (if any were added)
DROP TABLE IF EXISTS local_sync_metadata CASCADE;
-- (Add any other new tables)

-- 2. Restore from backup CSV files
-- Use Supabase import feature or:
COPY user_profiles FROM '/path/to/user_profiles_backup.csv' WITH CSV HEADER;
COPY buddies FROM '/path/to/buddies_backup.csv' WITH CSV HEADER;
-- (Repeat for all tables)

-- 3. Restore functions/triggers
-- Run the schema backup SQL file
```

#### **Step 3: Restore Dependencies**
```bash
# Reinstall dependencies from backup package.json
npm install

# iOS
cd ios && pod install && cd ..
```

#### **Step 4: Rebuild App**
```bash
# Clean build
npm run clean  # If you have clean script
rm -rf node_modules
npm install

# Rebuild
npm run android  # or npm run ios
```

**Time to rollback**: 30-60 minutes

---

## 🛡️ **Safety Measures During Implementation**

### **1. Feature Flags (MANDATORY)**

**Create feature flag system:**

```typescript
// src/config/migrationConfig.ts
export const FEATURE_FLAGS = {
  USE_LOCAL_DATABASE: false,  // Start with FALSE
  ENABLE_LOCAL_DB_SYNC: false,
  SHOW_SYNC_STATUS: false,
} as const;

// In your services:
if (FEATURE_FLAGS.USE_LOCAL_DATABASE) {
  // Use local database
  return await messageRepository.getMessages(buddyId);
} else {
  // Use Supabase (original code)
  return await supabase.from('buddy_messages').select('*');
}
```

**Benefits**:
- ✅ Can disable instantly without code changes
- ✅ Gradual rollout (10% → 50% → 100%)
- ✅ A/B testing capability
- ✅ Zero-downtime rollback

---

### **2. Database Migration Safety**

**Never modify existing tables directly:**

```sql
-- ❌ BAD: Modifying existing table
ALTER TABLE buddy_messages ADD COLUMN sync_status TEXT;

-- ✅ GOOD: Create new table, migrate data
CREATE TABLE buddy_messages_v2 (...);
-- Migrate data
-- Switch over
-- Drop old table only after validation
```

**Why**: Can rollback by simply not using new table.

---

### **3. Parallel Implementation**

**Keep old code working alongside new:**

```typescript
// Old service (keep intact)
class UnifiedChatService {
  static async getMessages() {
    // Original Supabase code - NEVER DELETE
    return await supabase.from('buddy_messages')...
  }
}

// New service (add alongside)
class LocalDatabaseChatService {
  static async getMessages() {
    // New local database code
    return await messageRepository.getMessages()...
  }
}

// Router (switch between them)
const ChatService = FEATURE_FLAGS.USE_LOCAL_DATABASE 
  ? LocalDatabaseChatService 
  : UnifiedChatService;
```

**Why**: Can switch back instantly by changing flag.

---

### **4. Incremental Rollout**

**Week 1: Internal Testing**
- Feature flag: `USE_LOCAL_DATABASE = false`
- Test in development only
- No users affected

**Week 2: Beta Users (10%)**
- Feature flag: `USE_LOCAL_DATABASE = true` (for 10% of users)
- Monitor closely
- Can disable instantly if issues

**Week 3: Gradual Increase (50%)**
- Increase to 50% of users
- Continue monitoring

**Week 4: Full Rollout (100%)**
- All users on local database
- Still can rollback via feature flag

---

## 📊 **Backup Verification**

### **Verify All Backups Work**

#### **1. Test Git Backup**
```bash
# Create test branch from backup
git checkout backup/pre-local-database-implementation
git checkout -b test-restore

# Verify code is correct
# Run tests
npm test

# If all good, delete test branch
git checkout main
git branch -D test-restore
```

#### **2. Test Database Backup**
```sql
-- Create test database
CREATE DATABASE test_restore;

-- Import backup
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify row counts match
SELECT COUNT(*) FROM user_profiles;
SELECT COUNT(*) FROM buddies;
SELECT COUNT(*) FROM buddy_messages;
-- (Compare with original)
```

#### **3. Test Code Archive**
```bash
# Extract archive to test location
unzip whispr-backup-YYYYMMDD.zip -d ../test-restore

# Verify structure
cd ../test-restore
ls -la src/
ls -la package.json

# Try to install (if node_modules excluded)
npm install

# Verify builds
npm run android  # or npm run ios
```

---

## 📝 **Pre-Implementation Checklist**

**Complete ALL of these BEFORE starting:**

### **Git Backup**
- [ ] All current changes committed
- [ ] Backup branch created: `backup/pre-local-database-implementation`
- [ ] Backup branch pushed to remote
- [ ] Version tagged: `v1.0.0-pre-local-db`
- [ ] Feature branch created: `feature/local-database-implementation`

### **Code Backup**
- [ ] Full project archive created (zip file)
- [ ] Archive stored in external location
- [ ] Archive verified (can extract and view files)
- [ ] All source code backed up

### **Database Backup**
- [ ] Supabase database exported (CSV or SQL)
- [ ] Database schema exported
- [ ] All tables backed up (verify row counts)
- [ ] Backup files stored in multiple locations
- [ ] Backup verified (can import and verify)

### **Configuration Backup**
- [ ] Environment files backed up
- [ ] Build configuration backed up
- [ ] Supabase config backed up
- [ ] Keystore files backed up (Android)

### **App Binary Backup**
- [ ] Current production APK/IPA backed up (if exists)
- [ ] Keystore files backed up in multiple secure locations

### **Feature Flags**
- [ ] Feature flag system implemented
- [ ] `USE_LOCAL_DATABASE` flag set to `false`
- [ ] Rollback mechanism tested

### **Testing**
- [ ] Current app tested and working
- [ ] All tests passing
- [ ] Production build verified

---

## 🚨 **Emergency Rollback Procedure**

**If critical issues occur in production:**

### **Immediate Actions (< 5 minutes)**

1. **Disable Feature Flag**
   ```typescript
   // In config/migrationConfig.ts
   export const USE_LOCAL_DATABASE = false;
   ```

2. **Deploy Hotfix**
   ```bash
   # If using CodePush
   code-push release-react ...
   
   # Or build and deploy new version
   npm run build:production
   ```

3. **Monitor**
   - Check crash reports
   - Monitor user feedback
   - Verify app stability

### **If Hotfix Doesn't Work (< 30 minutes)**

1. **Restore from Backup Branch**
   ```bash
   git checkout backup/pre-local-database-implementation
   git checkout -b hotfix/emergency-rollback
   # Build and deploy
   ```

2. **Notify Team**
   - Alert developers
   - Document issue
   - Create post-mortem

---

## 💾 **Backup Storage Locations**

**Store backups in MULTIPLE locations:**

1. **Primary**: External hard drive / USB
2. **Secondary**: Cloud storage (Google Drive, Dropbox, OneDrive)
3. **Tertiary**: Git remote (GitHub, GitLab, Bitbucket)
4. **Critical Files**: Password manager (keystores, API keys)

**Why Multiple Locations**: 
- Hardware can fail
- Cloud accounts can be compromised
- Redundancy = Safety

---

## 📅 **Backup Schedule**

### **Before Implementation**
- ✅ Full backup (all items above)

### **During Implementation**
- ✅ Daily commits to feature branch
- ✅ Weekly database exports (if schema changes)

### **After Implementation**
- ✅ Final backup before production release
- ✅ Post-release backup (working version)

---

## ✅ **Final Verification**

**Before starting implementation, verify:**

1. ✅ Can restore code from backup branch
2. ✅ Can restore database from backup files
3. ✅ Can build app from backup
4. ✅ Feature flags work correctly
5. ✅ Rollback procedure documented
6. ✅ Team knows rollback procedure
7. ✅ Backup locations accessible

---

## 🎯 **Success Criteria**

**You're ready to proceed when:**

- ✅ All backups completed and verified
- ✅ Feature flag system in place
- ✅ Rollback procedure tested
- ✅ Team trained on rollback
- ✅ Monitoring in place
- ✅ Emergency contacts documented

---

**Last Updated**: 2025-01-XX  
**Status**: Pre-Implementation Safety Guide  
**Next Step**: Complete backup checklist, then proceed with implementation


