# Complete Notification Flow Analysis

## Overview
This document traces the complete flow of notifications from arrival to user interaction in the Whispr Mobile App.

---

## 1. Notification Sources

### A. Supabase Realtime (Primary - Foreground)
- **Service**: `realtimeService.ts`
- **Trigger**: PostgreSQL `buddy_messages` table changes
- **Method**: Supabase Realtime subscriptions via WebSocket
- **When**: App is in foreground or background (but not killed)

### B. FCM Push Notifications (Secondary - Background/Closed)
- **Service**: `FCMService.ts`, `FCMManager.ts`
- **Trigger**: Server-side Edge Function sends FCM messages
- **Method**: Firebase Cloud Messaging
- **When**: App is in background or killed

### C. Polling Fallback (Tertiary)
- **Service**: `notificationManager.ts`
- **Trigger**: Interval-based polling (every 30 seconds)
- **Method**: Direct database queries
- **When**: Realtime connection fails

---

## 2. Notification Initialization Flow

### Step 1: User Authentication
**File**: `src/store/AuthContext.tsx`
- User logs in → `checkAuthStatus()` called
- If authenticated → `initializeNotificationServicesSafely(userId)` called

### Step 2: Service Initialization
**File**: `src/store/AuthContext.tsx` → `initializeNotificationServicesSafely()`

**Sequence**:
1. **NotificationManager.startNotificationService(userId)**
   - Calls `realtimeService.initialize(userId)` 
   - If realtime fails → falls back to polling
   
2. **FCMManager.initialize(userId)** (non-blocking)
   - Gets FCM token
   - Saves token to database (`user_fcm_tokens`)
   - Sets up token refresh listener
   - Sets up auth state listener (for pending token saves)

3. **NotificationService.initializeFCMAfterLogin(userId)**
   - Requests FCM permissions
   - Sets up background/foreground handlers
   - Registers local notification handlers

### Step 3: Local Notification Setup
**File**: `src/services/notificationService.ts`
- `PushNotification.configure()` sets up:
  - `onNotification()` → handles notification taps
  - Notification channels (Android)
  - Default notification settings

---

## 3. Message Arrival Flow (Foreground)

### Path A: Realtime Message (Preferred)

**Step 1: Realtime Subscription**
- **File**: `src/services/realtimeService.ts`
- Supabase Realtime detects database change
- `handleNewMessage()` called with message payload

**Step 2: Deduplication**
```typescript
// Check if message already processed
const messageKey = `${messageData.buddy_id}_${messageData.id}`;
if (this.processedMessages.has(messageKey)) {
  return; // Skip duplicate
}
this.processedMessages.add(messageKey);
```

**Step 3: Cache Update**
- `CachedBuddiesService.applyRealtimeUpdate()` updates buddy cache
- UI events dispatched: `message-updated`, `buddies-updated`

**Step 4: Notification Routing Decision**
```typescript
// Check if chat is active
const isChatActive = activeChatService.isActiveChat(messageData.buddy_id);

if (isChatActive && appState === 'active') {
  // Skip notification - user is viewing chat
  return;
}
```

**Step 5: Hybrid Notification Routing**
- **Immediate Path**: `sendImmediateNotification()` 
  - Shows notification immediately via `notificationService.showMessageNotification()`
  - Used for high-priority messages
  
- **Batch Path**: `routeToBatchSystem()`
  - Adds to Phase 3 batching system
  - Groups multiple messages per user
  - Processes after delay (1.5 seconds)

**Step 6: Display Notification**
- **File**: `src/services/notificationService.ts` → `showMessageNotification()`
- Creates local notification via `PushNotification.localNotification()`
- Includes in `userInfo`:
  - `buddyName`
  - `buddyId` (NEW - for faster navigation)
  - `messageCount`
  - `isBatched`

---

### Path B: FCM Ping Message (Background Wake-up)

**Step 1: FCM Message Received**
- **File**: `App.tsx` → `messaging().onMessage()`
- Checks if `data.type === 'ping'`

**Step 2: Handle Ping**
- **File**: `src/services/notificationService.ts` → `handleFCMPing()`
- Calls `realtimeService.forceReconnection()`
- Realtime fetches new messages → triggers normal flow (Path A)

---

## 4. Notification Display Flow

### A. Local Notification (Foreground/Background)
**File**: `src/services/notificationService.ts` → `showMessageNotification()`

**Checks**:
1. Recent notifications deduplication (5-second window)
2. Chat active state (suppress if user is in chat)
3. Notification permissions

**Creation**:
```typescript
PushNotification.localNotification({
  id: notificationId,
  channelId: 'whispr-messages',
  title: displayTitle,
  message: displayMessage,
  userInfo: { 
    buddyName, 
    buddyId,  // NEW - for faster lookup
    messageCount,
    isBatched 
  }
});
```

### B. Phase 3 Batching
**File**: `src/services/phase3NotificationLogicService.ts`

**Flow**:
1. `addToBatch()` accumulates messages per user
2. Rate limiting prevents spam
3. `processUserBatches()` called after delay or high priority
4. Single notification shows all messages for user
5. Batched notifications include `buddyId` from batch

---

## 5. Notification Tap Flow

### Step 1: Tap Detection
**File**: `src/services/notificationService.ts`
- `PushNotification.configure({ onNotification })` handler fires
- Calls `handleNotificationTap(notification)`

### Step 2: Extract Notification Data
```typescript
const userInfo = notification.userInfo || notification.data;
const buddyName = userInfo?.buddyName;
const buddyId = userInfo?.buddyId;  // NEW
```

### Step 3: Clear Batch (Non-blocking)
- Calls `phase3Service.clearUserBatch(buddyName)`
- Prevents duplicate notifications

### Step 4: Find Buddy (Priority Order)

**Priority 1: Direct Database Lookup by `buddyId`** (NEW - Fastest)
- Query `buddies` table by `buddyId` and `user_id`
- Transform to Buddy format
- **Timeout**: 5 seconds max

**Priority 2: Cache Lookup by `buddyId`**
- Use `CachedBuddiesService.getBuddies(userId)`
- Find by `buddyId`

**Priority 3: Cache Lookup by `buddyName`**
- Use `CachedBuddiesService.getBuddies(userId)`
- Find by `buddyName` or `username`

**Fallback**: If not found, emit with `buddyId`/`buddyName` only

### Step 5: Session Wait (NEW)
- Waits for Supabase session to be ready
- Progressive delays: 200ms, 400ms, 800ms, 1600ms
- Max 5 attempts (~3 seconds total)

### Step 6: Emit Navigation Event
```typescript
DeviceEventEmitter.emit('navigateToChat', { 
  buddy,        // If found
  buddyId,      // Fallback
  buddyName     // Fallback
});
```

### Step 7: AppNavigator Receives Event
**File**: `src/navigation/AppNavigator.tsx`

**Handler**: `handleNotificationNavigation(event)`

**Flow**:
1. If `buddy` object provided → Navigate directly to chat
2. If only `buddyName` → Look up buddy (with 3-second timeout)
3. If `buddyId` provided → Direct database lookup first, then cache
4. If not found → Navigate to buddies list

**Navigation**:
```typescript
navigate('chat', { buddy });
```

---

## 6. Chat Screen Opening

### Step 1: Navigation
**File**: `src/navigation/AppNavigator.tsx`
- React Navigation routes to `ChatScreen` or `TelegramStyleChatScreen`

### Step 2: Active Chat Service
**File**: `src/services/activeChatService.ts`
- `setActiveChat(buddyId)` called
- Prevents notifications for active chat

### Step 3: Load Messages
**File**: `src/screens/TelegramStyleChatScreen.tsx`
- `loadMessages()` fetches messages from database
- Loads replies for messages
- Marks messages as read

---

## 7. Key Improvements Made

### A. buddyId Support
- ✅ Added `buddyId` parameter to `showMessageNotification()`
- ✅ Pass `buddyId` from `realtimeService` and `phase3NotificationLogicService`
- ✅ Include `buddyId` in notification `userInfo`
- ✅ Prioritize `buddyId` lookup in notification tap handler

### B. Session Handling
- ✅ Wait for Supabase session before buddy lookup
- ✅ Progressive delays for session restoration
- ✅ Graceful fallback if session not ready

### C. Error Handling
- ✅ Timeout protection (5 seconds)
- ✅ Multiple fallback strategies
- ✅ Non-blocking operations

---

## 8. Potential Issues & Recommendations

### Issues Identified

1. **Duplicate Handler Registration** ✅ FIXED
   - ~~`messaging().onMessage()` in both `App.tsx` and `notificationService.ts`~~
   - **Fix Applied**: Consolidated all FCM handlers into `notificationService.setupFCMHandlers()`
   - **Result**: Single handler location, prevents duplicates, handles ping messages properly
   - **Implementation**: Handlers set up during FCM initialization with duplicate prevention flag

2. **Session Timing**
   - Notification tap may occur before session is ready
   - Current: Session wait with progressive delays
   - **Status**: ✅ Fixed

3. **Buddy Lookup Performance**
   - Multiple fallback queries may be slow
   - Current: Priority-based lookup with timeouts
   - **Status**: ✅ Improved with direct DB lookup by `buddyId`

4. **Notification Deduplication**
   - Recent notifications cache (5 seconds) may miss some
   - Current: Works but may need tuning
   - **Recommendation**: Monitor and adjust window

5. **FCM Token Save RLS Issues**
   - Token save may fail if session not ready
   - Current: Queue pending tokens, save when session ready
   - **Status**: ✅ Fixed with auth state listener

### Recommendations

1. **Add Notification Analytics**
   - Track notification delivery rates
   - Monitor tap-through rates
   - Identify bottlenecks

2. **Improve Error Logging**
   - More detailed error messages
   - Stack traces for debugging
   - User-friendly error messages

3. **Test Edge Cases**
   - App killed → notification tap
   - Multiple rapid notifications
   - Session expired during tap
   - Network offline during tap

4. **Performance Optimization**
   - Cache buddy lookups
   - Reduce database queries
   - Batch operations where possible

---

## 9. Flow Diagram Summary

```
Message Sent
    ↓
Database Trigger (PostgreSQL)
    ↓
Supabase Realtime Subscription
    ↓
realtimeService.handleNewMessage()
    ↓
[Check Deduplication] → Skip if duplicate
    ↓
[Check Active Chat] → Skip if user in chat
    ↓
Route to Notification System
    ├─→ Immediate: showMessageNotification()
    └─→ Batch: phase3Service.addToBatch()
              ↓
         processUserBatches()
              ↓
         showMessageNotification()
    ↓
PushNotification.localNotification()
    ↓
[User Taps Notification]
    ↓
onNotification() Handler
    ↓
handleNotificationTap()
    ↓
[Wait for Session] (NEW)
    ↓
[Find Buddy]
    ├─→ Priority 1: Direct DB by buddyId
    ├─→ Priority 2: Cache by buddyId
    └─→ Priority 3: Cache by buddyName
    ↓
Emit 'navigateToChat' Event
    ↓
AppNavigator.handleNotificationNavigation()
    ↓
Navigate to Chat Screen
    ↓
Load Messages & Mark as Read
```

---

## 10. Files Involved

### Core Services
- `src/services/notificationService.ts` - Local notifications, tap handling
- `src/services/realtimeService.ts` - Realtime message routing
- `src/services/notificationManager.ts` - Service orchestration
- `src/services/phase3NotificationLogicService.ts` - Notification batching
- `src/services/FCMManager.ts` - FCM token management
- `src/services/fcmService.ts` - FCM server communication

### Navigation
- `src/navigation/AppNavigator.tsx` - Navigation handler

### App Setup
- `App.tsx` - FCM message handlers
- `src/store/AuthContext.tsx` - Service initialization
- `index.js` - App registration

### Screens
- `src/screens/TelegramStyleChatScreen.tsx` - Chat UI
- `src/screens/BuddiesScreen.tsx` - Buddy list

---

## End of Analysis

