# User Cleanup Script Generator - Two-File Version
# This script generates separate preview and delete SQL files for a specific email address

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

Write-Host "🔍 Generating cleanup scripts for: $Email" -ForegroundColor Cyan

# Generate the PREVIEW SQL script
$previewScript = @"
-- User Cleanup Preview Script
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

-- ==============================================
-- VERIFICATION: Check if user exists
-- ==============================================
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.user_profiles WHERE email = '$Email') 
        THEN 'User profile EXISTS'
        ELSE 'User profile NOT FOUND'
    END as user_profile_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = '$Email') 
        THEN 'Auth user EXISTS'
        ELSE 'Auth user NOT FOUND'
    END as auth_user_status;
"@

# Generate the DELETE SQL script
$deleteScript = @"
-- User Cleanup DELETE Script
-- ⚠️  WARNING: This will permanently delete all data for the user!
-- Usage: Email is already configured below

-- ==============================================
-- CONFIGURATION - EMAIL ALREADY SET
-- ==============================================
-- Target email: $Email
-- ⚠️  DOUBLE-CHECK THIS EMAIL BEFORE RUNNING!

-- ==============================================
-- STEP 1: Create backup (RECOMMENDED)
-- ==============================================
-- Uncomment the line below to create a backup before deletion
-- CREATE TABLE backup_user_cleanup_$(date +%Y%m%d_%H%M%S) AS 
-- SELECT *, NOW() as backup_created_at
-- FROM public.user_profiles 
-- WHERE email = '$Email';

-- ==============================================
-- STEP 2: Delete related data
-- ==============================================

-- Delete buddy relationships
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.buddies 
WHERE user_id IN (SELECT user_id FROM target_user) 
   OR buddy_user_id IN (SELECT user_id FROM target_user);

-- Delete buddy messages
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.buddy_messages 
WHERE sender_id IN (SELECT user_id FROM target_user);

-- Delete whispr notes
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.whispr_notes 
WHERE sender_id IN (SELECT user_id FROM target_user);

-- Delete blocking relationships
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.blocked_users 
WHERE blocker_id IN (SELECT user_id FROM target_user) 
   OR blocked_user_id IN (SELECT user_id FROM target_user);

-- Delete FCM tokens
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.user_fcm_tokens 
WHERE user_id IN (SELECT user_id FROM target_user);

-- Delete user preferences
WITH target_user AS (
    SELECT COALESCE(up.id, au.id) as user_id
    FROM public.user_profiles up
    FULL OUTER JOIN auth.users au ON up.id = au.id
    WHERE up.email = '$Email' OR au.email = '$Email'
)
DELETE FROM public.user_preferences 
WHERE user_id IN (SELECT user_id FROM target_user);

-- ==============================================
-- STEP 3: Delete user profile
-- ==============================================
DELETE FROM public.user_profiles 
WHERE email = '$Email';

-- ==============================================
-- STEP 4: Delete auth user
-- ==============================================
DELETE FROM auth.users 
WHERE email = '$Email';

-- ==============================================
-- VERIFICATION: Check if deletion was successful
-- ==============================================
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.user_profiles WHERE email = '$Email') 
        THEN 'User profile STILL EXISTS - DELETION FAILED'
        ELSE 'User profile DELETED SUCCESSFULLY'
    END as user_profile_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = '$Email') 
        THEN 'Auth user STILL EXISTS - DELETION FAILED'
        ELSE 'Auth user DELETED SUCCESSFULLY'
    END as auth_user_status;
"@

# Save the scripts to files
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$emailSafe = $Email.Replace('@', '_').Replace('.', '_')
$previewFilename = "cleanup-user-preview-$emailSafe-$timestamp.sql"
$deleteFilename = "cleanup-user-delete-$emailSafe-$timestamp.sql"

$previewScript | Out-File -FilePath $previewFilename -Encoding UTF8
$deleteScript | Out-File -FilePath $deleteFilename -Encoding UTF8

Write-Host "✅ Generated cleanup scripts:" -ForegroundColor Green
Write-Host "   📋 Preview: $previewFilename" -ForegroundColor Yellow
Write-Host "   🗑️  Delete: $deleteFilename" -ForegroundColor Red

Write-Host "`n📋 Preview Script ($previewFilename):" -ForegroundColor Yellow
Write-Host "   • Shows exactly what will be deleted" -ForegroundColor White
Write-Host "   • Safe to run - no data is modified" -ForegroundColor White
Write-Host "   • Always run this first!" -ForegroundColor White

Write-Host "`n🗑️  Delete Script ($deleteFilename):" -ForegroundColor Red
Write-Host "   • Actually deletes all user data" -ForegroundColor White
Write-Host "   • Includes backup creation (commented)" -ForegroundColor White
Write-Host "   • Includes verification queries" -ForegroundColor White

Write-Host "`n🚨 IMPORTANT SAFETY STEPS:" -ForegroundColor Red
Write-Host "1. Run the PREVIEW script first" -ForegroundColor White
Write-Host "2. Review the results carefully" -ForegroundColor White
Write-Host "3. Create a backup before running DELETE script" -ForegroundColor White
Write-Host "4. Test on non-production environment first" -ForegroundColor White
Write-Host "5. Only run DELETE script if you're absolutely sure" -ForegroundColor White

Write-Host "`n📖 Usage:" -ForegroundColor Cyan
Write-Host "1. Open $previewFilename in your database client" -ForegroundColor White
Write-Host "2. Run the preview query and review results" -ForegroundColor White
Write-Host "3. If satisfied, open $deleteFilename" -ForegroundColor White
Write-Host "4. Uncomment backup creation if desired" -ForegroundColor White
Write-Host "5. Run the delete script" -ForegroundColor White

if ($Execute) {
    Write-Host "`n⚠️  Execute flag detected - but this script only generates SQL files for safety" -ForegroundColor Yellow
    Write-Host "   You must manually review and run the generated SQL files" -ForegroundColor Yellow
}













