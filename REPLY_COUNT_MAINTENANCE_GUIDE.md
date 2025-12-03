# Reply Count Maintenance Function Guide

## 📋 Overview

Two maintenance functions have been created to automatically sync `reply_count` in `whispr_notes` with the actual number of replies:

1. **`sync_whispr_note_reply_counts(dry_run)`** - Detailed sync with reporting
2. **`sync_whispr_note_reply_counts_quick()`** - Fast sync for scheduled jobs

## 🚀 Installation

Run this migration in Supabase SQL Editor:

```sql
-- Run: docs/database/migrations/create_reply_count_sync_function.sql
```

## 📖 Function 1: Detailed Sync (with reporting)

### Signature
```sql
sync_whispr_note_reply_counts(dry_run BOOLEAN DEFAULT false)
```

### Parameters
- `dry_run` (optional): If `true`, only reports what would be changed without making changes

### Returns
A table with columns:
- `note_id` - UUID of the note
- `note_preview` - First 50 characters of note content
- `old_count` - Current stored count
- `new_count` - Actual count from database
- `status` - Sync status (✅ SYNCED, ⚠️ UNDERCOUNTED, ⚠️ OVERCOUNTED, ❌ ERROR)
- `action_taken` - Description of what was done

### Usage Examples

#### 1. Dry Run (Preview Changes)
```sql
-- See what would be changed without actually changing anything
SELECT * FROM sync_whispr_note_reply_counts(true);
```

**Output:**
```
note_id | note_preview | old_count | new_count | status          | action_taken
--------|--------------|-----------|-----------|-----------------|----------------------------------
abc-123 | Hello world  | 2         | 5         | ⚠️ UNDERCOUNTED | Would update from 2 to 5
def-456 | Test note    | 3         | 3         | ✅ SYNCED       | No action needed
```

#### 2. Actual Sync
```sql
-- Actually sync all counts
SELECT * FROM sync_whispr_note_reply_counts(false);
```

#### 3. Check Specific Note
```sql
-- Sync and check a specific note
SELECT * FROM sync_whispr_note_reply_counts(false) 
WHERE note_id = 'your-note-id-here';
```

#### 4. Find Only Out-of-Sync Notes
```sql
-- Only show notes that need fixing
SELECT * FROM sync_whispr_note_reply_counts(false)
WHERE status != '✅ SYNCED';
```

## ⚡ Function 2: Quick Sync (for scheduled jobs)

### Signature
```sql
sync_whispr_note_reply_counts_quick()
```

### Returns
- `INTEGER` - Number of notes that were updated

### Usage

```sql
-- Quick sync (returns count of updated notes)
SELECT sync_whispr_note_reply_counts_quick();
```

**Output:**
```
sync_whispr_note_reply_counts_quick
-----------------------------------
15
```

This function is optimized for scheduled execution and doesn't return detailed information.

## 🔄 Scheduled Maintenance (Optional)

If you have `pg_cron` extension enabled, you can schedule automatic syncing:

```sql
-- Run daily at 2 AM
SELECT cron.schedule(
    'sync-reply-counts-daily',
    '0 2 * * *',
    'SELECT sync_whispr_note_reply_counts_quick();'
);

-- Run every 6 hours
SELECT cron.schedule(
    'sync-reply-counts-6h',
    '0 */6 * * *',
    'SELECT sync_whispr_note_reply_counts_quick();'
);
```

## ✅ Verification

After running the sync, verify with this query:

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

## 🎯 When to Use

### Use Detailed Sync (`sync_whispr_note_reply_counts`) when:
- ✅ You want to see what's being changed
- ✅ Debugging sync issues
- ✅ Manual maintenance
- ✅ Need detailed reporting

### Use Quick Sync (`sync_whispr_note_reply_counts_quick`) when:
- ✅ Scheduled jobs (cron)
- ✅ Automated maintenance
- ✅ Don't need detailed output
- ✅ Performance is critical

## 🔧 Troubleshooting

### Issue: Function returns no rows
**Solution**: All notes are already synced! This is good.

### Issue: Some notes still show as out of sync
**Solution**: 
1. Check if there are soft-deleted replies that should be counted
2. Verify RLS policies allow counting replies
3. Run the sync again

### Issue: Function is slow
**Solution**: 
- Use `sync_whispr_note_reply_counts_quick()` instead
- Add indexes on `whispr_note_replies(note_id, is_deleted)`

## 📊 Performance Notes

- **Detailed Sync**: Processes all notes, returns detailed report
- **Quick Sync**: Uses efficient CTE, only updates what's needed
- Both functions are `SECURITY DEFINER` so they run with elevated privileges
- Both handle errors gracefully

## 🔐 Permissions

Both functions are granted to:
- `authenticated` - Logged-in users can run
- `service_role` - Service accounts can run

For scheduled jobs, use `service_role` credentials.

