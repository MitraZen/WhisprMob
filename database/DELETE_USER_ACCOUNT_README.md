# Delete User Account - SQL Scripts

This directory contains SQL scripts for completely deleting a user account and all associated data from the Whispr application.

## 📋 Available Scripts

### 1. `delete_user_account_simple.sql` ⭐ **RECOMMENDED**

**Best for:** Quick deletion by email address  
**Use when:** You know the user's email and want a simple, straightforward deletion

**Features:**
- ✅ Simple to use - just replace the email address
- ✅ Works directly in Supabase SQL Editor
- ✅ Provides detailed deletion logs
- ✅ Handles optional tables gracefully
- ✅ Includes verification

**Usage:**
1. Open `delete_user_account_simple.sql`
2. Replace `'user@example.com'` on line 8 with the actual email
3. Run in Supabase SQL Editor
4. Check the output messages for deletion status

---

### 2. `delete_user_account.sql`

**Best for:** Comprehensive deletion with detailed verification  
**Use when:** You need detailed pre/post deletion checks and want maximum control

**Features:**
- ✅ Pre-deletion verification (shows what will be deleted)
- ✅ Post-deletion verification
- ✅ Supports deletion by email OR user ID
- ✅ Transaction-based (all-or-nothing)
- ✅ Detailed logging at each step

**Usage:**
1. Open `delete_user_account.sql`
2. Choose Option A (by email) or Option B (by user ID)
3. Replace `'USER_EMAIL_HERE'` or `'USER_ID_HERE'` with actual values
4. Run in Supabase SQL Editor
5. Review the verification output

---

### 3. `delete_user_account_by_email.sql`

**Best for:** psql command line usage  
**Use when:** Running from command line with psql

**Features:**
- ✅ Uses psql variables
- ✅ Clean output format
- ✅ Quick execution

**Usage:**
```bash
psql -d your_database -f delete_user_account_by_email.sql -v email="user@example.com"
```

---

## 🗄️ What Gets Deleted

The scripts delete user data from these tables (in order):

1. **password_reset_codes** - Password reset codes
2. **user_achievements** - User achievements (if exists)
3. **user_interests** - User interests (if exists)
4. **trust_markers** - Trust markers (if exists)
5. **buddy_messages** - Messages sent by the user
6. **buddies** - Buddy relationships (both directions)
7. **whispr_notes** - Whispr notes sent by the user
8. **blocked_users** - Blocked user relationships (both directions)
9. **user_fcm_tokens** - FCM push notification tokens
10. **user_preferences** - User preferences
11. **user_profiles** - User profile data
12. **auth.users** - Authentication user record (must be last)

## ⚠️ Important Notes

### Deletion Order
- Child tables are deleted **before** parent tables
- `auth.users` is deleted **last** (it's the parent of all other tables)
- This prevents foreign key constraint violations

### Optional Tables
- Some tables may not exist in your database (e.g., `user_achievements`, `trust_markers`)
- The scripts handle missing tables gracefully and continue deletion

### Case-Insensitive Email Matching
- All email comparisons are case-insensitive
- `test@example.com` and `TEST@EXAMPLE.COM` are treated as the same

### Irreversible Operation
- ⚠️ **WARNING:** This operation is **IRREVERSIBLE**
- All user data will be permanently deleted
- Make sure you have backups if needed

## 🔍 Verification

After running the deletion script, verify the user is completely removed:

```sql
-- Check auth.users
SELECT id, email, created_at
FROM auth.users
WHERE LOWER(email) = LOWER('user@example.com');

-- Check user_profiles
SELECT id, email, username
FROM public.user_profiles
WHERE LOWER(email) = LOWER('user@example.com');

-- Check for any remaining references
SELECT 'buddy_messages' as table_name, COUNT(*) as count
FROM public.buddy_messages
WHERE sender_id = 'USER_ID_HERE'::UUID
UNION ALL
SELECT 'buddies', COUNT(*)
FROM public.buddies
WHERE user_id = 'USER_ID_HERE'::UUID OR buddy_user_id = 'USER_ID_HERE'::UUID;
```

## 🐛 Troubleshooting

### Error: "User not found"
- **Cause:** Email address doesn't exist in database
- **Fix:** Verify the email address is correct
- **Check:** Run the verification queries to see if user exists

### Error: "Foreign key constraint violation"
- **Cause:** Deletion order issue or missing table
- **Fix:** Use the provided scripts which handle deletion order correctly
- **Note:** If you get this error, the transaction will rollback (no partial deletion)

### Error: "Permission denied"
- **Cause:** Insufficient database permissions
- **Fix:** Ensure you're using a user with DELETE permissions on all tables
- **Note:** In Supabase, use the SQL Editor which has admin permissions

### User Still Exists After Deletion
- **Check:** Run verification queries
- **Possible causes:**
  - Transaction was rolled back due to error
  - User exists with different email case
  - User ID mismatch between auth.users and user_profiles

## 📝 Example Usage

### Example 1: Delete by Email (Simple)

```sql
-- In delete_user_account_simple.sql, change line 8:
target_email TEXT := 'testusr34@gmail.com';

-- Then run the script
```

### Example 2: Delete by User ID

```sql
-- In delete_user_account.sql, use Option B:
target_user_id UUID := '123e4567-e89b-12d3-a456-426614174000'::UUID;
```

## 🔐 Security Considerations

1. **Access Control:** Only authorized administrators should run these scripts
2. **Audit Trail:** Consider logging deletions for compliance
3. **Backup:** Create database backups before bulk deletions
4. **Testing:** Test on a development database first

## 📚 Related Files

- `src/services/buddiesService.ts` - Contains `deleteUserAccount()` method (TypeScript implementation)
- Database schema documentation in `docs/database/`

## ✅ Checklist Before Deletion

- [ ] Verified the correct email/user ID
- [ ] Created database backup (if needed)
- [ ] Notified user (if required by policy)
- [ ] Checked for any legal/compliance requirements
- [ ] Tested on development database first
- [ ] Have verification queries ready

---

**Last Updated:** 2025-01-14  
**Version:** 1.0.0

