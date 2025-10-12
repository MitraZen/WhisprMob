# Orphaned Accounts Analysis & Cleanup Guide

## 🎯 **Purpose**

This guide helps you identify and clean up accounts that don't have proper authentication records in your Whispr mobile app database.

## 📊 **Database Structure**

Your app uses a two-table authentication system:

1. **`auth.users`** - Supabase's built-in authentication table
2. **`user_profiles`** - Your custom table with foreign key reference to `auth.users(id)`

## 🔍 **What Are Orphaned Accounts?**

### **Type 1: Orphaned User Profiles**
- Records in `user_profiles` that reference non-existent `auth.users`
- These users can't authenticate but have profile data

### **Type 2: Orphaned Auth Users**
- Records in `auth.users` that don't have corresponding `user_profiles`
- These users can authenticate but have no profile data

## 📋 **Step-by-Step Process**

### **Step 1: Identify Orphaned Accounts**
Run `identify-orphaned-accounts.sql` in your Supabase SQL Editor:

```sql
-- This will show you:
-- 1. User profiles without auth records
-- 2. Auth users without profiles
-- 3. Duplicate usernames/anonymous_ids
-- 4. Inactive accounts (>30 days)
-- 5. Summary statistics
-- 6. Detailed orphaned records for review
```

### **Step 2: Review Results**
The script will show you:
- **How many orphaned records exist**
- **Details of each orphaned account**
- **Summary statistics**
- **Inactive accounts that could be cleaned up**

### **Step 3: Create Backups (Recommended)**
Before deleting anything, create backup tables:

```sql
-- Uncomment these lines in cleanup-orphaned-accounts.sql
CREATE TABLE backup_orphaned_user_profiles AS 
SELECT up.*, 'orphaned_profile' as backup_reason
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;
```

### **Step 4: Clean Up (Choose Your Approach)**

#### **Option A: Delete Orphaned User Profiles**
```sql
-- Removes user profiles without auth records
DELETE FROM public.user_profiles 
WHERE id IN (
    SELECT up.id
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    WHERE au.id IS NULL
);
```

#### **Option B: Delete Orphaned Auth Users**
```sql
-- Removes auth records without profiles
DELETE FROM auth.users 
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
);
```

#### **Option C: Delete Inactive Accounts**
```sql
-- Removes accounts inactive for 30+ days
DELETE FROM public.user_profiles 
WHERE last_seen < NOW() - INTERVAL '30 days';
```

## ⚠️ **Important Warnings**

1. **Always backup first** - Uncomment backup queries in cleanup script
2. **Test on development database** - Never run on production first
3. **Review results carefully** - Make sure you understand what will be deleted
4. **Run in small batches** - Use LIMIT clause for large datasets
5. **Cascade cleanup** - Clean up related data (buddies, messages, etc.)

## 🔄 **Related Data Cleanup**

After deleting users, you should also clean up related data:

- **Buddy relationships** - Remove relationships with deleted users
- **Messages** - Remove messages from deleted users
- **Notes** - Remove notes from deleted users
- **Blocked users** - Remove blocking relationships
- **FCM tokens** - Remove device tokens
- **User preferences** - Remove preference records

## 📈 **Expected Results**

After cleanup, you should have:
- **Consistent data** - All user_profiles have corresponding auth.users
- **No orphaned records** - All auth.users have corresponding user_profiles
- **Cleaner database** - Removed inactive/invalid accounts
- **Better performance** - Fewer records to process

## 🚀 **Next Steps**

1. **Run identification script** - See what needs cleanup
2. **Review results** - Understand the scope of cleanup needed
3. **Create backups** - Protect your data
4. **Choose cleanup strategy** - Decide what to delete
5. **Execute cleanup** - Run the cleanup script
6. **Verify results** - Confirm cleanup was successful

## 📞 **Need Help?**

If you need assistance with:
- Understanding the results
- Choosing cleanup strategy
- Handling specific edge cases
- Verifying cleanup results

Just share the results from the identification script and I can help you decide the best approach!









