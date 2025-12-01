# Whispr Notes Notification Batching Implementation

## 🎯 **Overview**

Implemented a batching system for Whispr Notes notifications to reduce notification spam. Multiple notes that arrive within a short time window are grouped into a single notification.

---

## ✅ **What Was Implemented**

### **1. Note Batching Service** (`src/services/noteBatchingService.ts`)

- **Singleton service** that batches multiple notes together
- **Time-based batching**: Groups notes that arrive within 5 seconds (foreground) or 1 second (background)
- **Automatic flushing**: Flushes batch when app goes to background
- **Stable notification ID**: Uses ID `9999` for all note notifications (allows Android to replace/update)

### **2. Updated Notification Service** (`src/services/notificationService.ts`)

- **Enhanced `showNoteNotification`**: Now accepts optional `noteCount` parameter
- **Batched notifications**: Shows count in title when multiple notes (e.g., "3 New Whispr Notes")
- **Stable notification ID**: All note notifications use same ID and tag for replacement

### **3. Updated Realtime Service** (`src/services/realtimeService.ts`)

- **Uses batching**: `handleNewNote` now routes notes through batching service instead of showing immediately
- **Prevents duplicates**: Still uses duplicate prevention before adding to batch

### **4. Updated Notification Manager** (`src/services/notificationManager.ts`)

- **Uses batching**: `checkForNewNotes` (polling) now routes notes through batching service
- **Groups multiple notes**: All new notes from polling are added to the same batch

---

## 🚀 **How It Works**

### **Batching Flow:**

```
Note Arrives (Realtime or Polling)
    ↓
Add to Batch (noteBatchingService.addNoteToBatch)
    ↓
Timer Starts (5s foreground, 1s background)
    ↓
More Notes Arrive?
    ├─ Yes → Reset timer, add to batch
    └─ No → Timer fires
        ↓
Show Batched Notification
    ├─ 1 note → "New Whispr Note" + content preview
    └─ Multiple → "X New Whispr Notes" + latest preview
```

### **Key Features:**

1. **Time Window Batching**
   - **Foreground**: 5 seconds delay (allows more notes to accumulate)
   - **Background**: 1 second delay (faster notification, still allows batching)

2. **Automatic Flushing**
   - When app goes to background, batch is flushed immediately
   - Ensures notifications aren't lost when app state changes

3. **Stable Notification ID**
   - All note notifications use ID `9999`
   - Android replaces previous notification with same ID
   - Prevents notification spam

4. **Smart Message Display**
   - Single note: Shows full content (truncated to 100 chars)
   - Multiple notes: Shows count + preview of latest note

---

## 📋 **Example Scenarios**

### **Scenario 1: Single Note**
```
User receives 1 note
→ Batch delay (5s)
→ Notification: "New Whispr Note"
   "This is the note content..."
```

### **Scenario 2: Multiple Notes (Quick Succession)**
```
User receives 3 notes within 5 seconds
→ All added to batch
→ Timer resets with each new note
→ After 5s of no new notes
→ Notification: "3 New Whispr Notes"
   "You have 3 new notes. Latest: This is the latest note content..."
```

### **Scenario 3: Notes Over Time**
```
User receives note 1 → Notification after 5s
User receives note 2 (10s later) → New notification after 5s
User receives note 3 (2s later) → Added to batch with note 2
→ Notification: "2 New Whispr Notes"
```

---

## 🔧 **Configuration**

### **Batching Delays**

Located in `src/services/noteBatchingService.ts`:

```typescript
private batchDelay = 5000; // 5 seconds for foreground
// Background uses 1 second delay (hardcoded in addNoteToBatch)
```

**To adjust:**
- **Shorter delay** (more responsive): Reduce `batchDelay` to 2000-3000ms
- **Longer delay** (more batching): Increase `batchDelay` to 7000-10000ms

### **Notification ID**

Located in `src/services/noteBatchingService.ts`:

```typescript
private readonly NOTIFICATION_ID = 9999;
```

**Note**: Changing this will create separate notifications instead of replacing.

---

## ✅ **Benefits**

1. **Reduced Notification Spam**: Multiple notes grouped into one notification
2. **Better UX**: Users see count instead of individual notifications
3. **Smart Timing**: Notes that arrive together are batched together
4. **Automatic Management**: No manual intervention needed
5. **Background Safe**: Works correctly when app is in background

---

## 🧪 **Testing**

### **Test Single Note:**
1. Send 1 note
2. Wait 5 seconds
3. Should see: "New Whispr Note" with content

### **Test Multiple Notes:**
1. Send 3 notes quickly (within 5 seconds)
2. Wait 5 seconds after last note
3. Should see: "3 New Whispr Notes" with count and latest preview

### **Test Background Batching:**
1. Put app in background
2. Send 2 notes quickly (within 1 second)
3. Should see: "2 New Whispr Notes" after 1 second

---

## 📝 **Notes**

- Batching only applies to **local notifications** (shown by the app)
- **FCM notifications** (from database trigger) are still sent individually
- FCM notifications will be replaced by batched local notification when app processes them
- Batching works for both **realtime** and **polling** notification sources

