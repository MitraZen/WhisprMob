# 📝 Whisper Notes FCM Implementation

## 🎯 **Overview**

This document describes the implementation of FCM (Firebase Cloud Messaging) push notifications for Whisper Notes, enabling notes to wake the screen even when the app is killed, matching the behavior of chat messages.

## ✅ **What Was Implemented**

### **1. Database Trigger for Notes** (`database/create-fcm-notification-trigger-notes.sql`)

- **Trigger Function**: `notify_fcm_new_note()`
- **Trigger**: `whispr_notes_fcm_notify` on `whispr_notes` table
- **Behavior**:
  - Sends FCM notifications to all active users (last seen within 1 hour) with FCM tokens
  - Excludes the sender from receiving notifications about their own notes
  - Only sends notifications for active notes (`is_active = true` AND `status = 'active'`)
  - Limited to 100 recipients per note to avoid overwhelming the system
  - Uses the same Edge Function as messages (`send-fcm-notification-v1`)

### **2. Edge Function Updates** (`supabase/functions/send-fcm-notification-v1/index.ts`)

- **Note Type Support**: Added handling for `type: "note"` in data payload
- **Notification Title**: Uses "New Whispr Note" for notes
- **Notification Body**: Uses note content preview (first 100 characters)
- **Channel ID**: Uses `whispr-notes` channel for Android notifications
- **Data Payload**: Includes note-specific fields:
  - `noteId`: The note's unique ID
  - `noteContent`: The full note content
  - `mood`: The note's mood
  - `senderName`: The sender's display name
- **Collapse Key**: Uses `noteId` for Android and `apns-collapse-id` for iOS

### **3. Background Handler Updates** (`index.js`)

- **Note Type Handling**: Added specific handling for `type === 'note'`
- **Behavior**: Notes are shown directly by OS (no batch system like messages)
- **No Duplicate Prevention**: Notes don't use the batch system, so no need for FCM tracking

### **4. Android Notification Channel Updates** (`NotificationService.kt`)

- **Channel Importance**: Changed from `IMPORTANCE_DEFAULT` to `IMPORTANCE_HIGH`
- **Lock Screen Visibility**: Added `VISIBILITY_PUBLIC` for lock screen display
- **Lights**: Enabled lights for high-priority notifications
- **Priority**: Changed notification priority from `PRIORITY_DEFAULT` to `PRIORITY_HIGH`
- **Vibration**: Enhanced vibration pattern to match messages

## 🚀 **How It Works**

### **Flow for Whisper Notes:**

```
Note Created (whispr_notes table)
    ↓
Database Trigger Fires (notify_fcm_new_note)
    ↓
Loop Through Active Users (with FCM tokens)
    ↓
Call Edge Function (send-fcm-notification-v1)
    ↓
Edge Function Checks Online Status
    ├─ User Online (recent) → Skip FCM
    └─ User Offline → Send FCM
        ↓
FCM Delivered to Device
    ↓
OS Shows Notification (wakes screen if app killed)
    ↓
Background Handler Receives (if app running)
    ├─ Type = 'note' → Return (OS already showed)
    └─ Realtime will handle updates when app wakes
```

### **Key Differences from Messages:**

| Feature | Messages | Notes |
|---------|----------|-------|
| **Recipients** | Single receiver (buddy) | Multiple recipients (all active users) |
| **Batch System** | Yes (groups messages) | No (shown directly) |
| **FCM Tracking** | Yes (prevents duplicates) | No (not needed) |
| **Channel ID** | `whispr-messages` | `whispr-notes` |
| **Collapse Key** | `buddyId` | `noteId` |

## 📋 **Deployment Steps**

### **1. Apply Database Trigger**

Run the SQL script in Supabase SQL Editor:

```sql
-- Run: database/create-fcm-notification-trigger-notes.sql
```

**Prerequisites:**
- `pg_net` extension must be enabled
- Service role key should be set (optional but recommended):
  ```sql
  ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
  ```

### **2. Deploy Edge Function**

Deploy the updated Edge Function:

```bash
supabase functions deploy send-fcm-notification-v1
```

### **3. Rebuild Android App**

Rebuild the app to include the updated notification channel:

```bash
npx react-native run-android
```

## 🧪 **Testing**

### **Test Scenario 1: Note Notification (App Killed)**

1. Kill the app completely
2. Have another user send a whisper note
3. **Expected**: Notification appears and wakes the screen
4. **Expected**: Tapping notification opens the app

### **Test Scenario 2: Note Notification (App Background)**

1. Put app in background
2. Have another user send a whisper note
3. **Expected**: Notification appears
4. **Expected**: OS shows notification (no duplicate from background handler)

### **Test Scenario 3: Multiple Notes**

1. Have multiple users send notes
2. **Expected**: Each note shows as separate notification
3. **Expected**: Notifications use `noteId` as collapse key (Android groups by note)

### **Test Scenario 4: Active Users Only**

1. Send a note
2. **Expected**: Only users active within last hour receive FCM
3. **Expected**: Sender does not receive notification about their own note

## 📊 **Performance Considerations**

- **Recipient Limit**: Trigger limits to 100 recipients per note to avoid overwhelming the system
- **Active Users Only**: Only sends to users active within last hour (reduces unnecessary notifications)
- **Error Handling**: Errors in trigger don't fail the transaction (logged but continue)
- **Async Processing**: Edge Function handles online status checks asynchronously

## 🔍 **Verification Queries**

### **Check Trigger Exists:**

```sql
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'whispr_notes_fcm_notify';
```

### **Check Function Exists:**

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'notify_fcm_new_note';
```

### **Test Note Creation:**

```sql
-- Insert a test note (replace with actual user IDs)
INSERT INTO public.whispr_notes (sender_id, content, mood, status, is_active)
VALUES (
    'your-sender-id-here'::uuid,
    'Test note for FCM notification',
    'happy',
    'active',
    true
);
```

## 🎯 **Benefits**

1. ✅ **Wakes Screen**: Notes now wake the screen even when app is killed
2. ✅ **Matches Messages**: Same behavior as chat messages for consistency
3. ✅ **Lock Screen Support**: Notifications visible on lock screen
4. ✅ **High Priority**: Uses HIGH importance channel for reliable delivery
5. ✅ **Broadcast Support**: Sends to all active users (not just one recipient)

## 📝 **Notes**

- Notes are broadcast to multiple users, unlike messages which are 1-to-1
- Notes don't use the batch system (they're shown directly)
- The trigger sends to all active users with FCM tokens (up to 100 per note)
- Online status check prevents sending to recently active users (realtime handles those)

---

**Status**: ✅ Implementation Complete  
**Next Steps**: Deploy Edge Function and apply database trigger

