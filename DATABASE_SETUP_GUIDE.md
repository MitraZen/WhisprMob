# Database Setup Guide for Whispr Mobile App

## 🚨 CRITICAL: You Must Run These SQL Scripts in Supabase

The message loading issue is because the database tables and functions haven't been set up yet. Follow these steps:

### Step 1: Create the Database Schema
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `whispr-buddy-schema.sql`
4. Click **Run** to execute the script

### Step 2: Update the Database Functions
1. In the same SQL Editor
2. Copy and paste the entire contents of `update-auth-functions.sql`
3. Click **Run** to execute the script

### Step 3: Verify the Setup
1. Copy and paste the contents of `test-database-functions.sql`
2. Click **Run** to verify everything is working

## 🔍 Debugging Steps

### In the Mobile App:
1. **Open the chat screen**
2. **Tap the 🐛 debug button** in the chat header
3. **Check the console logs** for detailed database information

### What to Look For:
- ✅ **Supabase connection**: Should show "SUCCESS"
- ✅ **Buddies table**: Should show existing buddies or empty array
- ✅ **Messages table**: Should show existing messages or empty array
- ✅ **Notes table**: Should show existing notes or empty array

## 🚨 Common Issues

### Issue 1: "Table doesn't exist"
**Solution**: Run `whispr-buddy-schema.sql` first

### Issue 2: "Function doesn't exist"
**Solution**: Run `update-auth-functions.sql` after the schema

### Issue 3: "User must be authenticated"
**Solution**: The functions are updated but you need to run `update-auth-functions.sql`

### Issue 4: "Permission denied"
**Solution**: Check your Supabase RLS policies in the SQL scripts

## 📱 Testing the Fix

After running the SQL scripts:

1. **Send a message** in the chat
2. **Check the logs** for detailed debugging info
3. **Messages should now load** properly

## 🔧 If Still Not Working

Run the debug test (🐛 button) and share the console output. The logs will show exactly what's wrong:

- Database connection status
- Table access results
- Function availability
- Data retrieval results

## 📋 Files You Need to Run in Supabase

1. `whispr-buddy-schema.sql` - Creates tables and basic functions
2. `update-auth-functions.sql` - Updates functions for mobile app
3. `test-database-functions.sql` - Verifies everything works

**Run them in this exact order!**


