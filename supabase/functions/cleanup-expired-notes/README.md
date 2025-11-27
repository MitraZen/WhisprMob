# Cleanup Expired Notes Edge Function

This Edge Function automatically cleans up expired Whisper notes according to the retention policy:
- **Active period**: 7 days
- **Grace period**: 30 days (expired notes kept for sent notes history)
- **Deletion**: After 60 days total from creation

## What It Does

1. Marks notes as expired when `expires_at` passes
2. Deletes notes older than 60 days from creation
3. Returns statistics about the cleanup operation

## Setup Instructions

### Step 1: Deploy the Edge Function

```bash
# From project root
supabase functions deploy cleanup-expired-notes
```

### Step 2: Set Up Cron Job in Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Cron Jobs** (or **Database** → **Extensions** → **pg_cron**)
3. Click **Create Cron Job** or **New Cron Job**
4. Configure:
   - **Name**: `cleanup-expired-notes-daily`
   - **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
   - **Command**: 
     ```sql
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-notes',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )::jsonb
     );
     ```
   - **Enabled**: ✅ Yes

### Step 3: Alternative - Use Supabase Cron Extension

If you have `pg_cron` extension enabled, you can schedule it directly:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function
SELECT cron.schedule(
  'cleanup-expired-notes-daily',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-notes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )::jsonb
  );
  $$
);
```

### Step 4: Test the Function

You can test the function manually:

```bash
# Using curl
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-notes' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

Or via Supabase Dashboard:
1. Go to **Edge Functions** → **cleanup-expired-notes**
2. Click **Invoke** button
3. Check the response for cleanup statistics

## Expected Response

```json
{
  "success": true,
  "result": {
    "marked_expired": 5,
    "deleted_old": 12,
    "timestamp": "2025-01-15T02:00:00.000Z"
  },
  "timestamp": "2025-01-15T02:00:00.000Z"
}
```

## Monitoring

Check the cleanup status:

```sql
-- View retention status
SELECT * FROM public.whispr_notes_retention_status;

-- Count notes by status
SELECT status, COUNT(*) as count
FROM public.whispr_notes
GROUP BY status;

-- Check notes that will be deleted soon
SELECT COUNT(*) as will_be_deleted
FROM public.whispr_notes
WHERE created_at < (NOW() - INTERVAL '60 days')
AND status IN ('expired', 'listened', 'rejected');
```

## Troubleshooting

### Function Not Running
- Check Supabase Dashboard → Edge Functions → Logs
- Verify the cron job is enabled
- Check that the service role key is correct

### No Notes Being Cleaned
- Verify notes exist that match the criteria
- Check the `expires_at` and `created_at` timestamps
- Run the database function directly to test:
  ```sql
  SELECT public.cleanup_expired_notes();
  ```

## Schedule Options

Common cron schedules:
- `0 2 * * *` - Daily at 2 AM UTC (recommended)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 2 * * 1` - Weekly on Monday at 2 AM

