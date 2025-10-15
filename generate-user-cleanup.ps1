# User Cleanup Script Generator
# This script generates a SQL cleanup script for a specific email address

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [switch]$Execute = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Preview = $true
)

# Validate email format
if ($Email -notmatch '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') {
    Write-Error "Invalid email format: $Email"
    exit 1
}

Write-Host "🔍 Generating cleanup script for: $Email" -ForegroundColor Cyan

# Generate the SQL script
$sqlScript = @"
-- User Cleanup Script for: $Email
-- Generated on: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- ⚠️  WARNING: This will permanently delete all data for this user!

-- ==============================================
-- PREVIEW: What will be deleted
-- ==============================================
WITH target_user AS (
    SELECT 
        COALESCE(up.id, au.id) as user_id,
        COALESCE(up.email, au.email) as email,
        up.username,
        up.display_name,
        up.created_at,
        up.last_seen
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    tu.created_at,
    tu.last_seen,
    'User details' as data_type,
    1 as count
FROM target_user tu

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    NULL as created_at,
    NULL as last_seen,
    'Buddy relationships' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.buddies b ON b.user_id = tu.user_id OR b.buddy_user_id = tu.user_id

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    NULL as created_at,
    NULL as last_seen,
    'Messages sent' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.buddy_messages bm ON bm.sender_id = tu.user_id

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    NULL as created_at,
    NULL as last_seen,
    'Notes created' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.whispr_notes wn ON wn.user_id = tu.user_id

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    NULL as created_at,
    NULL as last_seen,
    'Blocking relationships' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.blocked_users bu ON bu.user_id = tu.user_id OR bu.blocked_user_id = tu.user_id

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    NULL as created_at,
    NULL as last_seen,
    'FCM tokens' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.user_fcm_tokens uft ON uft.user_id = tu.user_id

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    NULL as created_at,
    NULL as last_seen,
    'User preferences' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.user_preferences upref ON upref.user_id = tu.user_id;

-- ==============================================
-- EXECUTE CLEANUP (Uncomment to run)
-- ==============================================

-- Step 1: Create backup (recommended)
-- CREATE TABLE backup_user_cleanup_$(date +%Y%m%d_%H%M%S) AS 
-- SELECT *, NOW() as backup_created_at
-- FROM public.user_profiles 
-- WHERE email = '$Email';

-- Step 2: Delete related data
-- WITH target_user AS (
--     SELECT COALESCE(up.id, au.id) as user_id
--     FROM public.user_profiles up
--     FULL OUTER JOIN auth.users au ON up.id = au.id
--     WHERE up.email = '$Email' OR au.email = '$Email'
-- )
-- DELETE FROM public.buddies 
-- WHERE user_id IN (SELECT user_id FROM target_user) 
--    OR buddy_user_id IN (SELECT user_id FROM target_user);

-- WITH target_user AS (
--     SELECT COALESCE(up.id, au.id) as user_id
--     FROM public.user_profiles up
--     FULL OUTER JOIN auth.users au ON up.id = au.id
--     WHERE up.email = '$Email' OR au.email = '$Email'
-- )
-- DELETE FROM public.buddy_messages 
-- WHERE sender_id IN (SELECT user_id FROM target_user);

-- WITH target_user AS (
--     SELECT COALESCE(up.id, au.id) as user_id
--     FROM public.user_profiles up
--     FULL OUTER JOIN auth.users au ON up.id = au.id
--     WHERE up.email = '$Email' OR au.email = '$Email'
-- )
-- DELETE FROM public.whispr_notes 
-- WHERE user_id IN (SELECT user_id FROM target_user);

-- WITH target_user AS (
--     SELECT COALESCE(up.id, au.id) as user_id
--     FROM public.user_profiles up
--     FULL OUTER JOIN auth.users au ON up.id = au.id
--     WHERE up.email = '$Email' OR au.email = '$Email'
-- )
-- DELETE FROM public.blocked_users 
-- WHERE user_id IN (SELECT user_id FROM target_user) 
--    OR blocked_user_id IN (SELECT user_id FROM target_user);

-- WITH target_user AS (
--     SELECT COALESCE(up.id, au.id) as user_id
--     FROM public.user_profiles up
--     FULL OUTER JOIN auth.users au ON up.id = au.id
--     WHERE up.email = '$Email' OR au.email = '$Email'
-- )
-- DELETE FROM public.user_fcm_tokens 
-- WHERE user_id IN (SELECT user_id FROM target_user);

-- WITH target_user AS (
--     SELECT COALESCE(up.id, au.id) as user_id
--     FROM public.user_profiles up
--     FULL OUTER JOIN auth.users au ON up.id = au.id
--     WHERE up.email = '$Email' OR au.email = '$Email'
-- )
-- DELETE FROM public.user_preferences 
-- WHERE user_id IN (SELECT user_id FROM target_user);

-- Step 3: Delete user profile
-- DELETE FROM public.user_profiles 
-- WHERE email = '$Email';

-- Step 4: Delete auth user
-- DELETE FROM auth.users 
-- WHERE email = '$Email';

-- ==============================================
-- VERIFICATION (Run after cleanup)
-- ==============================================
-- SELECT 
--     CASE 
--         WHEN EXISTS(SELECT 1 FROM public.user_profiles WHERE email = '$Email') 
--         THEN 'User profile still exists'
--         ELSE 'User profile deleted successfully'
--     END as user_profile_status,
--     CASE 
--         WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = '$Email') 
--         THEN 'Auth user still exists'
--         ELSE 'Auth user deleted successfully'
--     END as auth_user_status;
"@

# Save the script to a file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "cleanup-user-$($Email.Replace('@', '_').Replace('.', '_'))-$timestamp.sql"
$filepath = Join-Path $PSScriptRoot $filename

$sqlScript | Out-File -FilePath $filepath -Encoding UTF8

Write-Host "✅ SQL script generated: $filename" -ForegroundColor Green
Write-Host "📁 File location: $filepath" -ForegroundColor Yellow

if ($Preview) {
    Write-Host "`n🔍 PREVIEW MODE - Run this query first to see what will be deleted:" -ForegroundColor Cyan
    Write-Host "Copy and paste this into your Supabase SQL Editor:" -ForegroundColor White
    
    # Extract just the preview query
    $previewQuery = $sqlScript -split "EXECUTE CLEANUP" | Select-Object -First 1
    Write-Host "`n" + $previewQuery -ForegroundColor Gray
}

Write-Host "`n⚠️  IMPORTANT SAFETY NOTES:" -ForegroundColor Red
Write-Host "1. Always run the PREVIEW query first" -ForegroundColor White
Write-Host "2. Create backups before deletion" -ForegroundColor White
Write-Host "3. Test on development database first" -ForegroundColor White
Write-Host "4. Verify the email address is correct" -ForegroundColor White
Write-Host "5. This action is PERMANENT and cannot be undone" -ForegroundColor White

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open the generated SQL file" -ForegroundColor White
Write-Host "2. Copy the PREVIEW query and run it in Supabase" -ForegroundColor White
Write-Host "3. Review the results carefully" -ForegroundColor White
Write-Host "4. If satisfied, uncomment the DELETE statements" -ForegroundColor White
Write-Host "5. Run the cleanup script" -ForegroundColor White
Write-Host "6. Run the verification query" -ForegroundColor White













