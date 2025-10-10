# 🔍 Debug Chat Function - Message Delivery Troubleshooting

## 🚨 **Debug Logging Enabled**

I've added comprehensive debug logging to track message delivery issues:

### **1. Frontend Debug Logging**
- ✅ **BuddiesService.sendMessage()** - Detailed request/response logging
- ✅ **BuddiesService.getMessages()** - Message retrieval tracking  
- ✅ **ChatScreen.handleSendMessage()** - UI-side message flow
- ✅ **Performance timing** - RPC call duration tracking

### **2. Database Debug Function**
- ✅ **Enhanced send_buddy_message** - Server-side logging with RAISE NOTICE
- ✅ **Step-by-step tracking** - Every operation logged
- ✅ **Error context** - Detailed error information
- ✅ **Debug info in response** - Additional debugging data

## 🔧 **How to Enable Debug Mode**

### **Step 1: Apply Database Debug Function**
Run this SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of debug-send-message-function.sql
```

### **Step 2: Check Console Logs**
The frontend will now show detailed logs with emojis:
- 🔍 **Debug markers** for easy identification
- 📤 **Request details** before sending
- 📥 **Response details** after receiving
- ⏱️ **Timing information** for performance
- ❌ **Error details** with context

### **Step 3: Check Database Logs**
In Supabase Dashboard → Logs, look for:
- `DEBUG: send_buddy_message START`
- `DEBUG: Input parameters`
- `DEBUG: Message inserted with ID`
- `DEBUG: Function completed successfully`

## 📊 **Debug Information You'll See**

### **Frontend Console Logs:**
```
=== 🔍 DEBUG: MESSAGE SENDING START ===
📤 Send Message Request: {buddyId: "...", content: "Hello...", userId: "..."}
🔍 DEBUG: Calling RPC function send_buddy_message...
⏱️ DEBUG: RPC call completed in 245ms
📥 DEBUG: RPC Response: {"success": true, "message_id": "..."}
✅ DEBUG: Message sent successfully!
```

### **Database Logs:**
```
DEBUG: send_buddy_message START
DEBUG: Input parameters - buddy_id: abc123, content_length: 5, user_id: def456
DEBUG: Using user_id: def456
DEBUG: Buddy lookup - buddy_id: abc123, target_user_id: ghi789
DEBUG: Message inserted with ID: jkl012
DEBUG: Function completed successfully
```

## 🔍 **Common Issues to Look For**

### **1. User ID Issues**
```
❌ DEBUG: User ID is missing!
```
**Solution**: Check if user is properly authenticated

### **2. Buddy Relationship Issues**
```
❌ DEBUG: Buddy relationship not found
```
**Solution**: Verify buddy relationship exists in database

### **3. RPC Function Errors**
```
❌ DEBUG: RPC function returned error: ...
```
**Solution**: Check database function implementation

### **4. Message Retrieval Issues**
```
📊 DEBUG: Retrieved 0 messages
```
**Solution**: Check get_buddy_messages function

## 🧪 **Testing Steps**

### **1. Send a Test Message**
1. Open chat with a buddy
2. Type a message and send
3. Check console for debug logs
4. Check Supabase logs for database debug info

### **2. Check Message Delivery**
1. Switch to recipient's view
2. Check if message appears
3. Look for any error logs
4. Verify message count in debug logs

### **3. Verify Database Records**
```sql
-- Check if message was inserted
SELECT * FROM buddy_messages 
WHERE sender_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check buddy relationships
SELECT * FROM buddies 
WHERE user_id = 'your-user-id' 
OR buddy_user_id = 'your-user-id';
```

## 📋 **Debug Checklist**

- [ ] Frontend debug logs appear in console
- [ ] Database debug logs appear in Supabase logs
- [ ] Message ID is returned successfully
- [ ] No error messages in logs
- [ ] Message appears in recipient's chat
- [ ] Database records are created correctly
- [ ] Buddy relationships are updated properly

## 🚨 **If Messages Still Not Delivering**

### **Check These Areas:**

1. **Authentication**: Is user properly logged in?
2. **Buddy Relationships**: Do both users have buddy records?
3. **Database Permissions**: Can users access buddy_messages table?
4. **RLS Policies**: Are Row Level Security policies blocking access?
5. **Network Issues**: Are RPC calls timing out?

### **Quick Database Checks:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'buddy_messages';

-- Check table permissions
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'buddy_messages';

-- Check function permissions
SELECT * FROM information_schema.routines 
WHERE routine_name = 'send_buddy_message';
```

## 📞 **Need More Help?**

If debug logs show issues:
1. **Copy the exact error messages**
2. **Check Supabase logs for database errors**
3. **Verify buddy relationships exist**
4. **Test with a simple message first**
5. **Check network connectivity**
