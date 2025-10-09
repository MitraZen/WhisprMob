# 🚀 Complete Supabase Migration Plan

## 📋 **Current Status**

### **✅ Ready to Use**
- **Current Project**: `bkfonnecvqlppivnrgxe.supabase.co` (with all data)
- **New Project**: `whispr-mobile-app-production.supabase.co` (empty, ready for migration)
- **Import Scripts Ready**: `user_profiles` (40 records), `user_preferences` (40 records)

### **🔄 Need Data Export**
- **buddies** - Buddy relationships
- **buddy_messages** - Chat messages  
- **whispr_notes** - Public notes
- **blocked_users** - Blocked users
- **user_fcm_tokens** - FCM tokens

## 🎯 **Step-by-Step Migration Process**

### **Phase 1: Export Data from Current Project**

1. **Go to your current Supabase project**: `bkfonnecvqlppivnrgxe.supabase.co`
2. **Open SQL Editor**
3. **Run `export-remaining-tables.sql`** (one query at a time)
4. **Save the JSON output** for each table
5. **Share the JSON data** with me to create ready-to-use import scripts

### **Phase 2: Setup New Project Schema**

1. **Go to your new Supabase project**: `whispr-mobile-app-production.supabase.co`
2. **Open SQL Editor**
3. **Run the complete schema** from `SUPABASE_MIGRATION_GUIDE.md` (Step 2)
4. **Run `essential-database-indexes.sql`** for performance
5. **Verify all 7 tables created**:
   - `user_profiles`
   - `buddies`
   - `buddy_messages`
   - `whispr_notes`
   - `blocked_users`
   - `user_fcm_tokens`
   - `user_preferences`

### **Phase 3: Import Data (In Correct Order)**

**⚠️ IMPORTANT: Import order matters due to foreign key constraints!**

1. **Import user_profiles** ✅ (Ready - 40 records)
   ```sql
   -- Run: import-user-profiles-data-fixed.sql
   ```

2. **Import buddies** (depends on user_profiles)
   ```sql
   -- Run: import-buddies-data-json.sql (after you provide JSON data)
   ```

3. **Import buddy_messages** (depends on buddies)
   ```sql
   -- Run: import-buddy-messages-data.sql (after you provide JSON data)
   ```

4. **Import whispr_notes** (depends on user_profiles)
   ```sql
   -- Run: import-whispr-notes-data.sql (after you provide JSON data)
   ```

5. **Import blocked_users** (depends on user_profiles)
   ```sql
   -- Run: import-blocked-users-data.sql (after you provide JSON data)
   ```

6. **Import user_fcm_tokens** (depends on user_profiles)
   ```sql
   -- Run: import-user-fcm-tokens-data.sql (after you provide JSON data)
   ```

7. **Import user_preferences** ✅ (Ready - 40 records)
   ```sql
   -- Run: import-user-preferences-data.sql
   ```

### **Phase 4: Update App Configuration**

1. **Update `src/config/env.ts`** with new project credentials:
   ```typescript
   export const SUPABASE_CONFIG = {
     url: 'https://whispr-mobile-app-production.supabase.co',
     anonKey: 'your-new-anon-key',
     serviceRoleKey: 'your-new-service-role-key',
   };
   ```

2. **Test app functionality**
3. **Verify all data accessible**
4. **Test all features**:
   - User registration/login
   - Buddy creation
   - Messaging
   - Note sharing
   - User blocking

### **Phase 5: Final Verification**

1. **Run verification queries**:
   ```sql
   -- Check all tables have data
   SELECT 'user_profiles' as table_name, COUNT(*) as count FROM user_profiles
   UNION ALL
   SELECT 'buddies', COUNT(*) FROM buddies
   UNION ALL
   SELECT 'buddy_messages', COUNT(*) FROM buddy_messages
   UNION ALL
   SELECT 'whispr_notes', COUNT(*) FROM whispr_notes
   UNION ALL
   SELECT 'blocked_users', COUNT(*) FROM blocked_users
   UNION ALL
   SELECT 'user_fcm_tokens', COUNT(*) FROM user_fcm_tokens
   UNION ALL
   SELECT 'user_preferences', COUNT(*) FROM user_preferences;
   ```

2. **Test app with new project**
3. **Verify all features work**
4. **Keep old project** until migration confirmed successful

## 📊 **Expected Data Summary**

Based on your current project:
- **40 user profiles** ✅
- **40 user preferences** ✅
- **X buddies** (to be exported)
- **X buddy_messages** (to be exported)
- **X whispr_notes** (to be exported)
- **X blocked_users** (to be exported)
- **X user_fcm_tokens** (to be exported)

## 🚀 **Next Steps**

### **Immediate Action Required:**
1. **Run `export-remaining-tables.sql`** in your current project
2. **Share the JSON output** for each table
3. **I'll create ready-to-use import scripts** for all tables

### **Files Ready for You:**
- ✅ **`export-remaining-tables.sql`** - Export queries
- ✅ **`import-user-profiles-data-fixed.sql`** - Ready to use
- ✅ **`import-user-preferences-data.sql`** - Ready to use
- ✅ **`import-buddies-data-json.sql`** - Template ready
- ✅ **`import-buddy-messages-data.sql`** - Template ready
- ✅ **`import-whispr-notes-data.sql`** - Template ready
- ✅ **`import-blocked-users-data.sql`** - Template ready
- ✅ **`import-user-fcm-tokens-data.sql`** - Template ready

## ⚠️ **Important Notes**

- **Import order matters** - dependencies must be respected
- **Backup everything** before starting migration
- **Test thoroughly** before switching production
- **Keep old project** until migration confirmed successful
- **Foreign key constraints** are handled in the import scripts

## 🆘 **If Issues Occur**

1. **Revert app configuration** to old project
2. **Fix issues** in new project
3. **Retry migration** process
4. **Contact support** if needed

## 📞 **Support**

If you encounter any issues during migration:
1. **Check the error messages** carefully
2. **Verify import order** is correct
3. **Check foreign key constraints**
4. **Share error details** for assistance

---

**Ready to proceed?** Run the export queries and share the JSON data!


