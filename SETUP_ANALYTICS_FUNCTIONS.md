# Setup Analytics Functions in Supabase

## ⚠️ **Error Fix Required**

The error `Could not find the function public.get_admin_analytics` means the SQL functions haven't been created in your Supabase database yet.

---

## 🚀 **Quick Setup Steps**

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase project dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### **Step 2: Run the SQL Functions**

1. Open the file: `database/admin-analytics-functions.sql`
2. **Copy the entire contents** of the file
3. **Paste it into the Supabase SQL Editor**
4. Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### **Step 3: Verify Functions Created**

Run this verification query in Supabase SQL Editor:

```sql
-- Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_total_users',
    'get_users_added_this_week',
    'get_top_trending_users',
    'get_admin_analytics'
  )
ORDER BY routine_name;
```

You should see all 4 functions listed.

### **Step 4: Grant Permissions (Important!)**

After creating the functions, run this to grant execute permissions:

```sql
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_total_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_added_this_week() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_trending_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;
```

### **Step 5: Test the Functions**

Test each function to make sure they work:

```sql
-- Test 1: Total Users
SELECT get_total_users();

-- Test 2: Users This Week
SELECT get_users_added_this_week();

-- Test 3: Trending Users
SELECT get_top_trending_users(10, 7);

-- Test 4: Complete Analytics
SELECT get_admin_analytics();
```

---

## 🔧 **Alternative: Run Functions Individually**

If you get errors running the full file, try running each function separately:

### **Function 1: Get Total Users**

```sql
CREATE OR REPLACE FUNCTION get_total_users()
RETURNS JSONB AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_inactive_users INTEGER;
  v_result JSONB;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM user_profiles;
  
  SELECT COUNT(*) INTO v_active_users
  FROM user_profiles
  WHERE last_seen > NOW() - INTERVAL '7 days'
     OR (last_seen IS NULL AND created_at > NOW() - INTERVAL '7 days');
  
  v_inactive_users := v_total_users - v_active_users;
  
  v_result := jsonb_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'inactive_users', v_inactive_users,
    'active_percentage', ROUND((v_active_users::NUMERIC / NULLIF(v_total_users, 0)) * 100, 2)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

Then continue with the other functions from the SQL file.

---

## ✅ **After Setup**

Once the functions are created:

1. **Restart your React Native app** (or reload)
2. **Navigate to Settings Hub** (as admin user)
3. **Open Analytics Dashboard**
4. **All metrics should load correctly**

---

## 🐛 **Troubleshooting**

### **Error: "permission denied for function"**

**Solution**: Run the GRANT statements from Step 4 above.

### **Error: "relation does not exist"**

**Solution**: Make sure your table names are correct:
- `user_profiles` (not `users` or `profiles`)
- `whispr_notes` (not `notes`)
- `whisprs` (not `whisper` or `whispers`)
- `buddy_messages` (not `messages`)
- `buddies` (not `buddy`)

### **Error: "column does not exist"**

**Solution**: Check if these columns exist in your tables:
- `user_profiles.last_seen`
- `user_profiles.created_at`
- `user_profiles.is_admin`

If columns don't exist, you may need to add them or modify the SQL functions.

---

## 📝 **Quick Copy-Paste SQL**

Here's the complete SQL with permissions included:

```sql
-- [Paste entire contents of database/admin-analytics-functions.sql here]

-- Then run these permissions:
GRANT EXECUTE ON FUNCTION get_total_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_added_this_week() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_trending_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics() TO authenticated;
```

---

## ✨ **Success Indicators**

You'll know it's working when:
- ✅ All 4 functions appear in the verification query
- ✅ Test queries return JSON data (not errors)
- ✅ Analytics Dashboard loads without errors
- ✅ All metrics display correctly in the app

---

**Once you've run the SQL functions in Supabase, the Analytics Dashboard will work perfectly!** 🎉



