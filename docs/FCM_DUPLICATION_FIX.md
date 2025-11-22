# FCM Notification Duplication Fix

## Problem Identified

When the app is in background/idle, duplicate notifications were appearing:
1. **FCM Background Handler** displays notification (from `index.js`)
2. **Batch System** also displays notification (from `phase3NotificationLogicService`)
3. **Result**: User sees 2 notifications per message

## Root Cause

- FCM Edge Function sends full message data with notification payload
- Background handler displays notification for every FCM message
- Realtime processes the same message when app wakes
- Batch system displays grouped notification
- **Duplication occurs**

## Solution Implemented

### Strategy: FCM Wake-Up Only, Batch System Handles Display

**FCM Role**: Wake up the app only (data-only message)
**Batch System Role**: Handle all notification display with proper grouping

### Changes Made

#### 1. Edge Function (`send-fcm-notification-v1/index.ts`)
- **Changed**: Sends data-only FCM message (no notification payload)
- **Data payload**: Minimal - just `type: "wake"`, `userId`, `buddyId`
- **No message content**: Batch system will fetch and display
- **Android**: High priority data-only message (wakes via `content-available`)
- **iOS**: Background push type with `content-available: 1`

#### 2. Background Handler (`index.js`)
- **Changed**: Skips display for wake signals (`type === 'wake'`)
- **Behavior**: Just wakes app, batch system handles notification display
- **Prevents**: Duplicate notifications

#### 3. Batch System (No Changes)
- **Unchanged**: Continues to handle all notification display
- **Groups**: Messages by user
- **Displays**: Grouped notifications with proper formatting

## New Flow (Background/Idle)

```
Message Inserted
    ↓
SQL Trigger Fires
    ↓
Edge Function Called
    ↓
Check: User active within 60s?
    ├─ YES → Skip FCM (realtime handles it)
    └─ NO → Send FCM wake signal (data-only)
            ↓
        FCM Delivered to Device
            ↓
        Background Handler Receives
            ↓
        Type = 'wake' → Skip Display ✅
            ↓
        App Wakes Up
            ↓
        Realtime Reconnects
            ↓
        Messages Processed via Realtime
            ↓
        Batch System Groups Messages
            ↓
        Batch System Displays Notification ✅
            (Single notification, properly grouped)
```

## Benefits

1. ✅ **No Duplication**: Only batch system displays notifications
2. ✅ **Proper Grouping**: Messages grouped by user (batch system)
3. ✅ **Minimal Data**: FCM only sends wake signal, not full message
4. ✅ **Battery Efficient**: Data-only messages are lighter
5. ✅ **Reliable Wake-Up**: High priority ensures app wakes even in Doze mode

## Testing

After deploying:
1. Send message when app is in background
2. Verify: Only ONE notification appears (from batch system)
3. Verify: Notification shows grouped messages correctly
4. Verify: FCM wake signal wakes app and reconnects realtime

## Files Modified

1. `supabase/functions/send-fcm-notification-v1/index.ts` - Data-only FCM messages
2. `index.js` - Skip display for wake signals
3. `database/create-fcm-notification-trigger.sql` - (Already correct, passes userId)

## Deployment Steps

1. Deploy updated Edge Function:
   ```bash
   supabase functions deploy send-fcm-notification-v1
   ```

2. Apply SQL trigger (if not already done):
   - Run `database/create-fcm-notification-trigger.sql` in Supabase SQL Editor

3. Test:
   - Send message when app is background
   - Verify single notification appears
   - Verify messages are grouped correctly

---

**Status**: Ready for deployment
**Impact**: Eliminates duplicate notifications, preserves batch system functionality


