# Live Supabase Database Backup Instructions

## Overview
This backup contains scripts to extract all functions, triggers, and schema from your **live Supabase database**.

## What's Included

### ðŸ“ Files in this Backup

1. **extract_live_database.ps1** - PowerShell script to extract live database
2. **comprehensive_extraction.sql** - SQL script for manual extraction
3. **extraction_queries/** - Individual SQL queries for each object type
4. **README.md** - This instruction file

## How to Use

### Method 1: PowerShell Script (Recommended)

1. **Install PostgreSQL Client Tools**
   - Download from: https://www.postgresql.org/download/
   - Make sure psql command is available in your PATH

2. **Get Your Database Connection Details**
   - **Option A**: Direct database URL
     `
     postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
     `
   - **Option B**: Supabase project details
     - Supabase URL: https://[project-id].supabase.co
     - Database password (from Supabase dashboard)

3. **Run the Extraction Script**
   `powershell
   # Option A: With direct database URL
   .\extract_live_database.ps1 -DatabaseUrl "postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres"
   
   # Option B: With Supabase details
   .\extract_live_database.ps1 -SupabaseUrl "https://your-project.supabase.co" -DatabasePassword "your-password"
   `

4. **Check Results**
   - The script will create a folder with timestamp
   - Contains CSV files with all extracted data

### Method 2: Manual SQL Execution

1. **Connect to your Supabase database** using any PostgreSQL client
2. **Run the queries** from extraction_queries/ folder
3. **Save results** manually

### Method 3: Supabase SQL Editor

1. **Open Supabase Dashboard** â†’ SQL Editor
2. **Copy and paste** queries from comprehensive_extraction.sql
3. **Execute** and download results

## Extracted Data

### ðŸ“Š Functions
- Function names and definitions
- Parameters and return types
- Complete source code
- Descriptions and metadata

### ðŸ”— Triggers
- Trigger names and events
- Target tables
- Complete trigger definitions
- Execution timing and conditions

### ðŸ“‹ Tables
- Table structures
- Column definitions
- Data types and constraints
- Primary keys and relationships

### ðŸ”’ Security
- Row Level Security policies
- Access controls
- User permissions

### ðŸ“ˆ Performance
- Indexes and their definitions
- Performance optimization objects

## Important Notes

- âš ï¸ **This extracts from your LIVE database** - be careful with production data
- ðŸ” **Keep connection details secure** - don't commit passwords to version control
- ðŸ“ **Test extraction first** - verify the script works before running on production
- ðŸ’¾ **Backup before changes** - always backup before making database modifications

## Troubleshooting

### Common Issues

1. **"psql not found"**
   - Install PostgreSQL client tools
   - Add to system PATH

2. **Connection refused**
   - Check database URL format
   - Verify password is correct
   - Ensure network access to Supabase

3. **Permission denied**
   - Check database user permissions
   - Verify RLS policies allow access

4. **Empty results**
   - Check if objects exist in 'public' schema
   - Verify connection to correct database

### Getting Help

- Check Supabase documentation: https://supabase.com/docs
- PostgreSQL documentation: https://www.postgresql.org/docs/
- Contact support if issues persist

---
*Generated on: 2025-10-19 03:17:26*
*Backup Type: Live Database Extraction*
