# 🚀 Telegram-Style Chat Migration Guide

## **Step 1: Execute Database Schema in Supabase**

### **Option A: Using Supabase Dashboard (Recommended)**

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Copy the entire content** of `telegram_style_database_schema.sql`
3. **Paste and execute** the SQL script
4. **Verify tables created**:
   - `chats` table
   - `messages` table
   - Functions: `get_chat_id`, `get_or_create_chat`, `update_chat_last_message`
   - Publications: `telegram_style_messages`, `telegram_style_chats`

### **Option B: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db reset
# Then run the schema file
psql -h your-db-host -U postgres -d postgres -f telegram_style_database_schema.sql
```

## **Step 2: Verify Schema Creation**

Run this verification query in Supabase SQL Editor:

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages');

-- Verify functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_chat_id', 'get_or_create_chat', 'update_chat_last_message');

-- Verify publications exist
SELECT pubname FROM pg_publication 
WHERE pubname IN ('telegram_style_messages', 'telegram_style_chats');
```

## **Step 3: Test Basic Functionality**

```sql
-- Test chat creation
SELECT get_or_create_chat('927d751d-0c10-4387-a837-10f5ad133daa', 'e21a2900-ed89-4dac-a830-18e8e83ee899');

-- Test message insertion
INSERT INTO messages (chat_id, sender_id, content) 
VALUES ('927d751d-0c10-4387-a837-10f5ad133daa-e21a2900-ed89-4dac-a830-18e8e83ee899', '927d751d-0c10-4387-a837-10f5ad133daa', 'Test message');

-- Verify message appears
SELECT * FROM messages WHERE chat_id = '927d751d-0c10-4387-a837-10f5ad133daa-e21a2900-ed89-4dac-a830-18e8e83ee899';
```

## **Step 4: Update App Configuration**

After successful schema creation, we'll update the app to use the new system.

---

## **⚠️ Important Notes:**

1. **Backup First**: Make sure to backup your existing data before migration
2. **Test Environment**: Run this in a test environment first if possible
3. **Gradual Migration**: We'll migrate components one by one to avoid breaking changes
4. **Real-time**: The new system uses simpler real-time subscriptions

## **🎯 Expected Benefits After Migration:**

- ✅ **Faster message loading** (simpler queries)
- ✅ **No duplicate messages** (consistent chat IDs)
- ✅ **Reliable real-time updates** (simpler subscriptions)
- ✅ **Easier debugging** (straightforward architecture)
- ✅ **Better performance** (optimized indexes)

---

**Ready to proceed?** Let me know when you've successfully executed the database schema, and we'll move to Step 2: Updating the ChatScreen component!
