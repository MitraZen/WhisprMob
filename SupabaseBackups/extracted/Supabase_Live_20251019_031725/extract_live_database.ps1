# PowerShell script to extract live Supabase database objects
# Run this script to connect to your database and extract all objects

param(
    [string]$DatabaseUrl = "",
    [string]$SupabaseUrl = "",
    [string]$DatabasePassword = ""
)

Write-Host "Starting Live Database Extraction..." -ForegroundColor Green

# Check if psql is available
try {
    $psqlVersion = psql --version
    Write-Host "PostgreSQL client found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL client (psql) not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

# Determine connection string
if (-not [string]::IsNullOrEmpty($DatabaseUrl)) {
    $connectionString = $DatabaseUrl
} elseif (-not [string]::IsNullOrEmpty($SupabaseUrl)) {
    $projectId = $SupabaseUrl -replace "https://", "" -replace ".supabase.co", ""
    $connectionString = "postgresql://postgres:$DatabasePassword@db.$projectId.supabase.co:5432/postgres"
} else {
    Write-Host "Please provide either DatabaseUrl or SupabaseUrl with DatabasePassword" -ForegroundColor Red
    exit 1
}

Write-Host "Connecting to database..." -ForegroundColor Yellow

# Create output directory
$outputDir = "extracted_data_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

try {
    # Extract functions
    Write-Host "Extracting functions..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_result(p.oid) as return_type,
            pg_get_function_arguments(p.oid) as arguments,
            CASE 
                WHEN p.prokind = 'f' THEN 'function'
                WHEN p.prokind = 'p' THEN 'procedure'
                WHEN p.prokind = 'a' THEN 'aggregate'
                WHEN p.prokind = 'w' THEN 'window'
                ELSE 'other'
            END as function_type,
            pg_get_functiondef(p.oid) as function_definition,
            obj_description(p.oid, 'pg_proc') as description
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
            AND p.prokind IN ('f', 'p')
        ORDER BY p.proname
    ) TO '$outputDir/functions_backup.csv' WITH CSV HEADER;
    "

    # Extract triggers
    Write-Host "Extracting triggers..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            t.trigger_name,
            t.event_manipulation,
            t.event_object_table,
            t.action_timing,
            t.action_orientation,
            t.action_statement,
            pg_get_triggerdef(t.oid) as trigger_definition
        FROM information_schema.triggers t
        JOIN pg_trigger pt ON t.trigger_name = pt.tgname
        WHERE t.trigger_schema = 'public'
        ORDER BY t.event_object_table, t.trigger_name
    ) TO '$outputDir/triggers_backup.csv' WITH CSV HEADER;
    "

    # Extract tables
    Write-Host "Extracting table structures..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END as is_primary_key
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        LEFT JOIN (
            SELECT ku.table_name, ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
        WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
    ) TO '$outputDir/tables_backup.csv' WITH CSV HEADER;
    "

    # Extract indexes
    Write-Host "Extracting indexes..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    ) TO '$outputDir/indexes_backup.csv' WITH CSV HEADER;
    "

    # Extract policies
    Write-Host "Extracting RLS policies..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    ) TO '$outputDir/policies_backup.csv' WITH CSV HEADER;
    "

    # Extract views
    Write-Host "Extracting views..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            table_name,
            view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
    ) TO '$outputDir/views_backup.csv' WITH CSV HEADER;
    "

    # Extract sequences
    Write-Host "Extracting sequences..." -ForegroundColor Yellow
    psql $connectionString -c "
    \copy (
        SELECT 
            sequence_name,
            data_type,
            start_value,
            minimum_value,
            maximum_value,
            increment,
            cycle_option
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        ORDER BY sequence_name
    ) TO '$outputDir/sequences_backup.csv' WITH CSV HEADER;
    "

    Write-Host "Extraction completed successfully!" -ForegroundColor Green
    Write-Host "Data saved to: $outputDir" -ForegroundColor Cyan

} catch {
    Write-Host "Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "
Extracted Files:" -ForegroundColor Yellow
Write-Host "  â€¢ functions_backup.csv - All custom functions" -ForegroundColor White
Write-Host "  â€¢ triggers_backup.csv - All triggers" -ForegroundColor White
Write-Host "  â€¢ tables_backup.csv - Table structures" -ForegroundColor White
Write-Host "  â€¢ indexes_backup.csv - All indexes" -ForegroundColor White
Write-Host "  â€¢ policies_backup.csv - RLS policies" -ForegroundColor White
Write-Host "  â€¢ views_backup.csv - All views" -ForegroundColor White
Write-Host "  â€¢ sequences_backup.csv - All sequences" -ForegroundColor White
