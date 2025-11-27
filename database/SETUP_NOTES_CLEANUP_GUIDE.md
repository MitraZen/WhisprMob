# 🧹 Whisper Notes Cleanup - Setup Guide

This guide walks you through setting up automated cleanup of expired Whisper notes using Supabase Edge Function + Cron.

## 📋 Prerequisites

1. ✅ Retention policy functions deployed (`database/whispr-notes-retention-policy.sql`)
2. ✅ Supabase CLI installed and authenticated
3. ✅ Access to Supabase Dashboard

## 🚀 Step-by-Step Setup

### Step 1: Deploy the Retention Policy Functions

Run this SQL in Supabase SQL Editor:

```sql
-- Run: database/whispr-notes-retention-policy.sql
```

This creates:
- `mark_expired_notes()` - Marks notes as expired
- `cleanup_expired_notes()` - Main cleanup function
- `whispr_notes_retention_status` - Monitoring view

### Step 2: Deploy the Edge Function

From your project root:

```bash
supabase functions deploy cleanup-expired-notes
```

**Expected output:**
```
Deploying function cleanup-expired-notes...
Function cleanup-expired-notes deployed successfully
```

### Step 3: Get Your Project Details

You'll need:
1. **Project Reference**: Found in Supabase Dashboard → Settings → General → Reference ID
2. **Service Role Key**: Found in Supabase Dashboard → Settings → API → Service Role Key (keep this secret!)

### Step 4: Set Up Cron Job

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Cron Jobs**
   - If you don't see "Cron Jobs", go to **Database** → **Extensions** → Enable `pg_cron`
3. Click **Create Cron Job** or **New Cron Job**
4. Fill in:
   - **Name**: `cleanup-expired-notes-daily`
   - **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
   - **Command**: (See SQL below)
   - **Enabled**: ✅ Yes

**SQL Command:**
```sql
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-notes',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  )::jsonb
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your project reference (e.g., `axkktejoldizpveydidx`)
- `YOUR_SERVICE_ROLE_KEY` with your service role key

#### Option B: Via SQL (If pg_cron is enabled)

Run this in Supabase SQL Editor:

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

### Step 5: Test the Setup

#### Test the Edge Function Manually

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-notes' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

**Expected Response:**
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

#### Test the Database Function Directly

```sql
-- Run the cleanup function directly
SELECT public.cleanup_expired_notes();

-- Check retention status
SELECT * FROM public.whispr_notes_retention_status;
```

## 📊 Monitoring

### Check Cleanup Status

```sql
-- View retention status summary
SELECT * FROM public.whispr_notes_retention_status;

-- Count notes by status
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM public.whispr_notes
GROUP BY status;

-- Check notes that will be deleted soon
SELECT COUNT(*) as will_be_deleted
FROM public.whispr_notes
WHERE created_at < (NOW() - INTERVAL '60 days')
AND status IN ('expired', 'listened', 'rejected');
```

### View Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on **cleanup-expired-notes**
3. View **Logs** tab to see execution history

## ⚙️ Schedule Options

Common cron schedules:

| Schedule | Description |
|----------|-------------|
| `0 2 * * *` | Daily at 2 AM UTC (recommended) |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 2 * * 1` | Weekly on Monday at 2 AM |

## 🔧 Troubleshooting

### Function Not Running

1. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions → cleanup-expired-notes → Logs
   - Look for error messages

2. **Verify Cron Job is Enabled**
   - Supabase Dashboard → Database → Cron Jobs
   - Ensure the job is enabled and scheduled correctly

3. **Check Service Role Key**
   - Verify the key is correct in the cron job command
   - Ensure it has proper permissions

### No Notes Being Cleaned

1. **Check if Notes Exist**
   ```sql
   SELECT COUNT(*) FROM public.whispr_notes WHERE expires_at < NOW();
   ```

2. **Verify Function Works**
   ```sql
   SELECT public.cleanup_expired_notes();
   ```

3. **Check Retention Policy**
   - Notes must be older than 60 days to be deleted
   - Only notes with status `'expired'`, `'listened'`, or `'rejected'` are deleted

### Edge Function Errors

1. **Check Environment Variables**
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - These are automatically provided by Supabase

2. **Check Database Function Exists**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'cleanup_expired_notes';
   ```

## 📝 Retention Policy Summary

- **Active Period**: 7 days (notes are visible to recipients)
- **Grace Period**: 30 days (expired notes kept for sent notes history)
- **Deletion**: After 60 days total from creation

**Timeline:**
- Day 0-7: Note is active
- Day 7-37: Note is expired but kept (grace period)
- Day 60+: Note is deleted permanently

## ✅ Verification Checklist

- [ ] Retention policy functions deployed
- [ ] Edge Function deployed successfully
- [ ] Cron job created and enabled
- [ ] Test run completed successfully
- [ ] Monitoring queries working
- [ ] Edge Function logs accessible

## 🎯 Next Steps

1. Monitor the first few cleanup runs
2. Adjust schedule if needed
3. Set up alerts for failures (optional)
4. Review retention status weekly

---

**Need Help?** Check the Edge Function README: `supabase/functions/cleanup-expired-notes/README.md`

