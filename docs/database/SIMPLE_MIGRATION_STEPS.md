# 🚀 Simple Migration Steps

## **Step 1: Export Data from Current Project**

1. **Go to**: `bkfonnecvqlppivnrgxe.supabase.co`
2. **Open SQL Editor**
3. **Run each query from `export-remaining-tables.sql`**:

```sql
-- Query 1: Export buddies
SELECT 
    'buddies' as table_name,
    json_agg(row_to_json(t)) as data
FROM (
    SELECT * FROM buddies ORDER BY created_at
) t;

-- Query 2: Export buddy_messages
SELECT 
    'buddy_messages' as table_name,
    json_agg(row_to_json(t)) as data
FROM (
    SELECT * FROM buddy_messages ORDER BY created_at
) t;

-- Query 3: Export whispr_notes
SELECT 
    'whispr_notes' as table_name,
    json_agg(row_to_json(t)) as data
FROM (
    SELECT * FROM whispr_notes ORDER BY created_at
) t;

-- Query 4: Export blocked_users
SELECT 
    'blocked_users' as table_name,
    json_agg(row_to_json(t)) as data
FROM (
    SELECT * FROM blocked_users ORDER BY created_at
) t;

-- Query 5: Export user_fcm_tokens
SELECT 
    'user_fcm_tokens' as table_name,
    json_agg(row_to_json(t)) as data
FROM (
    SELECT * FROM user_fcm_tokens ORDER BY created_at
) t;
```

4. **Copy the JSON output** for each table
5. **Share the JSON data** with me

## **Step 2: Setup New Project Schema**

1. **Go to**: `whispr-mobile-app-production.supabase.co`
2. **Open SQL Editor**
3. **Run the complete schema** from `SUPABASE_MIGRATION_GUIDE.md`
4. **Run `essential-database-indexes.sql`**

## **Step 3: Import Data (In Order)**

1. **Import user_profiles**: Run `import-user-profiles-data-fixed.sql`
2. **Import buddies**: Run `import-buddies-data-json.sql` (after you provide JSON)
3. **Import buddy_messages**: Run `import-buddy-messages-data.sql` (after you provide JSON)
4. **Import whispr_notes**: Run `import-whispr-notes-data.sql` (after you provide JSON)
5. **Import blocked_users**: Run `import-blocked-users-data.sql` (after you provide JSON)
6. **Import user_fcm_tokens**: Run `import-user-fcm-tokens-data.sql` (after you provide JSON)
7. **Import user_preferences**: Run `import-user-preferences-data.sql`

## **Step 4: Update App Configuration**

1. **Update `src/config/env.ts`** with new project credentials
2. **Test app functionality**
3. **Verify all data accessible**

## **Step 5: Final Verification**

Run this query to check all tables have data:

```sql
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

---

**Ready to start?** Run the export queries and share the JSON data!