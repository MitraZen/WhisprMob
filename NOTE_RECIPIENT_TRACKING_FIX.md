# 🔧 Note Recipient Tracking Fix

## 🚨 **Problem**

When one user listens to a whisper note, it disappears from **all other users'** whisper note screens. This is because:

1. **Global Status Update**: When a user listens, the `handle_note_propagation` function updates the note's global `status` from `'active'` to `'listened'` and sets `is_active = FALSE`
2. **Query Filter**: The query filters notes by `status=eq.active&is_active=eq.true`, so when status changes, the note disappears for everyone
3. **No Per-User Tracking**: The system wasn't using the `note_recipients` table to track individual user status

## ✅ **Solution**

Use the `note_recipients` table to track **per-user status** instead of updating the global note status.

### **Key Changes:**

1. **Database Function** (`handle_note_propagation`):
   - ✅ Updates `note_recipients.status` for the specific user (not global `whispr_notes.status`)
   - ✅ Keeps note `status = 'active'` globally so other users can still see it
   - ✅ Updates note counts (`listened_count`, `rejected_count`) for sender's view

2. **Query Function** (`get_user_available_notes`):
   - ✅ Filters out notes where user has already listened/rejected
   - ✅ Uses `note_recipients` table to check per-user status
   - ✅ Returns only notes the user hasn't responded to yet

3. **Client-Side Code**:
   - ✅ Uses new RPC function `get_user_available_notes` 
   - ✅ Falls back to old query with client-side filtering if RPC doesn't exist

## 📋 **Deployment Steps**

### **Step 1: Apply Database Fix**

Run in Supabase SQL Editor:
```sql
-- Run: database/fix-note-recipient-tracking.sql
```

This will:
- Create `note_recipients` table if it doesn't exist
- Update `handle_note_propagation` function to use per-user tracking
- Create `get_user_available_notes` function for filtering

### **Step 2: Test**

1. **User A** sends a note
2. **User B** and **User C** both see the note
3. **User B** listens to the note
4. **User C** should still see the note ✅
5. **User B** should NOT see the note anymore (they already listened) ✅

## 🎯 **How It Works Now**

### **Before (Broken):**
```
User A sends note → Status: 'active'
User B sees note ✅
User C sees note ✅
User B listens → Status: 'listened', is_active: false
User B sees note ❌ (filtered out)
User C sees note ❌ (filtered out - BUG!)
```

### **After (Fixed):**
```
User A sends note → Status: 'active'
User B sees note ✅
User C sees note ✅
User B listens → note_recipients: {user B: 'listened'}, note status: 'active'
User B sees note ❌ (filtered by note_recipients)
User C sees note ✅ (still active, not in their note_recipients)
```

## 📊 **Database Schema**

### **note_recipients Table**
```sql
CREATE TABLE public.note_recipients (
    id uuid PRIMARY KEY,
    note_id uuid REFERENCES whispr_notes(id),
    recipient_id uuid REFERENCES auth.users(id),
    status text CHECK (status IN ('delivered', 'listened', 'rejected')),
    received_at timestamp,
    responded_at timestamp,
    UNIQUE(note_id, recipient_id)
);
```

### **whispr_notes Table** (unchanged)
- `status` stays `'active'` globally
- `listened_count` and `rejected_count` track totals for sender's view

## 🔍 **Verification**

After applying the fix:

1. **Check note_recipients table exists:**
   ```sql
   SELECT * FROM public.note_recipients LIMIT 5;
   ```

2. **Check function exists:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'get_user_available_notes';
   ```

3. **Test the flow:**
   - Send a note from User A
   - Verify User B and User C both see it
   - User B listens
   - Verify User C still sees it
   - Verify User B doesn't see it anymore

---

**Status**: ✅ Fix Ready  
**Impact**: Notes will no longer disappear for other users when one user listens

