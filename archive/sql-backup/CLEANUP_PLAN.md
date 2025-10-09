# SQL Files Cleanup Plan

## Files to KEEP (Essential - 8 files)
- `whispr-buddy-schema.sql` - Main database schema
- `database-schema.sql` - Basic schema (referenced in docs)
- `update-auth-functions.sql` - Function updates
- `test-database-functions.sql` - Testing utilities
- `database-indexes.sql` - Performance indexes
- `user_deletion_setup.sql` - User deletion functionality
- `database-egress-analysis.sql` - Performance analysis
- `database-cleanup-unused-tables.sql` - Cleanup utilities

## Files to ARCHIVE (Migration/Setup - 15 files)
- `complete-profile-schema.sql`
- `add-profile-columns.sql`
- `fix-existing-policies.sql`
- `check-rls-status.sql`
- `verify-profile-schema.sql`
- `prevent-duplicate-notes.sql`
- `cleanup-and-prevent-duplicates.sql`
- `simple-prevent-duplicates.sql`
- `cleanup-duplicate-notes.sql`
- `cleanup-duplicate-user-profiles.sql`
- `fix-buddy-creation.sql`
- `fix-listen-note-function.sql`
- `check-notes-status.sql`
- `check-complete-setup.sql`
- `check-new-project-schema.sql`

## Files to DELETE (Debug/Cleanup - 66+ files)
All debug, test, and temporary cleanup files including:
- All files with "debug-", "test-", "cleanup-", "check-" prefixes
- All testuser20 related files
- All comprehensive-debug files
- All nuclear-cleanup files
- All orphaned user cleanup files
- Duplicate files in sql-scripts/ folder

## Backup Location
All files moved to: `archive/sql-backup/` before deletion

