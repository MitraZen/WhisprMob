# User Cleanup Script Generator - Universal Version
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
-- Simple User Cleanup Script by Email
-- Usage: Email is already configured below

-- ==============================================
-- CONFIGURATION - EMAIL ALREADY SET
-- ==============================================
-- Target email: $Email
WITH target_user AS (
    SELECT 
        COALESCE(up.id, au.id) as user_id,
        COALESCE(up.email, au.email) as email,
        up.username,
        up.display_name
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)

-- ==============================================
-- PREVIEW: What will be deleted
-- ==============================================
SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'User details' as data_type,
    1 as count
FROM target_user tu

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'Buddy relationships' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.buddies b ON b.user_id = tu.user_id OR b.buddy_user_id = tu.user_id
GROUP BY tu.email, tu.username, tu.display_name

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'Messages sent' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.buddy_messages bm ON bm.sender_id = tu.user_id
GROUP BY tu.email, tu.username, tu.display_name

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'Notes created' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.whispr_notes wn ON wn.sender_id = tu.user_id
GROUP BY tu.email, tu.username, tu.display_name

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'Blocking relationships' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.blocked_users bu ON bu.blocker_id = tu.user_id OR bu.blocked_user_id = tu.user_id
GROUP BY tu.email, tu.username, tu.display_name

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'FCM tokens' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.user_fcm_tokens uft ON uft.user_id = tu.user_id
GROUP BY tu.email, tu.username, tu.display_name

UNION ALL

SELECT 
    'PREVIEW_DELETION' as action,
    tu.email,
    tu.username,
    tu.display_name,
    'User preferences' as data_type,
    COUNT(*) as count
FROM target_user tu
LEFT JOIN public.user_preferences upref ON upref.user_id = tu.user_id
GROUP BY tu.email, tu.username, tu.display_name;

/*
==============================================
EXECUTE CLEANUP (Uncomment to run)
==============================================

Step 1: Create backup (recommended)
CREATE TABLE backup_user_cleanup_$(date +%Y%m%d_%H%M%S) AS 
SELECT *, NOW() as backup_created_at
FROM public.user_profiles 
WHERE email = '$Email';

Step 2: Delete related data
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.buddies 
WHERE user_id IN (SELECT user_id FROM target_user) 
   OR buddy_user_id IN (SELECT user_id FROM target_user);

WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.buddy_messages 
WHERE sender_id IN (SELECT user_id FROM target_user);

WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.whispr_notes 
WHERE sender_id IN (SELECT user_id FROM target_user);

WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.blocked_users 
WHERE blocker_id IN (SELECT user_id FROM target_user) 
   OR blocked_user_id IN (SELECT user_id FROM target_user);

WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.user_fcm_tokens 
WHERE user_id IN (SELECT user_id FROM target_user);

WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.user_preferences 
WHERE user_id IN (SELECT user_id FROM target_user);

Step 3: Delete user profile
DELETE FROM public.user_profiles 
WHERE email = '$Email';

Step 4: Delete auth user
DELETE FROM auth.users 
WHERE email = '$Email';

==============================================
VERIFICATION (Run after cleanup)
==============================================
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.user_profiles WHERE email = '$Email') 
        THEN 'User profile still exists'
        ELSE 'User profile deleted successfully'
    END as user_profile_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = '$Email') 
        THEN 'Auth user still exists'
        ELSE 'Auth user deleted successfully'
    END as auth_user_status;
*/
"@

# Save the script to a file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "cleanup-user-$($Email.Replace('@', '_').Replace('.', '_'))-$timestamp.sql"

$sqlScript | Out-File -FilePath $filename -Encoding UTF8

Write-Host "✅ Generated cleanup script: $filename" -ForegroundColor Green
Write-Host "📋 Script includes:" -ForegroundColor Yellow
Write-Host "   • Preview of what will be deleted" -ForegroundColor White
Write-Host "   • All DELETE statements (commented out)" -ForegroundColor White
Write-Host "   • Backup recommendations" -ForegroundColor White
Write-Host "   • Verification queries" -ForegroundColor White

Write-Host "`n🚨 IMPORTANT SAFETY STEPS:" -ForegroundColor Red
Write-Host "1. Review the preview results first" -ForegroundColor White
Write-Host "2. Create a backup before running DELETE statements" -ForegroundColor White
Write-Host "3. Uncomment DELETE statements only after confirming the preview" -ForegroundColor White
Write-Host "4. Test on a non-production environment first" -ForegroundColor White

Write-Host "`n📖 Usage:" -ForegroundColor Cyan
Write-Host "1. Open $filename in your database client" -ForegroundColor White
Write-Host "2. Run the preview query first" -ForegroundColor White
Write-Host "3. Review the results" -ForegroundColor White
Write-Host "4. Uncomment DELETE statements if you want to proceed" -ForegroundColor White
Write-Host "5. Run the cleanup" -ForegroundColor White

if ($Execute) {
    Write-Host "`n⚠️  Execute flag detected - but this script only generates SQL files for safety" -ForegroundColor Yellow
    Write-Host "   You must manually review and run the generated SQL file" -ForegroundColor Yellow
}
