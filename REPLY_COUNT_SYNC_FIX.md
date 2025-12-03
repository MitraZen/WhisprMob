# Reply Count Sync Fix

## 🔍 Problem
The `reply_count` column in `whispr_notes` is not syncing with the actual number of replies in `whispr_note_replies`.

## ✅ Solution

### Step 1: Run the Fix Migration

**File**: `docs/database/migrations/fix_reply_count_trigger.sql`

This migration will:
1. ✅ Fix the trigger function to always update `reply_count` (removed NULL sender_id check)
2. ✅ Force sync ALL notes with their actual reply counts
3. ✅ Create a maintenance function `sync_all_reply_counts()` for future use

**Execute in Supabase SQL Editor:**
```sql
-- Run the entire file: docs/database/migrations/fix_reply_count_trigger.sql
```

### Step 2: Verify the Sync

After running the migration, verify with this query:

```sql
-- Check sync status
SELECT 
  n.id,
  LEFT(n.content, 50) as note_preview,
  n.reply_count as stored_count,
  COALESCE(COUNT(r.id), 0) as actual_count,
  CASE 
    WHEN n.reply_count = COALESCE(COUNT(r.id), 0) THEN '✅ SYNCED'
    ELSE '❌ OUT OF SYNC'
  END as status
FROM whispr_notes n
LEFT JOIN whispr_note_replies r ON r.note_id = n.id AND r.is_deleted = false
GROUP BY n.id, n.content, n.reply_count
ORDER BY n.created_at DESC
LIMIT 20;
```

All notes should show `✅ SYNCED`.

### Step 3: Manual Sync (If Needed)

If counts are still out of sync, run the manual sync script:

**File**: `docs/database/migrations/sync_reply_counts_manual.sql`

This script:
- Updates ALL notes to match actual reply counts
- Includes a verification query at the end

## 🔧 How It Works

### Trigger Function
The trigger `update_note_reply_count()` now:
- ✅ Always updates `reply_count` on INSERT/UPDATE/DELETE
- ✅ Handles NULL `reply_count` values (treats as 0)
- ✅ Works regardless of `sender_id` value

### Sync Query
The sync query:
```sql
UPDATE whispr_notes
SET reply_count = COALESCE((
  SELECT COUNT(*)
  FROM whispr_note_replies
  WHERE whispr_note_replies.note_id = whispr_notes.id
  AND whispr_note_replies.is_deleted = false
), 0);
```

This updates **ALL** notes to match their actual reply counts.

### Maintenance Function
The `sync_all_reply_counts()` function:
- Finds notes where `reply_count` doesn't match actual count
- Updates only those notes (more efficient for large datasets)
- Returns a report of what was fixed

**Usage:**
```sql
-- Run sync and see what was fixed
SELECT * FROM sync_all_reply_counts();
```

## 📊 Expected Behavior After Fix

1. **Creating a Reply**:
   - Reply is saved ✅
   - Trigger automatically increments `reply_count` ✅
   - Count is immediately accurate ✅

2. **Deleting a Reply**:
   - Reply is soft-deleted ✅
   - Trigger automatically decrements `reply_count` ✅
   - Count is immediately accurate ✅

3. **Viewing Notes**:
   - `reply_count` matches actual number of replies ✅
   - UI displays correct count ✅

## 🐛 Troubleshooting

### If counts are still wrong after migration:

1. **Check if trigger exists:**
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'update_note_reply_count_trigger';
```

2. **Check trigger function:**
```sql
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'update_note_reply_count';
```

3. **Test trigger manually:**
```sql
-- Create a test reply and check if count updates
INSERT INTO whispr_note_replies (note_id, user_id, content, is_anonymous)
VALUES ('<note_id>', '<user_id>', 'Test reply', true);

-- Check if count updated
SELECT reply_count FROM whispr_notes WHERE id = '<note_id>';
```

4. **Run manual sync again:**
```sql
-- Force sync all notes
UPDATE whispr_notes
SET reply_count = COALESCE((
  SELECT COUNT(*)
  FROM whispr_note_replies
  WHERE whispr_note_replies.note_id = whispr_notes.id
  AND whispr_note_replies.is_deleted = false
), 0);
```

## 📝 Files Changed

1. ✅ `docs/database/migrations/fix_reply_count_trigger.sql` - Fixed trigger + sync
2. ✅ `docs/database/migrations/sync_reply_counts_manual.sql` - Manual sync script
3. ✅ `src/services/buddiesService.ts` - Added verification logging

## ✅ Next Steps

1. Run `fix_reply_count_trigger.sql` in Supabase
2. Verify sync with the verification query
3. Test creating/deleting replies
4. Check console logs for `📊 Reply count after creation:` messages

